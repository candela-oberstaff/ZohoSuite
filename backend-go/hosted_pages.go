package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// OpportunityData estructura para almacenar los datos de la oportunidad
type OpportunityData struct {
	DealName     string `json:"Deal_Name"`
	AccountName  string `json:"Account_Name"`
	ContactID    string `json:"Contact_ID"`
	ContactName  string `json:"Contact_Name"`
	ContactEmail string `json:"Contact_Email"`
}

// createCustomerFromOpportunity crea un cliente en Zoho Billing a partir de una oportunidad
// y devuelve el ID del cliente creado
func createCustomerFromOpportunity(c *gin.Context) {
	// Obtener el ID de la oportunidad
	opportunityID := c.Param("id")
	if opportunityID == "" {
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "ID de oportunidad no proporcionado",
		})
		return
	}

	// Obtener los datos de la oportunidad
	opportunityData, err := fetchOpportunityData(opportunityID)
	if err != nil {
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al obtener datos de la oportunidad: " + err.Error(),
		})
		return
	}

	// Verificar si la oportunidad tiene un contacto asociado
	if opportunityData.ContactID == "" {
		// En lugar de devolver un error, registramos una advertencia y continuamos
		log.Printf("Advertencia: La oportunidad %s no tiene un contacto asociado, pero intentaremos crear el cliente de todos modos", opportunityID)
		// No retornamos, continuamos con el proceso
	}

	// Obtener datos adicionales del contacto si es necesario
	contactData, err := fetchContactData(opportunityData.ContactID)
	if err != nil {
		log.Printf("Error al obtener datos del contacto: %v", err)
		// Continuamos con los datos que tenemos de la oportunidad
	}

	// Crear el cliente en Zoho Billing
	customerID, err := createCustomerInZohoBilling(opportunityData, contactData)
	if err != nil {
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al crear cliente en Zoho Billing: " + err.Error(),
		})
		return
	}

	// Devolver el ID del cliente creado
	c.JSON(200, ApiResponse{
		Success: true,
		Data: map[string]string{
			"customer_id": customerID,
			"message":     "Cliente creado exitosamente en Zoho Billing",
		},
	})
}

// generatePaymentMethodUpdateLink genera un enlace para actualizar el método de pago
// de un cliente específico en Zoho Billing
func generatePaymentMethodUpdateLink(c *gin.Context) {
	// Obtener el ID del cliente
	customerID := c.Param("id")
	if customerID == "" {
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "ID de cliente no proporcionado",
		})
		return
	}

	// Verificar que el cliente existe
	customerResponse, err := fetchZohoBillingData(fmt.Sprintf("customers/%s", customerID), nil)
	if err != nil {
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al verificar cliente: " + err.Error(),
		})
		return
	}

	// Decodificar la respuesta para obtener los datos del cliente
	var customerData struct {
		Customer Customer `json:"customer"`
	}
	if err := json.Unmarshal(customerResponse, &customerData); err != nil {
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al procesar datos del cliente: " + err.Error(),
		})
		return
	}

	// Generar el enlace de actualización de método de pago
	paymentLink, err := generatePaymentLink(customerID)
	if err != nil {
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al generar enlace de pago: " + err.Error(),
		})
		return
	}

	// Enviar el enlace por correo electrónico al cliente
	if customerData.Customer.Email != "" {
		// Enviar correo solo al cliente específico que se está procesando
		err = SendPaymentLinkEmail(
			customerData.Customer.Email,
			"Actualización de método de pago - Geekers Team",
			customerData.Customer.DisplayName,
			paymentLink,
		)
		if err != nil {
			log.Printf("Error al enviar correo: %v", err)
			// Continuamos aunque haya error en el envío del correo
		}
	}

	// Calcular la fecha de expiración (24 horas desde ahora)
	expiresAt := time.Now().Add(24 * time.Hour).Format(time.RFC3339)

	// Devolver el enlace generado
	c.JSON(200, ApiResponse{
		Success: true,
		Data: map[string]string{
			"url":        paymentLink,
			"expires_at": expiresAt,
		},
	})
}

// fetchOpportunityData obtiene los datos de una oportunidad desde Zoho Bigin
func fetchOpportunityData(opportunityID string) (OpportunityData, error) {
	var opportunityData OpportunityData

	// Obtener datos de la oportunidad desde Zoho Bigin con todos los campos necesarios
	params := map[string]string{
		"fields": "id,Deal_Name,Account_Name,Contact_Name,Contacto_Principal,Primary_Contact,Contact_Id,Contact_Email,Email,Created_Time,Modified_Time",
	}
	log.Printf("Solicitando datos de la oportunidad %s con parámetros: %v", opportunityID, params)
	response, err := fetchZohoData(fmt.Sprintf("Pipelines/%s", opportunityID), params)
	if err != nil {
		return opportunityData, err
	}

	// Verificar si hay datos en la respuesta
	if response == nil || response.Data == nil || len(response.Data) == 0 {
		return opportunityData, fmt.Errorf("no se encontraron datos para la oportunidad %s", opportunityID)
	}

	// Extraer los datos de la oportunidad
	opportunityMap, ok := response.Data[0].(map[string]interface{})
	if !ok {
		return opportunityData, fmt.Errorf("formato de datos de oportunidad inválido")
	}
	
	// Imprimir la estructura completa para depuración
	opportunityJSON, _ := json.MarshalIndent(opportunityMap, "", "  ")
	log.Printf("Estructura completa de la oportunidad %s: %s", opportunityID, string(opportunityJSON))

	// Asignar los valores a la estructura
	if dealName, ok := opportunityMap["Deal_Name"].(string); ok {
		opportunityData.DealName = dealName
	}

	if accountName, ok := opportunityMap["Account_Name"].(string); ok {
		opportunityData.AccountName = accountName
	}

	// Obtener el ID del contacto asociado
	if contactNameData, ok := opportunityMap["Contact_Name"].(map[string]interface{}); ok && contactNameData != nil {
		// Ahora que sabemos que Contact_Name es un mapa y no es nil, podemos acceder a sus propiedades
		if contactID, ok := contactNameData["id"].(string); ok {
			opportunityData.ContactID = contactID
		}
		
		// Obtener el nombre del contacto si está disponible
		if contactName, ok := contactNameData["name"].(string); ok {
			opportunityData.ContactName = contactName
		}
		
		// Obtener el email del contacto si está disponible en el objeto Contact_Name
		if contactEmail, ok := contactNameData["email"].(string); ok && contactEmail != "" {
			opportunityData.ContactEmail = contactEmail
			log.Printf("Email del contacto encontrado en Contact_Name: %s", contactEmail)
		}
	} else {
		// Si no hay Contact_Name o no es un mapa, registrar esta información
		log.Printf("Advertencia: La oportunidad %s no tiene un contacto asociado en Contact_Name o el formato es inválido", opportunityID)
		
		// Intentar obtener el contacto de otras maneras posibles
		// Verificar Contact_Id
		if contactID, ok := opportunityMap["Contact_Id"].(string); ok && contactID != "" {
			opportunityData.ContactID = contactID
			log.Printf("Se encontró ID de contacto alternativo en Contact_Id: %s", contactID)
		}
		
		// Verificar si hay un email directamente en la oportunidad
		if contactEmail, ok := opportunityMap["Contact_Email"].(string); ok && contactEmail != "" {
			opportunityData.ContactEmail = contactEmail
			log.Printf("Se encontró email de contacto en Contact_Email: %s", contactEmail)
		}
		
		// Verificar si hay un campo Email genérico
		if email, ok := opportunityMap["Email"].(string); ok && email != "" {
			opportunityData.ContactEmail = email
			log.Printf("Se encontró email genérico en Email: %s", email)
		}
		
		// Verificar Contacto_Principal
		if contactPrincipal, ok := opportunityMap["Contacto_Principal"].(map[string]interface{}); ok && contactPrincipal != nil {
			if contactID, ok := contactPrincipal["id"].(string); ok && contactID != "" {
				opportunityData.ContactID = contactID
				log.Printf("Se encontró ID de contacto alternativo en Contacto_Principal: %s", contactID)
			}
			if contactName, ok := contactPrincipal["name"].(string); ok && contactName != "" {
				opportunityData.ContactName = contactName
				log.Printf("Se encontró nombre de contacto alternativo en Contacto_Principal: %s", contactName)
			}
		}
		
		// Verificar Primary_Contact
		if primaryContact, ok := opportunityMap["Primary_Contact"].(map[string]interface{}); ok && primaryContact != nil {
			if contactID, ok := primaryContact["id"].(string); ok && contactID != "" {
				opportunityData.ContactID = contactID
				log.Printf("Se encontró ID de contacto alternativo en Primary_Contact: %s", contactID)
			}
			if contactName, ok := primaryContact["name"].(string); ok && contactName != "" {
				opportunityData.ContactName = contactName
				log.Printf("Se encontró nombre de contacto alternativo en Primary_Contact: %s", contactName)
			}
		}
	}

	return opportunityData, nil
}

// fetchContactData obtiene los datos de un contacto desde Zoho Bigin
func fetchContactData(contactID string) (map[string]interface{}, error) {
	// Obtener datos del contacto desde Zoho Bigin con campos específicos incluyendo el email
	params := map[string]string{
		"fields": "id,First_Name,Last_Name,Email,Phone,Mobile,Created_Time,Modified_Time",
	}
	log.Printf("Solicitando datos del contacto %s con parámetros: %v", contactID, params)
	response, err := fetchZohoData(fmt.Sprintf("Contacts/%s", contactID), params)
	if err != nil {
		log.Printf("Error al obtener datos del contacto %s: %v", contactID, err)
		return nil, err
	}

	// Verificar si hay datos en la respuesta
	if response == nil || response.Data == nil || len(response.Data) == 0 {
		log.Printf("No se encontraron datos para el contacto %s", contactID)
		return nil, fmt.Errorf("no se encontraron datos para el contacto %s", contactID)
	}

	// Extraer los datos del contacto
	contactMap, ok := response.Data[0].(map[string]interface{})
	if !ok {
		log.Printf("Formato de datos de contacto inválido para %s", contactID)
		return nil, fmt.Errorf("formato de datos de contacto inválido")
	}

	// Registrar los datos del contacto para depuración
	contactJSON, _ := json.MarshalIndent(contactMap, "", "  ")
	log.Printf("Datos del contacto %s: %s", contactID, string(contactJSON))

	// Verificar si el email está presente
	if email, exists := contactMap["Email"]; !exists || email == nil || email == "" {
		log.Printf("ADVERTENCIA: El contacto %s no tiene email o es vacío", contactID)
	}

	return contactMap, nil
}

// createCustomerInZohoBilling crea un cliente en Zoho Billing a partir de los datos de la oportunidad y el contacto
func createCustomerInZohoBilling(opportunityData OpportunityData, contactData map[string]interface{}) (string, error) {
	// Determinar el nombre a mostrar para el cliente
	displayName := opportunityData.AccountName
	
	// Si AccountName es vacío, usar el nombre del contacto o el nombre de la oportunidad
	if displayName == "" {
		if opportunityData.ContactName != "" {
			displayName = opportunityData.ContactName
		} else if opportunityData.DealName != "" {
			displayName = opportunityData.DealName
		} else {
			// Si no hay ningún nombre disponible, usar un valor predeterminado
			displayName = "Cliente sin nombre"
		}
	}
	
	// Preparar los datos del cliente
	customerCreate := CustomerCreate{
		DisplayName: displayName,
		CompanyName: opportunityData.AccountName,
	}

	// Si ya tenemos un email de la oportunidad, usarlo
	if opportunityData.ContactEmail != "" {
		customerCreate.Email = opportunityData.ContactEmail
		log.Printf("Usando email obtenido de la oportunidad: %s", opportunityData.ContactEmail)
	}

	// Si tenemos datos del contacto, los usamos
	if contactData != nil {
		// Obtener el nombre del contacto
		if firstName, ok := contactData["First_Name"].(string); ok {
			customerCreate.FirstName = firstName
		}

		if lastName, ok := contactData["Last_Name"].(string); ok {
			customerCreate.LastName = lastName
		}

		// Obtener el correo electrónico del contacto si no lo tenemos ya
		if customerCreate.Email == "" {
			if email, ok := contactData["Email"].(string); ok && email != "" {
				customerCreate.Email = email
				opportunityData.ContactEmail = email // Guardar el email para uso posterior
				log.Printf("Usando email obtenido del contacto: %s", email)
			}
		}

		// Obtener el teléfono del contacto
		if phone, ok := contactData["Phone"].(string); ok {
			customerCreate.Phone = phone
		}

		// Obtener el móvil del contacto
		if mobile, ok := contactData["Mobile"].(string); ok {
			customerCreate.Mobile = mobile
		}
	}

	// Si no tenemos nombre completo del contacto pero tenemos el nombre de la oportunidad
	if customerCreate.FirstName == "" && opportunityData.ContactName != "" {
		// Dividir el nombre completo en nombre y apellido
		nameParts := strings.Split(opportunityData.ContactName, " ")
		if len(nameParts) > 0 {
			customerCreate.FirstName = nameParts[0]
			if len(nameParts) > 1 {
				customerCreate.LastName = strings.Join(nameParts[1:], " ")
			}
		}
	}

	// Registrar los datos que se van a enviar para depuración
	log.Printf("Creando cliente en Zoho Billing con datos: DisplayName=%s, FirstName=%s, LastName=%s, Email=%s, CompanyName=%s",
		customerCreate.DisplayName, customerCreate.FirstName, customerCreate.LastName, customerCreate.Email, customerCreate.CompanyName)

	// Crear el cliente en Zoho Billing
	response, err := makeZohoBillingRequest(http.MethodPost, "/customers", nil, customerCreate)
	if err != nil {
		return "", fmt.Errorf("error al crear cliente en Zoho Billing: %v", err)
	}
	defer response.Body.Close()

	// Leer el cuerpo de la respuesta
	responseBody, err := io.ReadAll(response.Body)
	if err != nil {
		return "", fmt.Errorf("error al leer respuesta de Zoho Billing: %v", err)
	}

	// Procesar la respuesta
	var customerResponse CustomerResponse
	if err := json.Unmarshal(responseBody, &customerResponse); err != nil {
		// Registrar el cuerpo de la respuesta para depuración
		log.Printf("Error al procesar respuesta de Zoho Billing. Cuerpo de la respuesta: %s", string(responseBody))
		return "", fmt.Errorf("error al procesar respuesta de Zoho Billing: %v", err)
	}

	// Verificar si la creación fue exitosa
	if customerResponse.Code != 0 {
		// Registrar información detallada del error
		log.Printf("Error en la API de Zoho Billing. Código: %d, Mensaje: %s, Cuerpo completo: %s", 
			customerResponse.Code, customerResponse.Message, string(responseBody))
		return "", fmt.Errorf("error en la API de Zoho Billing: %s", customerResponse.Message)
	}

	// Verificar si se creó el cliente
	if customerResponse.Customer.CustomerID == "" {
		return "", fmt.Errorf("no se pudo obtener el ID del cliente creado")
	}

	return customerResponse.Customer.CustomerID, nil
}

// generatePaymentLink genera un enlace para actualizar el método de pago de un cliente
func generatePaymentLink(customerID string) (string, error) {
	// Preparar datos para la solicitud
	// Siguiendo el formato del ejemplo en Python que funciona correctamente
	paymentLinkData := map[string]interface{}{
		"customer_id": customerID,
		// No incluimos payment_options para usar los valores predeterminados
		// No incluimos expire_by para usar el valor predeterminado
	}

	// Registrar los datos que se enviarán para depuración
	payloadJSON, _ := json.Marshal(paymentLinkData)
	log.Printf("Enviando datos para generar enlace de pago: %s", string(payloadJSON))

	// Hacer la solicitud a Zoho Billing - Aseguramos que el endpoint tenga el slash inicial
	// Usamos el endpoint addpaymentmethod como en el ejemplo de Python
	response, err := makeZohoBillingRequest(http.MethodPost, "/hostedpages/addpaymentmethod", nil, paymentLinkData)
	if err != nil {
		return "", fmt.Errorf("error al generar enlace de pago en Zoho Billing: %v", err)
	}
	defer response.Body.Close()

	// Leer el cuerpo de la respuesta
	responseBody, err := io.ReadAll(response.Body)
	if err != nil {
		return "", fmt.Errorf("error al leer respuesta de Zoho Billing: %v", err)
	}

	// Registrar la respuesta para depuración
	log.Printf("Respuesta de Zoho Billing para enlace de pago: %s", string(responseBody))

	// Procesar la respuesta
	var paymentLinkResponse struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		HostedPage struct {
			URL string `json:"url"`
			HostedPageID string `json:"hostedpage_id"`
			ExpiringTime string `json:"expiring_time"`
		} `json:"hostedpage"`
	}

	if err := json.Unmarshal(responseBody, &paymentLinkResponse); err != nil {
		return "", fmt.Errorf("error al procesar respuesta del enlace de pago: %v, respuesta: %s", err, string(responseBody))
	}

	// Verificar si la generación fue exitosa
	if paymentLinkResponse.Code != 0 {
		return "", fmt.Errorf("error en la API de Zoho Billing: %s, respuesta completa: %s", paymentLinkResponse.Message, string(responseBody))
	}

	// Verificar si se generó el enlace
	if paymentLinkResponse.HostedPage.URL == "" {
		return "", fmt.Errorf("no se pudo obtener el enlace de pago, respuesta: %s", string(responseBody))
	}

	return paymentLinkResponse.HostedPage.URL, nil
}