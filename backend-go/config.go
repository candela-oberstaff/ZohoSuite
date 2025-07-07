package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"math/rand"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

var (
	BIGIN_API_URL     = getEnvWithDefault("BIGIN_API_URL", "https://www.zohoapis.com/bigin/v2")
	BILLING_API_URL   = getEnvWithDefault("BILLING_API_URL", "https://www.zohoapis.com/billing/v1")
	ZOHO_ACCOUNTS_URL = getEnvWithDefault("ZOHO_ACCOUNTS_URL", "https://accounts.zoho.com")

	// Instancias de caché
	pipelinesCache       *SmartCache
	pipelineLayoutsCache *SmartCache
	activeCustomersCache *SmartCache // Caché para el contador de clientes activos
)

// Estructura para almacenar información de pipelines
type PipelineInfo struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// Estructura para almacenar información de etapas de pipeline
type PipelineStage struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Order int    `json:"order"`
}

// Estructura para almacenar metadatos completos de pipelines
type PipelinesMetadata struct {
	Pipelines map[string]PipelineInfo             // Mapa de ID a información de pipeline
	Stages    map[string][]PipelineStage          // Mapa de ID de pipeline a sus etapas
	Fields    map[string]map[string]PickListValue // Mapa de ID de pipeline a sus campos personalizados
	UpdatedAt time.Time                           // Momento de la última actualización
}

func init() {
	// Inicializar el generador de números aleatorios para el jitter en reintentos
	rand.Seed(time.Now().UnixNano())

	// Inicializar cachés
	pipelinesCache = NewSmartCache("pipelines", fetchPipelinesMetadata)
	pipelineLayoutsCache = NewSmartCache("pipeline_layouts", fetchPipelineLayouts)
	activeCustomersCache = NewSmartCache("active_customers", fetchActiveCustomersCount)

	log.Printf("Inicializado cliente de Zoho Bigin API con sistema de caché")
}

// getEnvWithDefault obtiene una variable de entorno o devuelve un valor por defecto
func getEnvWithDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// checkCustomerSubscriptions verifica si un cliente tiene suscripciones activas
func checkCustomerSubscriptions(customerID string) bool {
	// Configurar parámetros para obtener suscripciones del cliente
	subParams := map[string]string{
		"customer_id": customerID,
		// Añadir un timestamp para evitar cualquier caché en la API
		"_t":         fmt.Sprintf("%d", time.Now().UnixNano()),
	}

	// Obtener suscripciones del cliente directamente de Zoho Billing
	subResponse, err := fetchZohoBillingData("subscriptions", subParams)
	if err != nil {
		// Si hay un error, asumimos que no hay suscripciones activas
		log.Printf("Error al obtener suscripciones para cliente %s: %v", customerID, err)
		return false
	}

	// Decodificar la respuesta de suscripciones
	var subscriptionResponse SubscriptionResponse
	if err := json.Unmarshal(subResponse, &subscriptionResponse); err != nil {
		// Si hay un error, asumimos que no hay suscripciones activas
		log.Printf("Error al decodificar respuesta JSON de suscripciones para cliente %s: %v", customerID, err)
		return false
	}

	// Verificar si hay suscripciones activas
	for _, subscription := range subscriptionResponse.Subscriptions {
		if subscription.Status == "live" {
			return true
		}
	}

	return false
}

// fetchActiveCustomersCount obtiene el número de clientes con al menos una suscripción activa para la caché
func fetchActiveCustomersCount() (interface{}, error) {
	log.Printf("Actualizando caché de clientes activos directamente desde Zoho Billing")

	// Forzar la obtención de datos frescos de Zoho Billing sin usar caché
	// Configurar parámetros para obtener todos los clientes
	params := map[string]string{
		"page":     "1",
		"per_page": "200", // Usar un valor alto para reducir el número de solicitudes
		// Añadir un timestamp para evitar cualquier caché en la API
		"_t":       fmt.Sprintf("%d", time.Now().UnixNano()),
	}

	// Variables para el conteo
	activeCustomersCount := 0
	totalCustomers := 0
	totalActiveSubscriptions := 0 // Nuevo contador para suscripciones activas
	currentPage := 1
	hasMorePages := true

	// Semáforo para limitar el número de goroutines concurrentes
	semaphore := make(chan struct{}, 10) // Máximo 10 solicitudes concurrentes
	var wg sync.WaitGroup
	var mutex sync.Mutex // Para proteger los contadores compartidos

	// Iterar por todas las páginas de clientes
	for hasMorePages {
		// Realizar la solicitud a la API de Zoho Billing para obtener clientes
		log.Printf("Obteniendo página %d de clientes desde Zoho Billing", currentPage)
		response, err := fetchZohoBillingData("customers", params)
		if err != nil {
			log.Printf("Error al obtener clientes: %v", err)
			return nil, fmt.Errorf("error al obtener clientes: %w", err)
		}

		// Decodificar la respuesta
		var customersResp CustomersResponse
		if err := json.Unmarshal(response, &customersResp); err != nil {
			log.Printf("Error al decodificar respuesta JSON de clientes: %v", err)
			return nil, fmt.Errorf("error al procesar la respuesta de clientes: %w", err)
		}

		// Actualizar el total de clientes
		mutex.Lock()
		totalCustomers += len(customersResp.Customers)
		mutex.Unlock()

		// Para cada cliente, verificar si tiene suscripciones activas en paralelo
		for _, customer := range customersResp.Customers {
			wg.Add(1)
			semaphore <- struct{}{} // Adquirir un slot del semáforo

			go func(cust Customer) {
				defer wg.Done()
				defer func() { <-semaphore }() // Liberar el slot al terminar

				// Obtener las suscripciones del cliente y contar las activas
				subParams := map[string]string{
					"customer_id": cust.CustomerID,
					"_t":         fmt.Sprintf("%d", time.Now().UnixNano()),
				}

				subResponse, err := fetchZohoBillingData("subscriptions", subParams)
				if err != nil {
					log.Printf("Error al obtener suscripciones para cliente %s: %v", cust.CustomerID, err)
					return
				}

				var subscriptionResponse SubscriptionResponse
				if err := json.Unmarshal(subResponse, &subscriptionResponse); err != nil {
					log.Printf("Error al decodificar respuesta JSON de suscripciones para cliente %s: %v", cust.CustomerID, err)
					return
				}

				// Contar suscripciones activas y actualizar el contador de clientes activos
				activeSubscriptionsForCustomer := 0
				for _, subscription := range subscriptionResponse.Subscriptions {
					if subscription.Status == "live" {
						activeSubscriptionsForCustomer++
					}
				}

				mutex.Lock()
				// Si el cliente tiene al menos una suscripción activa, incrementar el contador
				if activeSubscriptionsForCustomer > 0 {
					activeCustomersCount++
					// Sumar todas las suscripciones activas al contador total
					totalActiveSubscriptions += activeSubscriptionsForCustomer
				}
				mutex.Unlock()
			}(customer)
		}

		// Verificar si hay más páginas
		hasMorePages = customersResp.HasMorePage
		if hasMorePages {
			// Actualizar parámetros para la siguiente página
			currentPage++
			params["page"] = fmt.Sprintf("%d", currentPage)
			// Actualizar el timestamp para evitar caché
			params["_t"] = fmt.Sprintf("%d", time.Now().UnixNano())
		}
	}

	// Esperar a que terminen todas las goroutines
	wg.Wait()

	log.Printf("Datos sincronizados con Zoho Billing: %d clientes activos de %d totales, %d suscripciones activas", 
		activeCustomersCount, totalCustomers, totalActiveSubscriptions)

	// Devolver los resultados como un mapa para la caché
	return map[string]interface{}{
		"active_customers_count":    activeCustomersCount,
		"total_customers":           totalCustomers,
		"total_active_subscriptions": totalActiveSubscriptions,
	}, nil
}

// fetchPipelinesMetadata obtiene los metadatos de todos los pipelines
func fetchPipelinesMetadata() (interface{}, error) {
	log.Println("Obteniendo metadatos de pipelines desde la API de Zoho")

	// Inicializar estructura de metadatos
	metadata := PipelinesMetadata{
		Pipelines: make(map[string]PipelineInfo),
		Stages:    make(map[string][]PipelineStage),
		Fields:    make(map[string]map[string]PickListValue),
		UpdatedAt: time.Now(),
	}

	// 1. Obtener lista de pipelines
	response, err := fetchZohoData("Pipelines", map[string]string{
		"fields":   "Pipeline",
		"per_page": "200", // Máximo permitido por página
	})

	if err != nil {
		return nil, fmt.Errorf("error al obtener pipelines: %w", err)
	}

	if response == nil || response.Data == nil {
		return nil, fmt.Errorf("no se recibieron datos de pipelines")
	}

	// Procesar datos de pipelines
	deals := response.Data
	if deals == nil {
		return nil, fmt.Errorf("formato inesperado en respuesta de pipelines")
	}

	// Extraer información de pipelines
	for _, deal := range deals {
		dealMap, ok := deal.(map[string]interface{})
		if !ok {
			continue
		}

		pipelineData, ok := dealMap["Pipeline"].(map[string]interface{})
		if !ok {
			continue
		}

		pipelineID, ok1 := pipelineData["id"].(string)
		pipelineName, ok2 := pipelineData["name"].(string)

		if ok1 && ok2 && pipelineID != "" {
			// Verificar si ya tenemos este pipeline
			if _, exists := metadata.Pipelines[pipelineID]; !exists {
				metadata.Pipelines[pipelineID] = PipelineInfo{
					ID:   pipelineID,
					Name: pipelineName,
				}
				log.Printf("Pipeline encontrado: ID=%s, Nombre=%s", pipelineID, pipelineName)
			}
		}
	}

	// 2. Para cada pipeline, obtener sus etapas y campos personalizados
	for pipelineID, pipelineInfo := range metadata.Pipelines {
		// Obtener layouts para este pipeline
		layouts, err := getPipelineLayouts(pipelineID, pipelineInfo.Name)
		if err != nil {
			log.Printf("Error al obtener layouts para pipeline %s: %v", pipelineInfo.Name, err)
			continue
		}

		// Guardar información de layouts
		if layouts != nil {
			if stages, ok := layouts["stages"].([]PipelineStage); ok && len(stages) > 0 {
				metadata.Stages[pipelineID] = stages
			}

			if fields, ok := layouts["fields"].(map[string]PickListValue); ok && len(fields) > 0 {
				metadata.Fields[pipelineID] = fields
			}
		}
	}

	log.Printf("Metadatos de pipelines obtenidos: %d pipelines, %d con etapas, %d con campos",
		len(metadata.Pipelines), len(metadata.Stages), len(metadata.Fields))

	return metadata, nil
}

// getPipelineLayouts obtiene los layouts (etapas y campos) para un pipeline específico
func getPipelineLayouts(pipelineID, pipelineName string) (map[string]interface{}, error) {
	// Intentar obtener de caché primero
	if pipelineLayoutsCache != nil {
		cachedData, err := pipelineLayoutsCache.Get()
		if err == nil && cachedData != nil {
			layoutsMap, ok := cachedData.(map[string]map[string]interface{})
			if ok {
				var layoutData map[string]interface{}
				var exists bool
				layoutData, exists = layoutsMap[pipelineID]
				if exists {
					return layoutData, nil
				}
			}
		}
	}

	// Si no está en caché, obtener de la API
	result := make(map[string]interface{})

	// Obtener layouts metadata
	params := map[string]string{
		"module": "Pipelines",
	}

	resp, err := makeZohoRequest("GET", "/settings/layouts", params, nil)
	if err != nil {
		return nil, fmt.Errorf("error al obtener layouts: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error al leer respuesta de layouts: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("error HTTP %d al obtener layouts: %s", resp.StatusCode, string(body))
	}

	// Decodificar respuesta
	var layoutsResp struct {
		Layouts []map[string]interface{} `json:"layouts"`
	}

	if err := json.Unmarshal(body, &layoutsResp); err != nil {
		return nil, fmt.Errorf("error al decodificar layouts: %w", err)
	}

	// Buscar layout para este pipeline
	foundLayout := false
	for _, layout := range layoutsResp.Layouts {
		layoutName, nameExists := layout["name"].(string)
		if !nameExists {
			continue
		}

		// Verificar si este layout corresponde al pipeline
		if strings.Contains(layoutName, pipelineName) || strings.Contains(strings.ToLower(layoutName), strings.ToLower(pipelineName)) {
			foundLayout = true

			// Extraer etapas (stages)
			if sections, ok := layout["sections"].([]interface{}); ok {
				var stages []PipelineStage
				stageOrder := 1

				for _, section := range sections {
					sectionMap, ok := section.(map[string]interface{})
					if !ok {
						continue
					}

					// Buscar sección que contenga etapas
					if sectionName, ok := sectionMap["name"].(string); ok && strings.Contains(strings.ToLower(sectionName), "stage") {
						if fields, ok := sectionMap["fields"].([]interface{}); ok {
							for _, field := range fields {
								fieldMap, ok := field.(map[string]interface{})
								if !ok {
									continue
								}

								if fieldType, ok := fieldMap["data_type"].(string); ok && fieldType == "picklist" {
									if pickListValues, ok := fieldMap["pick_list_values"].([]interface{}); ok {
										for _, plv := range pickListValues {
											plvMap, ok := plv.(map[string]interface{})
											if !ok {
												continue
											}

											stageID, ok1 := plvMap["id"].(string)
											stageName, ok2 := plvMap["display_value"].(string)

											if ok1 && ok2 && stageID != "" {
												stages = append(stages, PipelineStage{
													ID:    stageID,
													Name:  stageName,
													Order: stageOrder,
												})
												stageOrder++
											}
										}
									}
								}
							}
						}
					}
				}

				result["stages"] = stages
			}

			// Extraer campos personalizados
			if fields, ok := layout["fields"].([]interface{}); ok {
				customFields := make(map[string]PickListValue)

				for _, field := range fields {
					fieldMap, ok := field.(map[string]interface{})
					if !ok {
						continue
					}

					fieldAPIName, ok1 := fieldMap["api_name"].(string)
					fieldLabel, ok2 := fieldMap["display_label"].(string)

					if ok1 && ok2 && fieldAPIName != "" {
						// Para campos de tipo lista
						if fieldType, ok := fieldMap["data_type"].(string); ok && fieldType == "picklist" {
							if pickListValues, ok := fieldMap["pick_list_values"].([]interface{}); ok && len(pickListValues) > 0 {
								// Crear un PickListValue para este campo
								plv := PickListValue{
									APIName: fieldAPIName,
									Label:   fieldLabel,
									Values:  make([]map[string]string, 0),
								}

								for _, val := range pickListValues {
									valMap, ok := val.(map[string]interface{})
									if !ok {
										continue
									}

									valID, ok1 := valMap["id"].(string)
									valName, ok2 := valMap["display_value"].(string)

									if ok1 && ok2 && valID != "" {
										plv.Values = append(plv.Values, map[string]string{
											"id":   valID,
											"name": valName,
										})
									}
								}

								if len(plv.Values) > 0 {
									customFields[fieldAPIName] = plv
								}
							}
						}
					}
				}

				result["fields"] = customFields
			}

			break // Encontramos el layout que buscábamos
		}
	}

	if !foundLayout {
		log.Printf("No se encontró layout para el pipeline %s (ID: %s)", pipelineName, pipelineID)
		return nil, nil
	}

	return result, nil
}

// fetchPipelineLayouts obtiene todos los layouts de pipelines para la caché
func fetchPipelineLayouts() (interface{}, error) {
	log.Println("Obteniendo layouts de pipelines desde la API de Zoho")

	// Obtener primero los metadatos de pipelines para tener la lista de IDs
	pipelinesData, err := pipelinesCache.Get()
	if err != nil {
		return nil, fmt.Errorf("error al obtener metadatos de pipelines: %w", err)
	}

	metadata, ok := pipelinesData.(PipelinesMetadata)
	if !ok {
		return nil, fmt.Errorf("formato inesperado en metadatos de pipelines")
	}

	// Mapa para almacenar layouts por ID de pipeline
	layoutsMap := make(map[string]map[string]interface{})

	// Obtener layouts para cada pipeline
	for pipelineID, pipelineInfo := range metadata.Pipelines {
		layoutData, err := getPipelineLayouts(pipelineID, pipelineInfo.Name)
		if err != nil {
			log.Printf("Error al obtener layout para pipeline %s: %v", pipelineInfo.Name, err)
			continue
		}

		if layoutData != nil {
			layoutsMap[pipelineID] = layoutData
		}
	}

	log.Printf("Layouts de pipelines obtenidos: %d layouts", len(layoutsMap))
	return layoutsMap, nil
}

var (
	// Cache para el token de acceso
	accessTokenCache struct {
		token     string
		expiresAt time.Time
		mutex     sync.RWMutex
	}

	// Cache para metadatos de pipelines
	pipelineCache struct {
		data           interface{}
		expiresAt      time.Time
		refreshTrigger time.Time
		isRefreshing   bool
		mutex          sync.RWMutex
	}
)

// TokenResponse estructura para la respuesta del token
type TokenResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
	TokenType   string `json:"token_type"`
}

// SmartCache estructura genérica para caché con tiempo de expiración y actualización en segundo plano
type SmartCache struct {
	data           interface{}
	expiresAt      time.Time
	refreshTrigger time.Time
	isRefreshing   bool
	mutex          sync.RWMutex
	keyName        string                      // Nombre descriptivo para logs
	refreshFunc    func() (interface{}, error) // Función para actualizar los datos
}

// NewSmartCache crea una nueva instancia de SmartCache
func NewSmartCache(keyName string, refreshFunc func() (interface{}, error)) *SmartCache {
	return &SmartCache{
		keyName:     keyName,
		refreshFunc: refreshFunc,
	}
}

// Get obtiene datos de la caché, actualizándolos si es necesario
func (c *SmartCache) Get() (interface{}, error) {
	// Primero intentamos leer con un lock de lectura
	c.mutex.RLock()
	if c.data != nil && time.Now().Before(c.expiresAt) {
		// Si los datos están en caché y no han expirado
		data := c.data

		// Si estamos cerca del tiempo de actualización en segundo plano y no se está actualizando ya
		if time.Now().After(c.refreshTrigger) && !c.isRefreshing {
			c.mutex.RUnlock() // Liberamos el lock de lectura antes de adquirir el de escritura

			// Intentamos adquirir el lock de escritura para marcar que estamos actualizando
			c.mutex.Lock()
			if !c.isRefreshing { // Verificamos de nuevo por si otro goroutine ya inició la actualización
				c.isRefreshing = true
				c.mutex.Unlock()

				// Iniciamos actualización en segundo plano
				go func() {
					defer func() {
						c.mutex.Lock()
						c.isRefreshing = false
						c.mutex.Unlock()
					}()

					newData, err := c.refreshFunc()
					if err != nil {
						log.Printf("Error al actualizar caché de %s en segundo plano: %v", c.keyName, err)
						return
					}

					// Actualizar la caché con los nuevos datos
					c.mutex.Lock()
					c.data = newData
					c.expiresAt = time.Now().Add(2 * time.Minute)         // Expiración principal (reducida de 1 hora a 2 minutos)
					c.refreshTrigger = time.Now().Add(1 * time.Minute) // Trigger para actualización en segundo plano (reducido de 10 minutos a 1 minuto)
					c.mutex.Unlock()

					log.Printf("Caché de %s actualizada en segundo plano", c.keyName)
				}()
			} else {
				c.mutex.Unlock()
			}

			// Volvemos a adquirir el lock de lectura para devolver los datos actuales
			c.mutex.RLock()
		}

		data = c.data // Por si cambió durante la actualización en segundo plano
		c.mutex.RUnlock()
		return data, nil
	}

	// Si llegamos aquí, los datos no están en caché o han expirado
	c.mutex.RUnlock()

	// Adquirimos lock de escritura para actualizar
	c.mutex.Lock()
	defer c.mutex.Unlock()

	// Verificar de nuevo por si otro goroutine ya actualizó mientras esperábamos
	if c.data != nil && time.Now().Before(c.expiresAt) {
		return c.data, nil
	}

	// Marcar que estamos actualizando
	c.isRefreshing = true
	defer func() { c.isRefreshing = false }()

	// Actualizar datos
	log.Printf("Actualizando caché de %s", c.keyName)
	newData, err := c.refreshFunc()
	if err != nil {
		// Si hay error pero tenemos datos antiguos, los devolvemos con un log de advertencia
		if c.data != nil {
			log.Printf("Error al actualizar caché de %s, usando datos antiguos: %v", c.keyName, err)
			return c.data, nil
		}
		return nil, fmt.Errorf("error al obtener datos para caché de %s: %w", c.keyName, err)
	}

	// Guardar nuevos datos en caché
	c.data = newData
	c.expiresAt = time.Now().Add(2 * time.Minute)         // Expiración principal (reducida de 1 hora a 2 minutos)
	c.refreshTrigger = time.Now().Add(1 * time.Minute) // Trigger para actualización en segundo plano (reducido de 10 minutos a 1 minuto)

	log.Printf("Caché de %s actualizada, válida hasta: %v", c.keyName, c.expiresAt)
	return newData, nil
}

// Invalidate fuerza la invalidación de la caché
func (c *SmartCache) Invalidate() {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	c.data = nil
	c.expiresAt = time.Time{}
	c.refreshTrigger = time.Time{}
	log.Printf("Caché de %s invalidada", c.keyName)
}

// getAccessToken obtiene un token de acceso válido, renovándolo si es necesario
// con manejo mejorado de errores y reintentos
func getAccessToken() (string, error) {
	accessTokenCache.mutex.RLock()
	if accessTokenCache.token != "" && time.Now().Before(accessTokenCache.expiresAt) {
		// Añadir margen de seguridad (1 minuto) para evitar usar tokens a punto de expirar
		if time.Now().Add(1 * time.Minute).Before(accessTokenCache.expiresAt) {
			token := accessTokenCache.token
			accessTokenCache.mutex.RUnlock()
			return token, nil
		}
		log.Printf("Token a punto de expirar, renovando...")
	}
	accessTokenCache.mutex.RUnlock()

	// Necesitamos refrescar el token
	accessTokenCache.mutex.Lock()
	defer accessTokenCache.mutex.Unlock()

	// Verificar nuevamente por si otro goroutine ya actualizó el token
	if accessTokenCache.token != "" && time.Now().Before(accessTokenCache.expiresAt) {
		// Añadir margen de seguridad (1 minuto) para evitar usar tokens a punto de expirar
		if time.Now().Add(1 * time.Minute).Before(accessTokenCache.expiresAt) {
			return accessTokenCache.token, nil
		}
	}

	// Obtener variables de entorno
	clientID := os.Getenv("ZOHO_CLIENT_ID")
	clientSecret := os.Getenv("ZOHO_CLIENT_SECRET")
	refreshToken := os.Getenv("ZOHO_REFRESH_TOKEN")

	// Validar credenciales
	if clientID == "" {
		return "", fmt.Errorf("falta ZOHO_CLIENT_ID en variables de entorno")
	}
	if clientSecret == "" {
		return "", fmt.Errorf("falta ZOHO_CLIENT_SECRET en variables de entorno")
	}
	if refreshToken == "" {
		return "", fmt.Errorf("falta ZOHO_REFRESH_TOKEN en variables de entorno")
	}

	log.Printf("Renovando token de acceso de Zoho...")

	// Configuración de reintentos para renovación de token
	maxRetries := 3
	baseDelay := 1 * time.Second

	// Implementación de reintentos
	var tokenResp TokenResponse
	var lastErr error

	for attempt := 0; attempt < maxRetries; attempt++ {
		// Si no es el primer intento, esperar antes de reintentar
		if attempt > 0 {
			delay := time.Duration(float64(baseDelay) * math.Pow(2, float64(attempt-1)))
			log.Printf("Reintento %d de renovación de token después de %v", attempt, delay)
			time.Sleep(delay)
		}

		// Preparar solicitud para renovar token
		data := url.Values{}
		data.Set("client_id", clientID)
		data.Set("client_secret", clientSecret)
		data.Set("refresh_token", refreshToken)
		data.Set("grant_type", "refresh_token")

		// Crear cliente HTTP con timeout
		client := &http.Client{Timeout: 15 * time.Second}

		// Realizar solicitud
		resp, err := client.PostForm(ZOHO_ACCOUNTS_URL+"/oauth/v2/token", data)
		if err != nil {
			lastErr = fmt.Errorf("error de red al renovar token: %w", err)
			log.Printf("Intento %d: %v", attempt+1, lastErr)
			continue // Reintentar en caso de error de red
		}

		// Asegurar que cerramos el body
		body, err := io.ReadAll(resp.Body)
		resp.Body.Close() // Cerrar inmediatamente después de leer

		if err != nil {
			lastErr = fmt.Errorf("error al leer respuesta de renovación de token: %w", err)
			log.Printf("Intento %d: %v", attempt+1, lastErr)
			continue
		}

		// Verificar código de estado
		if resp.StatusCode != http.StatusOK {
			// Intentar extraer mensaje de error de la respuesta JSON
			var errorResponse struct {
				Error            string `json:"error"`
				ErrorDescription string `json:"error_description"`
			}

			// Intentar decodificar la respuesta de error
			json.Unmarshal(body, &errorResponse) // Ignoramos errores aquí intencionalmente

			// Construir mensaje de error detallado
			var errorMsg string
			if errorResponse.Error != "" {
				errorMsg = fmt.Sprintf("%s: %s", errorResponse.Error, errorResponse.ErrorDescription)
			} else {
				errorMsg = string(body)
			}

			lastErr = fmt.Errorf("error al renovar token (HTTP %d): %s", resp.StatusCode, errorMsg)
			log.Printf("Intento %d: %v", attempt+1, lastErr)

			// Solo reintentar en caso de errores de servidor (5xx) o rate limiting (429)
			if resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= 500 {
				continue
			}

			// Para otros errores HTTP, no reintentar
			return "", lastErr
		}

		// Decodificar respuesta exitosa
		if err := json.Unmarshal(body, &tokenResp); err != nil {
			lastErr = fmt.Errorf("error al decodificar respuesta de token: %w", err)
			log.Printf("Intento %d: %v", attempt+1, lastErr)
			continue
		}

		// Validar que la respuesta contiene un token
		if tokenResp.AccessToken == "" {
			lastErr = fmt.Errorf("respuesta de token vacía o inválida")
			log.Printf("Intento %d: %v", attempt+1, lastErr)
			continue
		}

		// Si llegamos aquí, la renovación fue exitosa
		// Guardar token en caché
		accessTokenCache.token = tokenResp.AccessToken
		accessTokenCache.expiresAt = time.Now().Add(time.Duration(tokenResp.ExpiresIn) * time.Second)

		log.Printf("Token renovado exitosamente, válido hasta: %v", accessTokenCache.expiresAt)
		return tokenResp.AccessToken, nil
	}

	// Si llegamos aquí, agotamos todos los reintentos
	return "", fmt.Errorf("error después de %d intentos de renovación de token: %v", maxRetries, lastErr)
}

// makeZohoRequest realiza una solicitud HTTP a la API de Zoho con reintentos
func makeZohoRequest(method, endpoint string, params map[string]string, body interface{}) (*http.Response, error) {
	// Configuración de reintentos
	maxRetries := 3
	baseDelay := 1 * time.Second
	maxDelay := 10 * time.Second

	// Función para crear la solicitud
	createRequest := func() (*http.Request, error) {
		// Obtener token de acceso
		token, err := getAccessToken()
		if err != nil {
			return nil, fmt.Errorf("error al obtener token de acceso: %v", err)
		}

		// Construir URL
		u, err := url.Parse(BIGIN_API_URL + endpoint)
		if err != nil {
			return nil, fmt.Errorf("error al parsear URL: %v", err)
		}

		// Agregar parámetros de consulta
		if params != nil {
			q := u.Query()
			for k, v := range params {
				q.Set(k, v)
			}
			u.RawQuery = q.Encode()
		}

		// Preparar cuerpo de la solicitud
		var reqBody io.Reader
		if body != nil {
			jsonBody, err := json.Marshal(body)
			if err != nil {
				return nil, fmt.Errorf("error al serializar JSON: %v", err)
			}
			reqBody = bytes.NewBuffer(jsonBody)
		}

		// Crear solicitud
		req, err := http.NewRequest(method, u.String(), reqBody)
		if err != nil {
			return nil, fmt.Errorf("error al crear solicitud HTTP: %v", err)
		}

		// Configurar headers
		req.Header.Set("Authorization", "Zoho-oauthtoken "+token)
		if body != nil {
			req.Header.Set("Content-Type", "application/json")
		}

		return req, nil
	}

	// Cliente HTTP con timeout
	client := &http.Client{Timeout: 60 * time.Second}

	// Implementación de reintentos con backoff exponencial
	var resp *http.Response
	var err error
	var req *http.Request

	for attempt := 0; attempt < maxRetries; attempt++ {
		// Si no es el primer intento, esperar con backoff exponencial
		if attempt > 0 {
			// Calcular tiempo de espera con jitter (variación aleatoria)
			delay := time.Duration(float64(baseDelay) * math.Pow(2, float64(attempt-1)))
			if delay > maxDelay {
				delay = maxDelay
			}
			// Añadir jitter (±20%)
			jitter := time.Duration(float64(delay) * (0.8 + 0.4*rand.Float64()))

			log.Printf("Reintento %d después de %v para %s %s", attempt, jitter, method, endpoint)
			time.Sleep(jitter)

			// Recrear la solicitud para cada reintento (por si el token expiró)
			req, err = createRequest()
			if err != nil {
				continue // Intentar de nuevo si hay error al crear la solicitud
			}
		} else {
			// Primera solicitud
			req, err = createRequest()
			if err != nil {
				return nil, err // Fallar inmediatamente si no podemos crear la solicitud inicial
			}
		}

		// Ejecutar la solicitud
		resp, err = client.Do(req)

		// Analizar el resultado para determinar si debemos reintentar
		if err != nil {
			// Error de red o timeout, reintentar
			log.Printf("Error de red en intento %d: %v", attempt+1, err)
			continue
		}

		// Verificar códigos de error que justifican reintento
		if resp.StatusCode == http.StatusTooManyRequests || // 429 Too Many Requests
			resp.StatusCode >= 500 { // Errores de servidor 5xx
			log.Printf("Recibido código %d en intento %d, reintentando...", resp.StatusCode, attempt+1)
			resp.Body.Close() // Importante cerrar el body antes de reintentar
			continue
		}

		// Si llegamos aquí, la solicitud fue exitosa o falló con un código que no justifica reintento
		return resp, nil
	}

	// Si llegamos aquí, agotamos todos los reintentos
	if err != nil {
		return nil, fmt.Errorf("error después de %d intentos: %v", maxRetries, err)
	}

	return resp, fmt.Errorf("error después de %d intentos, último código: %d", maxRetries, resp.StatusCode)
}

// fetchZohoData obtiene datos paginados de Zoho con manejo mejorado de errores
func fetchZohoData(module string, params map[string]string) (*ZohoResponse, error) {
	// Asegurar que siempre haya parámetros
	if params == nil {
		params = make(map[string]string)
	}

	// Agregar campos por defecto si no están especificados y es un endpoint de registros
	if _, hasFields := params["fields"]; !hasFields {
		// Solo agregar fields para endpoints que obtienen registros (no settings)
		if !strings.HasPrefix(module, "settings/") {
			params["fields"] = "id,Created_Time,Modified_Time"
		}
	}

	// Registrar la solicitud que se va a realizar
	log.Printf("Solicitando datos de Zoho: %s con parámetros: %v", module, params)

	resp, err := makeZohoRequest("GET", "/"+module, params, nil)
	if err != nil {
		log.Printf("Error al realizar solicitud a %s: %v", module, err)
		return nil, fmt.Errorf("error de conexión con Zoho: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Error al leer respuesta de %s: %v", module, err)
		return nil, fmt.Errorf("error al leer respuesta de Zoho: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		// Intentar extraer mensaje de error de la respuesta JSON
		var errorResponse struct {
			Code    string `json:"code"`
			Details struct {
				Message string `json:"message"`
			} `json:"details"`
			Message string `json:"message"`
		}

		// Intentar decodificar la respuesta de error
		json.Unmarshal(body, &errorResponse) // Ignoramos errores aquí intencionalmente

		// Construir mensaje de error detallado
		var errorMsg string
		if errorResponse.Message != "" {
			errorMsg = fmt.Sprintf("Código: %s, Mensaje: %s", errorResponse.Code, errorResponse.Message)
		} else if errorResponse.Details.Message != "" {
			errorMsg = fmt.Sprintf("Mensaje: %s", errorResponse.Details.Message)
		} else {
			errorMsg = string(body)
		}

		log.Printf("Error en API Zoho (%s) - Código HTTP: %d - %s", module, resp.StatusCode, errorMsg)
		return nil, fmt.Errorf("error en la API de Zoho (HTTP %d): %s", resp.StatusCode, errorMsg)
	}

	var zohoResp ZohoResponse
	err = json.Unmarshal(body, &zohoResp)
	if err != nil {
		log.Printf("Error al decodificar respuesta JSON de %s: %v", module, err)
		return nil, fmt.Errorf("error al procesar respuesta de Zoho: %w", err)
	}

	log.Printf("Datos recibidos correctamente de %s", module)
	return &zohoResp, nil
}
