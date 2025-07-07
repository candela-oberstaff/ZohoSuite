package main

import (
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// getCustomers obtiene clientes de Zoho Billing con paginación y búsqueda
func getCustomers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	search := c.Query("search")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 200 {
		limit = 20
	}

	params := map[string]string{
		"page":     strconv.Itoa(page),
		"per_page": strconv.Itoa(limit),
	}

	if search != "" {
		params["search_text"] = search
	}

	response, err := fetchZohoBillingData("customers", params)
	if err != nil {
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	var customersResp CustomersResponse
	err = json.Unmarshal(response, &customersResp)
	if err != nil {
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al procesar respuesta de Zoho Billing: " + err.Error(),
		})
		return
	}

	// Calcular el total de clientes
	total := len(customersResp.Customers)
	if page > 1 {
		// Si estamos en una página posterior a la primera, sumamos los clientes de las páginas anteriores
		total += (page - 1) * limit
	}

	// Si hay más páginas, añadimos un valor adicional para indicar que hay más
	if customersResp.HasMorePage {
		// Estimamos que hay al menos una página más completa
		total += limit
	}

	// Imprimir información de depuración
	fmt.Printf("Clientes: %d, Página: %d, Por página: %d, Hay más páginas: %v, Total calculado: %d\n",
		len(customersResp.Customers), customersResp.Page, customersResp.PerPage, customersResp.HasMorePage, total)

	c.JSON(200, ApiResponse{
		Success: true,
		Data:    customersResp.Customers,
		Meta: map[string]interface{}{
			"page":          customersResp.Page,
			"per_page":      customersResp.PerPage,
			"has_more_page": customersResp.HasMorePage,
			"total":         total, // Añadir el total de clientes
		},
	})
}

// getCustomerByID obtiene un cliente específico por su ID
func getCustomerByID(c *gin.Context) {
	customerID := c.Param("id")
	if customerID == "" {
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "ID de cliente no proporcionado",
		})
		return
	}

	// Verificar si se solicita el detalle completo
	detail := c.Query("detail") == "true"

	// Obtener información básica del cliente
	response, err := fetchZohoBillingData(fmt.Sprintf("customers/%s", customerID), nil)
	if err != nil {
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	var customerResp CustomerResponse
	err = json.Unmarshal(response, &customerResp)
	if err != nil {
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al procesar respuesta de Zoho Billing: " + err.Error(),
		})
		return
	}

	// Si no se solicita el detalle completo, devolver solo la información básica del cliente
	if !detail {
		c.JSON(200, ApiResponse{
			Success: true,
			Data:    customerResp.Customer,
		})
		return
	}

	// Si se solicita el detalle completo, obtener también las suscripciones y transacciones
	var customerDetail CustomerDetailResponse
	customerDetail.Customer = customerResp.Customer

	// Obtener suscripciones del cliente
	subsParams := map[string]string{
		"customer_id": customerID,
	}
	subsResponse, err := fetchZohoBillingData("subscriptions", subsParams)
	if err != nil {
		log.Printf("Error al obtener suscripciones para el cliente %s: %v", customerID, err)
		// Inicializar un array vacío para evitar que sea nil
		customerDetail.Subscriptions = []Subscription{}
		// Continuamos aunque haya error, para devolver al menos la información del cliente
	} else {
		var subsResp SubscriptionResponse
		if err := json.Unmarshal(subsResponse, &subsResp); err != nil {
			log.Printf("Error al decodificar respuesta de suscripciones: %v", err)
			// Inicializar un array vacío para evitar que sea nil
			customerDetail.Subscriptions = []Subscription{}
		} else {
			// Siempre asignar las suscripciones, incluso si el código no es 0 o el array está vacío
			if subsResp.Code == 0 {
				customerDetail.Subscriptions = subsResp.Subscriptions
			} else {
				// Si hay un error en la respuesta, inicializar un array vacío
				customerDetail.Subscriptions = []Subscription{}
				log.Printf("Error en API Zoho Billing al obtener suscripciones: Código %d, Mensaje: %s",
					subsResp.Code, subsResp.Message)
			}
		}
	}

	// Obtener transacciones del cliente
	transParams := map[string]string{
		"customer_id": customerID,
	}
	transResponse, err := fetchZohoBillingData("transactions", transParams)
	if err != nil {
		log.Printf("Error al obtener transacciones para el cliente %s: %v", customerID, err)
		// Inicializar un array vacío para evitar que sea nil
		customerDetail.Transactions = []Transaction{}
		// Continuamos aunque haya error, para devolver al menos la información del cliente y suscripciones
	} else {
		var transResp TransactionResponse
		if err := json.Unmarshal(transResponse, &transResp); err != nil {
			log.Printf("Error al decodificar respuesta de transacciones: %v", err)
			// Inicializar un array vacío para evitar que sea nil
			customerDetail.Transactions = []Transaction{}
		} else {
			// Siempre asignar las transacciones, incluso si el código no es 0 o el array está vacío
			if transResp.Code == 0 {
				customerDetail.Transactions = transResp.Transactions
			} else {
				// Si hay un error en la respuesta, inicializar un array vacío
				customerDetail.Transactions = []Transaction{}
				log.Printf("Error en API Zoho Billing al obtener transacciones: Código %d, Mensaje: %s",
					transResp.Code, transResp.Message)
			}
		}
	}

	// Devolver el detalle completo del cliente
	c.JSON(200, ApiResponse{
		Success: true,
		Data:    customerDetail,
	})
}

// createCustomer crea un nuevo cliente en Zoho Billing
func createCustomer(c *gin.Context) {
	var customerCreate CustomerCreate

	if err := c.ShouldBindJSON(&customerCreate); err != nil {
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "Error en los datos proporcionados: " + err.Error(),
		})
		return
	}

	// Validar campos requeridos
	if customerCreate.DisplayName == "" {
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "El campo display_name es obligatorio",
		})
		return
	}

	// Crear el cliente en Zoho Billing
	response, err := createZohoBillingData("customers", customerCreate)
	if err != nil {
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	var customerResp CustomerResponse
	err = json.Unmarshal(response, &customerResp)
	if err != nil {
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al procesar respuesta de Zoho Billing: " + err.Error(),
		})
		return
	}

	c.JSON(201, ApiResponse{
		Success: true,
		Data:    customerResp.Customer,
		Message: "Cliente creado exitosamente",
	})
}

// updateCustomer actualiza un cliente existente en Zoho Billing
func updateCustomer(c *gin.Context) {
	customerID := c.Param("id")
	if customerID == "" {
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "ID de cliente no proporcionado",
		})
		return
	}

	var customerUpdate CustomerCreate

	if err := c.ShouldBindJSON(&customerUpdate); err != nil {
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "Error en los datos proporcionados: " + err.Error(),
		})
		return
	}

	// Validar campos requeridos
	if customerUpdate.DisplayName == "" {
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "El campo display_name es obligatorio",
		})
		return
	}

	// Actualizar el cliente en Zoho Billing
	response, err := updateZohoBillingData(fmt.Sprintf("customers/%s", customerID), customerUpdate)
	if err != nil {
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	var customerResp CustomerResponse
	err = json.Unmarshal(response, &customerResp)
	if err != nil {
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al procesar respuesta de Zoho Billing: " + err.Error(),
		})
		return
	}

	c.JSON(200, ApiResponse{
		Success: true,
		Data:    customerResp.Customer,
		Message: "Cliente actualizado exitosamente",
	})
}

// getCustomerTransactions obtiene las transacciones asociadas a un cliente específico

// getActiveCustomersCount obtiene el número de clientes con al menos una suscripción activa
func getActiveCustomersCount(c *gin.Context) {
	log.Printf("Obteniendo clientes activos con suscripciones")

	// Verificar si se solicita una actualización forzada de la caché
	forceRefresh := c.Query("force_refresh") == "true"

	// Variable para almacenar los datos
	var data interface{}
	var err error
	var directFromZoho bool = false

	if forceRefresh {
		log.Printf("Forzando sincronización con Zoho Billing para clientes activos")
		// Obtener datos frescos directamente de Zoho Billing
		data, err = fetchActiveCustomersCount()
		directFromZoho = true

		// Actualizar la caché con los datos frescos si no hubo error
		if err == nil {
			activeCustomersCache.mutex.Lock()
			activeCustomersCache.data = data
			activeCustomersCache.expiresAt = time.Now().Add(1 * time.Hour)
			activeCustomersCache.refreshTrigger = time.Now().Add(10 * time.Minute)
			activeCustomersCache.mutex.Unlock()
		}
	} else {
		// Obtener datos de la caché
		data, err = activeCustomersCache.Get()
	}

	if err != nil {
		log.Printf("Error al obtener datos de clientes activos: %v", err)
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al obtener datos de clientes activos: " + err.Error(),
		})
		return
	}

	// Convertir los datos al formato esperado
	dataMap, ok := data.(map[string]interface{})
	if !ok {
		log.Printf("Error: formato de datos inesperado")
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error interno: formato de datos inesperado",
		})
		return
	}

	// Extraer los contadores
	activeCustomersCount, _ := dataMap["active_customers_count"].(int)
	totalCustomers, _ := dataMap["total_customers"].(int)
	totalActiveSubscriptions, _ := dataMap["total_active_subscriptions"].(int)

	log.Printf("Datos obtenidos: %d clientes activos de %d totales (directo de Zoho: %v)",
		activeCustomersCount, totalCustomers, directFromZoho)

	// Devolver el resultado
	c.JSON(200, ApiResponse{
		Success: true,
		Data: map[string]interface{}{
			"active_customers_count":     activeCustomersCount,
			"total_customers":            totalCustomers,
			"total_active_subscriptions": totalActiveSubscriptions,
			"cached":                     !directFromZoho,
			"refreshed":                  forceRefresh,
			"synced_with_zoho":           directFromZoho,
		},
	})
}

// refreshActiveCustomersCache fuerza la actualización de la caché de clientes activos
func refreshActiveCustomersCache(c *gin.Context) {
	log.Printf("Forzando sincronización completa con Zoho Billing para clientes activos")

	// Invalidar la caché actual completamente
	activeCustomersCache.Invalidate()

	// Obtener datos frescos directamente de Zoho Billing
	// Llamamos directamente a la función fetchActiveCustomersCount para evitar cualquier caché
	freshData, err := fetchActiveCustomersCount()
	if err != nil {
		log.Printf("Error al sincronizar con Zoho Billing: %v", err)
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al sincronizar con Zoho Billing: " + err.Error(),
		})
		return
	}

	// Extraer los datos del mapa
	dataMap, ok := freshData.(map[string]interface{})
	if !ok {
		log.Printf("Error: los datos no tienen el formato esperado")
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error interno: formato de datos incorrecto",
		})
		return
	}

	// Obtener los contadores
	activeCount, _ := dataMap["active_customers_count"].(int)
	totalCount, _ := dataMap["total_customers"].(int)
	totalActiveSubscriptions, _ := dataMap["total_active_subscriptions"].(int)

	// Actualizar la caché con los datos frescos
	activeCustomersCache.mutex.Lock()
	activeCustomersCache.data = freshData
	activeCustomersCache.expiresAt = time.Now().Add(2 * time.Minute)      // Expiración principal (reducida de 1 hora a 2 minutos)
	activeCustomersCache.refreshTrigger = time.Now().Add(1 * time.Minute) // Trigger para actualización en segundo plano (reducido de 10 minutos a 1 minuto)
	activeCustomersCache.mutex.Unlock()

	log.Printf("Caché actualizada con datos frescos: %d clientes activos de %d totales, %d suscripciones activas",
		activeCount, totalCount, totalActiveSubscriptions)

	// Devolver los datos actualizados
	c.JSON(200, ApiResponse{
		Success: true,
		Data: map[string]interface{}{
			"active_customers_count":     activeCount,
			"total_customers":            totalCount,
			"total_active_subscriptions": totalActiveSubscriptions,
			"refreshed":                  true,
			"synced_with_zoho":           true,
		},
		Message: "Datos sincronizados correctamente con Zoho Billing",
	})
}

// getCustomerSubscriptions obtiene las suscripciones asociadas a un cliente específico
func getCustomerSubscriptions(c *gin.Context) {
	// Obtener el ID del cliente de los parámetros de consulta
	customerID := c.Query("customer_id")
	if customerID == "" {
		// En lugar de devolver un error 400, devolvemos un array vacío
		// para que la interfaz pueda manejar el caso sin errores
		c.JSON(200, ApiResponse{
			Success: true,
			Data:    []Subscription{},
			Message: "No se proporcionó ID de cliente, devolviendo lista vacía",
		})
		return
	}

	// Configurar parámetros para la solicitud a Zoho Billing
	params := map[string]string{
		"customer_id": customerID,
	}

	// Registrar los parámetros de la solicitud para depuración
	log.Printf("Solicitando suscripciones para cliente %s con parámetros: %v", customerID, params)

	// Realizar la solicitud a la API de Zoho Billing
	response, err := fetchZohoBillingData("subscriptions", params)
	if err != nil {
		log.Printf("Error al obtener suscripciones: %v", err)
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al obtener suscripciones: " + err.Error(),
		})
		return
	}

	// Registrar la respuesta para depuración
	log.Printf("Respuesta de API para suscripciones: %s", string(response))

	// Decodificar la respuesta
	var subscriptionResponse SubscriptionResponse
	if err := json.Unmarshal(response, &subscriptionResponse); err != nil {
		log.Printf("Error al decodificar respuesta JSON: %v. Respuesta: %s", err, string(response))
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al procesar la respuesta: " + err.Error(),
		})
		return
	}

	// Verificar si la respuesta es exitosa
	if subscriptionResponse.Code != 0 {
		log.Printf("Error en API Zoho Billing: Código %d, Mensaje: %s",
			subscriptionResponse.Code, subscriptionResponse.Message)
		// Devolvemos un array vacío en lugar de un error 400
		c.JSON(200, ApiResponse{
			Success: true,
			Data:    []Subscription{},
			Message: "Error en la API de Zoho Billing: " + subscriptionResponse.Message,
		})
		return
	}

	// Verificar si hay suscripciones
	if len(subscriptionResponse.Subscriptions) == 0 {
		log.Printf("No se encontraron suscripciones para el cliente %s", customerID)
	}

	// Devolver las suscripciones
	c.JSON(200, ApiResponse{
		Success: true,
		Data:    subscriptionResponse.Subscriptions,
	})
}

// getSubscriptionByID obtiene el detalle de una suscripción específica por su ID
func getSubscriptionByID(c *gin.Context) {
	// Obtener el ID de la suscripción de los parámetros de ruta
	subscriptionID := c.Param("id")
	if subscriptionID == "" {
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "ID de suscripción no proporcionado",
		})
		return
	}

	// Registrar la solicitud para depuración
	log.Printf("Solicitando detalle de suscripción con ID: %s", subscriptionID)

	// Realizar la solicitud a la API de Zoho Billing
	response, err := fetchZohoBillingData(fmt.Sprintf("subscriptions/%s", subscriptionID), nil)
	if err != nil {
		log.Printf("Error al obtener detalle de suscripción: %v", err)
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al obtener detalle de suscripción: " + err.Error(),
		})
		return
	}

	// Registrar la respuesta para depuración
	log.Printf("Respuesta de API para detalle de suscripción: %s", string(response))

	// Decodificar la respuesta
	var subscriptionDetailResponse SubscriptionDetailResponse
	if err := json.Unmarshal(response, &subscriptionDetailResponse); err != nil {
		log.Printf("Error al decodificar respuesta JSON: %v. Respuesta: %s", err, string(response))
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al procesar la respuesta: " + err.Error(),
		})
		return
	}

	// Verificar si la respuesta es exitosa
	if subscriptionDetailResponse.Code != 0 {
		log.Printf("Error en API Zoho Billing: Código %d, Mensaje: %s",
			subscriptionDetailResponse.Code, subscriptionDetailResponse.Message)
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "Error en la API de Zoho Billing: " + subscriptionDetailResponse.Message,
		})
		return
	}

	// Devolver el detalle de la suscripción
	c.JSON(200, ApiResponse{
		Success: true,
		Data:    subscriptionDetailResponse.Subscription,
	})
}
func getCustomerTransactions(c *gin.Context) {
	// Obtener el ID del cliente de los parámetros de consulta
	customerID := c.Query("customer_id")
	if customerID == "" {
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "ID de cliente no proporcionado",
		})
		return
	}

	// Obtener el tipo de transacción si se proporciona (opcional)
	filterBy := c.Query("filter_by")

	// Configurar parámetros para la solicitud a Zoho Billing
	params := map[string]string{
		"customer_id": customerID,
	}

	// Agregar filtro por tipo si se proporciona
	if filterBy != "" {
		params["filter_by"] = filterBy
	}

	// Registrar los parámetros de la solicitud para depuración
	log.Printf("Solicitando transacciones para cliente %s con parámetros: %v", customerID, params)

	// Realizar la solicitud a la API de Zoho Billing
	response, err := fetchZohoBillingData("transactions", params)
	if err != nil {
		log.Printf("Error al obtener transacciones: %v", err)
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al obtener transacciones: " + err.Error(),
		})
		return
	}

	// Registrar la respuesta para depuración
	log.Printf("Respuesta de API para transacciones: %s", string(response))

	// Decodificar la respuesta
	var transactionResponse TransactionResponse
	if err := json.Unmarshal(response, &transactionResponse); err != nil {
		log.Printf("Error al decodificar respuesta JSON: %v. Respuesta: %s", err, string(response))
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al procesar la respuesta: " + err.Error(),
		})
		return
	}

	// Verificar si la respuesta es exitosa
	if transactionResponse.Code != 0 {
		log.Printf("Error en API Zoho Billing: Código %d, Mensaje: %s",
			transactionResponse.Code, transactionResponse.Message)
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "Error en la API de Zoho Billing: " + transactionResponse.Message,
		})
		return
	}

	// Verificar si hay transacciones
	if len(transactionResponse.Transactions) == 0 {
		log.Printf("No se encontraron transacciones para el cliente %s", customerID)
	}

	// Devolver las transacciones
	c.JSON(200, ApiResponse{
		Success: true,
		Data:    transactionResponse.Transactions,
	})
}

// getCustomersCount obtiene el total real de clientes de Zoho Billing
func getCustomersCount(c *gin.Context) {
	// Configurar parámetros para obtener solo la primera página con un cliente por página
	// Esto nos permitirá obtener el total real de clientes sin tener que cargar todos los datos
	params := map[string]string{
		"page":     "1",
		"per_page": "1", // Solicitamos solo un cliente para minimizar la carga
	}

	// Realizar la solicitud a la API de Zoho Billing
	response, err := fetchZohoBillingData("customers", params)
	if err != nil {
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al obtener el total de clientes: " + err.Error(),
		})
		return
	}

	// Decodificar la respuesta
	var customersResp CustomersResponse
	err = json.Unmarshal(response, &customersResp)
	if err != nil {
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al procesar respuesta de Zoho Billing: " + err.Error(),
		})
		return
	}

	// Obtener el total de clientes de la respuesta
	// La API de Zoho Billing no proporciona directamente el total de clientes,
	// pero podemos calcularlo a partir del número de páginas y clientes por página
	totalPages := 0
	totalCustomers := 0

	// Realizar solicitudes adicionales para obtener el total real de clientes
	// Primero, obtenemos el número total de páginas
	if customersResp.HasMorePage {
		// Si hay más páginas, necesitamos hacer solicitudes adicionales para encontrar la última página
		// Usamos una búsqueda binaria para encontrar la última página de manera eficiente
		lowerBound := 1
		upperBound := 10000 // Un límite superior razonable

		for lowerBound <= upperBound {
			mid := (lowerBound + upperBound) / 2

			// Verificar si esta página existe
			pageParams := map[string]string{
				"page":     strconv.Itoa(mid),
				"per_page": "1",
			}

			pageResponse, err := fetchZohoBillingData("customers", pageParams)
			if err != nil {
				// Si hay un error, asumimos que la página no existe
				upperBound = mid - 1
				continue
			}

			var pageResp CustomersResponse
			err = json.Unmarshal(pageResponse, &pageResp)
			if err != nil {
				// Si hay un error al decodificar, asumimos que la página no existe
				upperBound = mid - 1
				continue
			}

			if len(pageResp.Customers) > 0 {
				// Esta página existe
				lowerBound = mid + 1
				totalPages = mid // Actualizar el total de páginas
			} else {
				// Esta página no existe
				upperBound = mid - 1
			}
		}
	} else {
		// Si no hay más páginas, el total de páginas es 1
		totalPages = 1
	}

	// Ahora obtenemos el número de clientes en la última página
	if totalPages > 0 {
		// Obtener el número de clientes en la última página
		lastPageParams := map[string]string{
			"page":     strconv.Itoa(totalPages),
			"per_page": "200", // Usamos el máximo permitido para asegurarnos de obtener todos los clientes de la última página
		}

		lastPageResponse, err := fetchZohoBillingData("customers", lastPageParams)
		if err != nil {
			c.JSON(500, ApiResponse{
				Success: false,
				Error:   "Error al obtener la última página de clientes: " + err.Error(),
			})
			return
		}

		var lastPageResp CustomersResponse
		err = json.Unmarshal(lastPageResponse, &lastPageResp)
		if err != nil {
			c.JSON(500, ApiResponse{
				Success: false,
				Error:   "Error al procesar respuesta de la última página: " + err.Error(),
			})
			return
		}

		// Calcular el total de clientes
		totalCustomers = (totalPages-1)*200 + len(lastPageResp.Customers)
	}

	// Devolver el total de clientes
	c.JSON(200, ApiResponse{
		Success: true,
		Data: map[string]interface{}{
			"total": totalCustomers,
		},
		Message: "Total de clientes obtenido exitosamente",
	})
}

// getSubscriptionsCount obtiene el conteo de suscripciones por estado
func getSubscriptionsCount(c *gin.Context) {
	log.Printf("Obteniendo conteo de suscripciones por estado")

	// Verificar si se solicita una actualización forzada de la caché
	forceRefresh := c.Query("force_refresh") == "true"

	// Configurar parámetros para obtener todas las suscripciones
	// Usamos un valor alto para per_page para reducir el número de solicitudes
	params := map[string]string{
		"page":     "1",
		"per_page": "200", // Valor máximo permitido por la API de Zoho Billing
	}

	// Añadir timestamp para evitar caché si se solicita actualización forzada
	if forceRefresh {
		params["_t"] = fmt.Sprintf("%d", time.Now().UnixNano())
	}

	// Contadores para diferentes estados
	counts := map[string]int{
		"total":        0,
		"live":         0,
		"non_renewing": 0,
		"cancelled":    0,
		"expired":      0,
		"trial":        0,
		"unpaid":       0,
		"paused":       0, // Suscripciones pausadas
		"past_due":     0, // Suscripciones con pagos vencidos
		"other":        0,
		"premium":      0, // Suscripciones activas con precio > 100
	}

	// Log para depuración
	log.Printf("Iniciando conteo de suscripciones con estados y montos")

	// Variables para controlar la paginación
	currentPage := 1
	hasMorePages := true
	totalProcessed := 0

	log.Printf("Iniciando procesamiento de todas las páginas de suscripciones")

	// Iterar por todas las páginas de suscripciones
	for hasMorePages {
		// Actualizar el número de página en los parámetros
		params["page"] = fmt.Sprintf("%d", currentPage)

		// Realizar la solicitud a la API de Zoho Billing
		log.Printf("Obteniendo página %d de suscripciones desde Zoho Billing", currentPage)
		response, err := fetchZohoBillingData("subscriptions", params)
		if err != nil {
			log.Printf("Error al obtener suscripciones: %v", err)
			c.JSON(500, ApiResponse{
				Success: false,
				Error:   "Error al obtener suscripciones: " + err.Error(),
			})
			return
		}

		// Decodificar la respuesta
		var subscriptionResponse SubscriptionResponse
		if err := json.Unmarshal(response, &subscriptionResponse); err != nil {
			log.Printf("Error al decodificar respuesta JSON: %v", err)
			c.JSON(500, ApiResponse{
				Success: false,
				Error:   "Error al procesar la respuesta: " + err.Error(),
			})
			return
		}

		// Verificar si la respuesta es exitosa
		if subscriptionResponse.Code != 0 {
			log.Printf("Error en API Zoho Billing: Código %d, Mensaje: %s",
				subscriptionResponse.Code, subscriptionResponse.Message)
			c.JSON(400, ApiResponse{
				Success: false,
				Error:   "Error en la API de Zoho Billing: " + subscriptionResponse.Message,
			})
			return
		}

		// Registrar información detallada sobre la página actual
		log.Printf("Página %d: Recibidas %d suscripciones, HasMorePage: %v, Parámetros: %v",
			currentPage, len(subscriptionResponse.Subscriptions), subscriptionResponse.HasMorePage, params)

		// Registrar la respuesta completa para depuración
		respBytes, _ := json.Marshal(subscriptionResponse)
		log.Printf("Respuesta completa de la página %d: %s", currentPage, string(respBytes))

		// Contar suscripciones por estado
		for _, subscription := range subscriptionResponse.Subscriptions {
			// Incrementar contador total
			counts["total"]++
			totalProcessed++

			// Incrementar contador específico según el estado
			switch subscription.Status {
			case "live":
				counts["live"]++

				// Verificar si es una suscripción premium (precio > 100)
				if subscription.Amount > 100 {
					counts["premium"]++
					log.Printf("Suscripción PREMIUM encontrada: ID=%s, Cliente=%s, Monto=%.2f",
						subscription.SubscriptionID, subscription.CustomerName, subscription.Amount)
				} else {
					log.Printf("Suscripción NO premium: ID=%s, Cliente=%s, Monto=%.2f",
						subscription.SubscriptionID, subscription.CustomerName, subscription.Amount)
				}
				// Registrar detalles de suscripciones activas para depuración
				log.Printf("Suscripción activa: ID=%s, Cliente=%s, Monto=%.2f, Estado=%s, ¿Es premium?: %v",
					subscription.SubscriptionID, subscription.CustomerName, subscription.Amount, subscription.Status, subscription.Amount > 100)
			case "non_renewing":
				counts["non_renewing"]++
			case "cancelled":
				counts["cancelled"]++
			case "expired":
				counts["expired"]++
			case "trial":
				counts["trial"]++
			case "unpaid":
				counts["unpaid"]++
			case "paused":
				counts["paused"]++
				log.Printf("Suscripción pausada: ID=%s, Cliente=%s, Monto=%.2f",
					subscription.SubscriptionID, subscription.CustomerName, subscription.Amount)
			case "past_due":
				counts["past_due"]++
				log.Printf("Suscripción con pago vencido: ID=%s, Cliente=%s, Monto=%.2f",
					subscription.SubscriptionID, subscription.CustomerName, subscription.Amount)
			default:
				counts["other"]++
				log.Printf("Suscripción con estado desconocido: ID=%s, Cliente=%s, Estado=%s",
					subscription.SubscriptionID, subscription.CustomerName, subscription.Status)
			}
		}

		// Verificar si hay más páginas
		// Modificamos la lógica para continuar si recibimos suscripciones, incluso si HasMorePage es false
		receivedSubscriptions := len(subscriptionResponse.Subscriptions)
		perPage, _ := strconv.Atoi(params["per_page"])
		hasMorePages = subscriptionResponse.HasMorePage || (receivedSubscriptions > 0 && receivedSubscriptions >= perPage)

		log.Printf("Verificación de paginación: HasMorePage=%v, Recibidas=%d, PerPage=%d, Continuar=%v",
			subscriptionResponse.HasMorePage, receivedSubscriptions, perPage, hasMorePages)

		currentPage++

		// Registrar progreso de la paginación
		if hasMorePages {
			log.Printf("Procesando página %d de suscripciones. Conteo actual: %d, Total procesadas: %d",
				currentPage, counts["total"], totalProcessed)
		}
	}

	// Registrar resumen final detallado
	log.Printf("===== RESUMEN FINAL DEL PROCESAMIENTO DE SUSCRIPCIONES =====")
	log.Printf("Total de suscripciones procesadas: %d", totalProcessed)
	log.Printf("Número de páginas procesadas: %d", currentPage-1)
	log.Printf("Último valor de hasMorePages: %v", hasMorePages)
	log.Printf("Desglose por estado:")
	log.Printf("  - Total: %d", counts["total"])
	log.Printf("  - Activas: %d", counts["live"])
	var premiumPercentage float64
	if counts["live"] > 0 {
		premiumPercentage = float64(counts["premium"]) / float64(counts["live"]) * 100.0
	} else {
		premiumPercentage = 0
	}
	log.Printf("  - Premium (>100): %d (%.1f%% de las activas)",
		counts["premium"], premiumPercentage)
	var nonPremiumPercentage float64
	if counts["live"] > 0 {
		nonPremiumPercentage = float64(counts["live"]-counts["premium"]) / float64(counts["live"]) * 100.0
	} else {
		nonPremiumPercentage = 0
	}
	log.Printf("  - Activas NO premium (<=100): %d (%.1f%% de las activas)",
		counts["live"]-counts["premium"], nonPremiumPercentage)
	log.Printf("  - No renovables: %d", counts["non_renewing"])
	log.Printf("  - Canceladas: %d", counts["cancelled"])
	log.Printf("  - Expiradas: %d", counts["expired"])
	log.Printf("  - Prueba: %d", counts["trial"])
	log.Printf("  - Impagadas: %d", counts["unpaid"])
	log.Printf("  - Pausadas: %d", counts["paused"])
	log.Printf("  - Con pago vencido: %d", counts["past_due"])
	log.Printf("  - Otras: %d", counts["other"])
	log.Printf("===== FIN DEL RESUMEN =====")

	// Log tradicional para compatibilidad
	log.Printf("Procesamiento completado. Total de suscripciones: %d, Páginas procesadas: %d",
		totalProcessed, currentPage-1)
	log.Printf("Desglose por estado: Total=%d, Activas=%d, Premium=%d, No renovables=%d, Canceladas=%d, Expiradas=%d, Prueba=%d, Impagadas=%d, Pausadas=%d, Con pago vencido=%d, Otras=%d",
		counts["total"], counts["live"], counts["premium"], counts["non_renewing"],
		counts["cancelled"], counts["expired"], counts["trial"], counts["unpaid"], counts["paused"], counts["past_due"], counts["other"])

	// Devolver los conteos
	c.JSON(200, ApiResponse{
		Success: true,
		Data:    counts,
		Message: "Conteo de suscripciones obtenido exitosamente",
	})
}

// createSubscription crea una nueva suscripción en Zoho Billing
func createSubscription(c *gin.Context) {
	var subscriptionData map[string]interface{}
	if err := c.ShouldBindJSON(&subscriptionData); err != nil {
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "Datos de suscripción inválidos: " + err.Error(),
		})
		return
	}

	// Validar campos requeridos
	requiredFields := []string{"customer_id", "plan_code"}
	for _, field := range requiredFields {
		if _, exists := subscriptionData[field]; !exists {
			c.JSON(400, ApiResponse{
				Success: false,
				Error:   fmt.Sprintf("Campo requerido faltante: %s", field),
			})
			return
		}
	}

	log.Printf("Creando nueva suscripción con datos: %+v", subscriptionData)

	// Crear la suscripción en Zoho Billing
	response, err := createZohoBillingData("subscriptions", subscriptionData)
	if err != nil {
		log.Printf("Error al crear suscripción: %v", err)
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al crear suscripción: " + err.Error(),
		})
		return
	}

	var subscriptionResponse SubscriptionDetailResponse
	if err := json.Unmarshal(response, &subscriptionResponse); err != nil {
		log.Printf("Error al decodificar respuesta de creación de suscripción: %v", err)
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al procesar respuesta de Zoho Billing: " + err.Error(),
		})
		return
	}

	if subscriptionResponse.Code != 0 {
		log.Printf("Error en API Zoho Billing al crear suscripción: Código %d, Mensaje: %s",
			subscriptionResponse.Code, subscriptionResponse.Message)
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "Error en la API de Zoho Billing: " + subscriptionResponse.Message,
		})
		return
	}

	log.Printf("Suscripción creada exitosamente: %s", subscriptionResponse.Subscription.SubscriptionID)
	c.JSON(201, ApiResponse{
		Success: true,
		Data:    subscriptionResponse.Subscription,
		Message: "Suscripción creada exitosamente",
	})
}

// updateSubscription actualiza una suscripción existente
func updateSubscription(c *gin.Context) {
	subscriptionID := c.Param("id")
	if subscriptionID == "" {
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "ID de suscripción no proporcionado",
		})
		return
	}

	var updateData map[string]interface{}
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "Datos de actualización inválidos: " + err.Error(),
		})
		return
	}

	log.Printf("Actualizando suscripción %s con datos: %+v", subscriptionID, updateData)

	// Actualizar la suscripción en Zoho Billing
	response, err := updateZohoBillingData(fmt.Sprintf("subscriptions/%s", subscriptionID), updateData)
	if err != nil {
		log.Printf("Error al actualizar suscripción: %v", err)
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al actualizar suscripción: " + err.Error(),
		})
		return
	}

	var subscriptionResponse SubscriptionDetailResponse
	if err := json.Unmarshal(response, &subscriptionResponse); err != nil {
		log.Printf("Error al decodificar respuesta de actualización: %v", err)
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al procesar respuesta de Zoho Billing: " + err.Error(),
		})
		return
	}

	if subscriptionResponse.Code != 0 {
		log.Printf("Error en API Zoho Billing al actualizar suscripción: Código %d, Mensaje: %s",
			subscriptionResponse.Code, subscriptionResponse.Message)
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "Error en la API de Zoho Billing: " + subscriptionResponse.Message,
		})
		return
	}

	log.Printf("Suscripción actualizada exitosamente: %s", subscriptionID)
	c.JSON(200, ApiResponse{
		Success: true,
		Data:    subscriptionResponse.Subscription,
		Message: "Suscripción actualizada exitosamente",
	})
}

// cancelSubscription cancela una suscripción
func cancelSubscription(c *gin.Context) {
	subscriptionID := c.Param("id")
	if subscriptionID == "" {
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "ID de suscripción no proporcionado",
		})
		return
	}

	// Obtener parámetros opcionales
	cancelAtEnd := c.Query("cancel_at_end") == "true"
	cancelReason := c.Query("reason")
	if cancelReason == "" {
		cancelReason = "Cancelación solicitada por el usuario"
	}

	cancelData := map[string]interface{}{
		"cancel_at_end": cancelAtEnd,
		"reason":        cancelReason,
	}

	log.Printf("Cancelando suscripción %s con datos: %+v", subscriptionID, cancelData)

	// Cancelar la suscripción en Zoho Billing
	response, err := updateZohoBillingData(fmt.Sprintf("subscriptions/%s/cancel", subscriptionID), cancelData)
	if err != nil {
		log.Printf("Error al cancelar suscripción: %v", err)
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al cancelar suscripción: " + err.Error(),
		})
		return
	}

	var cancelResponse struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	}
	if err := json.Unmarshal(response, &cancelResponse); err != nil {
		log.Printf("Error al decodificar respuesta de cancelación: %v", err)
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al procesar respuesta de Zoho Billing: " + err.Error(),
		})
		return
	}

	if cancelResponse.Code != 0 {
		log.Printf("Error en API Zoho Billing al cancelar suscripción: Código %d, Mensaje: %s",
			cancelResponse.Code, cancelResponse.Message)
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "Error en la API de Zoho Billing: " + cancelResponse.Message,
		})
		return
	}

	log.Printf("Suscripción cancelada exitosamente: %s", subscriptionID)
	c.JSON(200, ApiResponse{
		Success: true,
		Message: "Suscripción cancelada exitosamente",
	})
}

// pauseSubscription pausa una suscripción
func pauseSubscription(c *gin.Context) {
	subscriptionID := c.Param("id")
	if subscriptionID == "" {
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "ID de suscripción no proporcionado",
		})
		return
	}

	log.Printf("Pausando suscripción: %s", subscriptionID)

	// Pausar la suscripción en Zoho Billing
	response, err := updateZohoBillingData(fmt.Sprintf("subscriptions/%s/pause", subscriptionID), nil)
	if err != nil {
		log.Printf("Error al pausar suscripción: %v", err)
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al pausar suscripción: " + err.Error(),
		})
		return
	}

	var pauseResponse struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	}
	if err := json.Unmarshal(response, &pauseResponse); err != nil {
		log.Printf("Error al decodificar respuesta de pausa: %v", err)
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al procesar respuesta de Zoho Billing: " + err.Error(),
		})
		return
	}

	if pauseResponse.Code != 0 {
		log.Printf("Error en API Zoho Billing al pausar suscripción: Código %d, Mensaje: %s",
			pauseResponse.Code, pauseResponse.Message)
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "Error en la API de Zoho Billing: " + pauseResponse.Message,
		})
		return
	}

	log.Printf("Suscripción pausada exitosamente: %s", subscriptionID)
	c.JSON(200, ApiResponse{
		Success: true,
		Message: "Suscripción pausada exitosamente",
	})
}

// resumeSubscription reanuda una suscripción pausada
func resumeSubscription(c *gin.Context) {
	subscriptionID := c.Param("id")
	if subscriptionID == "" {
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "ID de suscripción no proporcionado",
		})
		return
	}

	log.Printf("Reanudando suscripción: %s", subscriptionID)

	// Reanudar la suscripción en Zoho Billing
	response, err := updateZohoBillingData(fmt.Sprintf("subscriptions/%s/resume", subscriptionID), nil)
	if err != nil {
		log.Printf("Error al reanudar suscripción: %v", err)
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al reanudar suscripción: " + err.Error(),
		})
		return
	}

	var resumeResponse struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	}
	if err := json.Unmarshal(response, &resumeResponse); err != nil {
		log.Printf("Error al decodificar respuesta de reanudación: %v", err)
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al procesar respuesta de Zoho Billing: " + err.Error(),
		})
		return
	}

	if resumeResponse.Code != 0 {
		log.Printf("Error en API Zoho Billing al reanudar suscripción: Código %d, Mensaje: %s",
			resumeResponse.Code, resumeResponse.Message)
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "Error en la API de Zoho Billing: " + resumeResponse.Message,
		})
		return
	}

	log.Printf("Suscripción reanudada exitosamente: %s", subscriptionID)
	c.JSON(200, ApiResponse{
		Success: true,
		Message: "Suscripción reanudada exitosamente",
	})
}

// changePlan cambia el plan de una suscripción
func changePlan(c *gin.Context) {
	subscriptionID := c.Param("id")
	if subscriptionID == "" {
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "ID de suscripción no proporcionado",
		})
		return
	}

	var planData struct {
		PlanCode string `json:"plan_code" binding:"required"`
		Prorate  bool   `json:"prorate"`
	}

	if err := c.ShouldBindJSON(&planData); err != nil {
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "Datos de cambio de plan inválidos: " + err.Error(),
		})
		return
	}

	log.Printf("Cambiando plan de suscripción %s a plan %s", subscriptionID, planData.PlanCode)

	changeData := map[string]interface{}{
		"plan_code": planData.PlanCode,
		"prorate":   planData.Prorate,
	}

	// Cambiar el plan en Zoho Billing
	response, err := updateZohoBillingData(fmt.Sprintf("subscriptions/%s/change_plan", subscriptionID), changeData)
	if err != nil {
		log.Printf("Error al cambiar plan de suscripción: %v", err)
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al cambiar plan de suscripción: " + err.Error(),
		})
		return
	}

	var changeResponse SubscriptionDetailResponse
	if err := json.Unmarshal(response, &changeResponse); err != nil {
		log.Printf("Error al decodificar respuesta de cambio de plan: %v", err)
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al procesar respuesta de Zoho Billing: " + err.Error(),
		})
		return
	}

	if changeResponse.Code != 0 {
		log.Printf("Error en API Zoho Billing al cambiar plan: Código %d, Mensaje: %s",
			changeResponse.Code, changeResponse.Message)
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "Error en la API de Zoho Billing: " + changeResponse.Message,
		})
		return
	}

	log.Printf("Plan cambiado exitosamente para suscripción: %s", subscriptionID)
	c.JSON(200, ApiResponse{
		Success: true,
		Data:    changeResponse.Subscription,
		Message: "Plan cambiado exitosamente",
	})
}

// getAllSubscriptions obtiene todas las suscripciones con información del cliente y estado
func getAllSubscriptions(c *gin.Context) {
	log.Printf("=== INICIO getAllSubscriptions ===")
	log.Printf("Query params: %v", c.Request.URL.Query())
	
	// Capturar cualquier panic
	defer func() {
		if r := recover(); r != nil {
			log.Printf("PANIC en getAllSubscriptions: %v", r)
			c.JSON(500, ApiResponse{
				Success: false,
				Error:   fmt.Sprintf("Error interno del servidor: %v", r),
			})
		}
	}()
	
	// Obtener parámetros de paginación y filtrado
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if limit == 0 {
		limit, _ = strconv.Atoi(c.DefaultQuery("limit", "20"))
	}
	status := c.Query("status") // Filtro por estado (live, non_renewing, cancelled, etc.)
	// Verificar si se solicita obtener todas las suscripciones
	getAll := c.Query("get_all") == "true"
	
	// Debug: Imprimir todos los parámetros recibidos
	log.Printf("🔍 Parámetros recibidos - page: %d, per_page: %s, limit: %d, get_all: %s, status: %s", 
		page, c.Query("per_page"), limit, c.Query("get_all"), status)
	log.Printf("🔍 Todos los query params: %v", c.Request.URL.Query())

	// Obtener parámetros de filtro por fecha
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	dateField := c.Query("date_field") // created_time, next_billing_at, last_billing_at, expiry_at

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 200 {
		limit = 20
	}

	// Si se solicita obtener todas las suscripciones, usamos el valor máximo para per_page
	perPage := limit
	if getAll {
		perPage = 200 // Valor máximo permitido por la API de Zoho Billing
	}

	// Configurar parámetros para la solicitud a Zoho Billing
	params := map[string]string{
		"page":     strconv.Itoa(page),
		"per_page": strconv.Itoa(perPage),
	}

	// Agregar filtro por estado si se proporciona
	if status != "" {
		params["status"] = status
	}

	// Agregar filtros de fecha si se proporcionan
	if startDate != "" && dateField != "" {
		// Convertir formato de fecha YYYY-MM-DD a formato ISO8601 para Zoho
		params["filter_by"] = dateField
		params["filter_value_start"] = startDate + "T00:00:00-0000"
	}

	if endDate != "" && dateField != "" {
		// Convertir formato de fecha YYYY-MM-DD a formato ISO8601 para Zoho
		params["filter_by"] = dateField
		params["filter_value_end"] = endDate + "T23:59:59-0000"
	}

	// Registrar los parámetros de la solicitud para depuración
	log.Printf("Solicitando suscripciones con parámetros: %v, getAll: %v", params, getAll)

	// Si se solicita obtener todas las suscripciones, iteramos por todas las páginas
	var totalPages int

	if getAll {
		// Cuando get_all=true, primero obtenemos el total real de suscripciones
		// pero devolvemos solo la página solicitada con la información correcta de paginación
		log.Printf("Modo get_all activado: obteniendo conteo total real de suscripciones")
		
		// Obtener el total real iterando por todas las páginas para contar
		countPage := 1
		hasMoreForCount := true
		totalRealSubscriptions := 0
		totalRealPages := 0
		
		for hasMoreForCount {
			countParams := map[string]string{
				"page":     fmt.Sprintf("%d", countPage),
				"per_page": "200", // Máximo para contar más rápido
			}
			
			// Agregar filtro por estado si se proporciona
			if status != "" {
				countParams["status"] = status
			}
			
			response, err := fetchZohoBillingData("subscriptions", countParams)
			if err != nil {
				log.Printf("Error al contar suscripciones: %v", err)
				break
			}
			
			var countResponse SubscriptionResponse
			if err := json.Unmarshal(response, &countResponse); err != nil {
				log.Printf("Error al decodificar respuesta de conteo: %v", err)
				break
			}
			
			if countResponse.Code != 0 {
				log.Printf("Error en API Zoho Billing para conteo: %d", countResponse.Code)
				break
			}
			
			pageItems := len(countResponse.Subscriptions)
			totalRealSubscriptions += pageItems
			totalRealPages++
			
			log.Printf("Página de conteo %d: %d items, HasMorePage: %v", countPage, pageItems, countResponse.HasMorePage)
			
			hasMoreForCount = countResponse.HasMorePage
			countPage++
			
			// Límite de seguridad para evitar bucles infinitos
			if countPage > 50 {
				log.Printf("Límite de páginas alcanzado en conteo")
				break
			}
		}
		
		log.Printf("Conteo completado: %d suscripciones totales en %d páginas", totalRealSubscriptions, totalRealPages)
		
		// Ahora necesitamos obtener las suscripciones para la página específica
		// Calculamos qué página de Zoho necesitamos y el offset
		zohoPage := ((page - 1) * limit) / 200 + 1
		offsetInZohoPage := ((page - 1) * limit) % 200
		
		// Parámetros para obtener la página específica de Zoho
		pageParams := map[string]string{
			"page":     fmt.Sprintf("%d", zohoPage),
			"per_page": "200", // Usar 200 para obtener suficientes datos
		}
		
		// Agregar filtro por estado si se proporciona
		if status != "" {
			pageParams["status"] = status
		}
		
		log.Printf("Obteniendo página %d de Zoho (offset %d) para página %d del frontend (limit %d)",
			zohoPage, offsetInZohoPage, page, limit)
		
		response, err := fetchZohoBillingData("subscriptions", pageParams)
		if err != nil {
			log.Printf("Error al obtener página específica: %v", err)
			c.JSON(500, ApiResponse{
				Success: false,
				Error:   "Error al obtener suscripciones: " + err.Error(),
			})
			return
		}
		
		var subscriptionResponse SubscriptionResponse
		if err := json.Unmarshal(response, &subscriptionResponse); err != nil {
			log.Printf("Error al decodificar respuesta: %v", err)
			c.JSON(500, ApiResponse{
				Success: false,
				Error:   "Error al procesar la respuesta: " + err.Error(),
			})
			return
		}
		
		if subscriptionResponse.Code != 0 {
			log.Printf("Error en API Zoho Billing: %d", subscriptionResponse.Code)
			c.JSON(400, ApiResponse{
				Success: false,
				Error:   "Error en la API de Zoho Billing: " + subscriptionResponse.Message,
			})
			return
		}
		
		// Extraer solo las suscripciones que corresponden a la página solicitada
		allItems := subscriptionResponse.Subscriptions
		startIndex := offsetInZohoPage
		endIndex := startIndex + limit
		
		// Asegurar que no excedamos los límites del array
		if startIndex >= len(allItems) {
			// No hay más items para esta página
			allItems = []Subscription{}
		} else {
			if endIndex > len(allItems) {
				endIndex = len(allItems)
			}
			allItems = allItems[startIndex:endIndex]
		}
		
		// Si necesitamos más items y hay otra página de Zoho, obtenerla
		if len(allItems) < limit && subscriptionResponse.HasMorePage {
			nextZohoPage := zohoPage + 1
			nextPageParams := map[string]string{
				"page":     fmt.Sprintf("%d", nextZohoPage),
				"per_page": "200",
			}
			
			if status != "" {
				nextPageParams["status"] = status
			}
			
			nextResponse, err := fetchZohoBillingData("subscriptions", nextPageParams)
			if err == nil {
				var nextSubscriptionResponse SubscriptionResponse
				if json.Unmarshal(nextResponse, &nextSubscriptionResponse) == nil && nextSubscriptionResponse.Code == 0 {
					remainingNeeded := limit - len(allItems)
					if remainingNeeded > 0 && len(nextSubscriptionResponse.Subscriptions) > 0 {
						nextEndIndex := remainingNeeded
						if nextEndIndex > len(nextSubscriptionResponse.Subscriptions) {
							nextEndIndex = len(nextSubscriptionResponse.Subscriptions)
						}
						allItems = append(allItems, nextSubscriptionResponse.Subscriptions[:nextEndIndex]...)
					}
				}
			}
		}
		
		// Calcular totalPages basado en el total real y el límite solicitado
		calculatedTotalPages := (totalRealSubscriptions + limit - 1) / limit
		if calculatedTotalPages < 1 {
			calculatedTotalPages = 1
		}
		
		log.Printf("Devolviendo página %d con %d items (solicitados: %d). Total real: %d, TotalPages calculado: %d",
			page, len(allItems), limit, totalRealSubscriptions, calculatedTotalPages)
		
		// Devolver la página solicitada con información correcta de paginación
		c.JSON(200, ApiResponse{
			Success: true,
			Data: map[string]interface{}{
				"items":      allItems,
				"total":      totalRealSubscriptions,
				"page":       page,
				"pageSize":   limit,
				"totalPages": calculatedTotalPages,
			},
		})
		return
	}

	// Si no se solicita obtener todas las suscripciones, continuamos con el comportamiento normal
	// Realizar la solicitud a la API de Zoho Billing para una sola página
	response, err := fetchZohoBillingData("subscriptions", params)
	if err != nil {
		log.Printf("Error al obtener suscripciones: %v", err)
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al obtener suscripciones: " + err.Error(),
		})
		return
	}

	// Registrar la respuesta para depuración
	log.Printf("Respuesta de API para suscripciones: %s", string(response))

	// Decodificar la respuesta
	var subscriptionResponse SubscriptionResponse
	if err := json.Unmarshal(response, &subscriptionResponse); err != nil {
		log.Printf("Error al decodificar respuesta JSON: %v. Respuesta: %s", err, string(response))
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al procesar la respuesta: " + err.Error(),
		})
		return
	}

	// Verificar si la respuesta es exitosa
	if subscriptionResponse.Code != 0 {
		log.Printf("Error en API Zoho Billing: Código %d, Mensaje: %s",
			subscriptionResponse.Code, subscriptionResponse.Message)
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "Error en la API de Zoho Billing: " + subscriptionResponse.Message,
		})
		return
	}

	// Calcular el total de suscripciones de manera más precisa
	currentPageItems := len(subscriptionResponse.Subscriptions)
	total := 0
	
	if page == 1 && !subscriptionResponse.HasMorePage {
		// Primera página y no hay más páginas = total exacto
		total = currentPageItems
		log.Printf("Caso simple: página 1 sin más páginas, total = %d", total)
	} else {
		// Necesitamos estimar el total basado en la paginación actual
		// Método 1: Usar la información de la página actual para estimar
		if page == 1 {
			// En la primera página, si hay más páginas y tenemos el límite completo,
			// podemos estimar que hay al menos 2-3 páginas más
			if subscriptionResponse.HasMorePage && currentPageItems == limit {
				// Estimación conservadora: al menos 3 páginas
				total = limit * 3
				log.Printf("Estimación desde página 1: %d items por página, estimando %d total", limit, total)
			} else {
				// Si no tenemos el límite completo en la primera página, usar lo que tenemos
				total = currentPageItems
				if subscriptionResponse.HasMorePage {
					total += limit // Al menos una página más
				}
				log.Printf("Estimación ajustada desde página 1: %d total", total)
			}
		} else {
			// Para páginas posteriores, calcular basado en la página actual
			total = ((page - 1) * limit) + currentPageItems
			if subscriptionResponse.HasMorePage {
				total += limit // Al menos una página más
			}
			log.Printf("Estimación desde página %d: %d total", page, total)
		}
		
		// Método 2: Intentar obtener un conteo más preciso con una solicitud especial
		// Solo si estamos en la primera página para evitar múltiples llamadas
		if page == 1 {
			countParams := map[string]string{
				"page":     "1",
				"per_page": "200", // Usar un número más alto para obtener más información
			}
			
			// Agregar el mismo filtro de estado si existe
			if status != "" {
				countParams["status"] = status
			}
			
			// Hacer solicitud para obtener mejor estimación
			countResponse, err := fetchZohoBillingData("subscriptions", countParams)
			if err == nil {
				var countSubscriptionResponse SubscriptionResponse
				if json.Unmarshal(countResponse, &countSubscriptionResponse) == nil {
					countItems := len(countSubscriptionResponse.Subscriptions)
					log.Printf("Solicitud de conteo: recibidos %d items, HasMorePage: %v", countItems, countSubscriptionResponse.HasMorePage)
					
					if !countSubscriptionResponse.HasMorePage {
						// No hay más páginas, este es el total exacto
						total = countItems
						log.Printf("Total exacto obtenido: %d", total)
					} else if countItems == 200 {
						// Hay más de 200, estimamos basado en múltiplos
						total = 300 // Estimación conservadora para mostrar paginación
						log.Printf("Más de 200 items, estimando %d", total)
					}
				}
			} else {
				log.Printf("Error en solicitud de conteo: %v", err)
			}
		}
	}

	// Imprimir información de depuración
	log.Printf("Suscripciones: %d, Página: %d, Por página: %d, Hay más páginas: %v, Total calculado: %d",
		len(subscriptionResponse.Subscriptions), subscriptionResponse.Page, subscriptionResponse.PerPage,
		subscriptionResponse.HasMorePage, total)

	// Calcular totalPages basado en el total y per_page
	// Validar que PerPage no sea 0 para evitar división por cero
	if subscriptionResponse.PerPage == 0 {
		log.Printf("ERROR: PerPage es 0, estableciendo valor por defecto de 200")
		subscriptionResponse.PerPage = 200 // Valor por defecto
	}
	
	totalPages = (total + subscriptionResponse.PerPage - 1) / subscriptionResponse.PerPage
	if totalPages < 1 {
		totalPages = 1
	}

	// Devolver las suscripciones en el formato esperado por el frontend
	c.JSON(200, ApiResponse{
		Success: true,
		Data: map[string]interface{}{
			"items":      subscriptionResponse.Subscriptions,
			"total":      total,
			"page":       subscriptionResponse.Page,
			"pageSize":   subscriptionResponse.PerPage,
			"totalPages": totalPages,
		},
	})
}
