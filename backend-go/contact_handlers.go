package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
)

// searchContactsByEmailHandler busca contactos por dirección de email (handler para Gin)
func searchContactsByEmailHandler(c *gin.Context) {
	email := c.Query("email")
	if email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email no proporcionado"})
		return
	}

	// Parámetros para la búsqueda
	params := map[string]string{
		"fields":   "First_Name,Last_Name,Email,Phone,id,Created_Time,Modified_Time",
		"criteria": fmt.Sprintf("(Email:equals:%s)", email),
	}

	response, err := fetchZohoData("Contacts", params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error al buscar contactos: %v", err)})
		return
	}

	if response == nil || response.Data == nil {
		c.JSON(http.StatusOK, []Contact{})
		return
	}

	// Convertir los datos a objetos Contact
	var contacts []Contact
	for _, item := range response.Data {
		if contactMap, ok := item.(map[string]interface{}); ok {
			contact := Contact{
				ID: fmt.Sprintf("%v", contactMap["id"]),
			}

			if firstName, ok := contactMap["First_Name"].(string); ok {
				contact.FirstName = firstName
			}

			if lastName, ok := contactMap["Last_Name"].(string); ok {
				contact.LastName = lastName
			}

			if email, ok := contactMap["Email"].(string); ok {
				contact.Email = email
			}

			if phone, ok := contactMap["Phone"].(string); ok {
				contact.Phone = phone
			}

			contacts = append(contacts, contact)
		}
	}

	c.JSON(http.StatusOK, contacts)
}

// createContactHandler crea un nuevo contacto en Zoho Bigin (handler para Gin)
func createContactHandler(c *gin.Context) {
	var contact Contact
	if err := c.ShouldBindJSON(&contact); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos de contacto inválidos"})
		return
	}
	// Preparar los datos para la creación
	contactData := map[string]interface{}{
		"First_Name": contact.FirstName,
		"Last_Name":  contact.LastName,
		"Email":      contact.Email,
		"Phone":      contact.Phone,
	}

	// La estructura Contact no tiene campo CompanyID, así que no podemos asociar una empresa

	// Convertir a JSON
	jsonData, err := json.Marshal(map[string]interface{}{
		"data": []interface{}{contactData},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error al serializar datos de contacto: %v", err)})
		return
	}

	// Hacer la solicitud a la API de Zoho
	resp, err := makeZohoRequest("POST", "/Contacts", nil, bytes.NewBuffer(jsonData))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error al crear contacto: %v", err)})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error al leer respuesta: %v", err)})
		return
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error al crear contacto (código %d): %s", resp.StatusCode, string(body))})
		return
	}

	// Decodificar la respuesta
	var contactResp struct {
		Data []struct {
			Details struct {
				ID string `json:"id"`
			} `json:"details"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &contactResp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error al decodificar respuesta: %v", err)})
		return
	}

	if len(contactResp.Data) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "No se recibió ID de contacto en la respuesta"})
		return
	}

	// Actualizar el ID del contacto con el recibido
	contact.ID = contactResp.Data[0].Details.ID

	c.JSON(http.StatusCreated, contact)
}

// getContactByIDFunc obtiene un contacto específico por ID (versión para uso en funciones)
func getContactByIDFunc(contactID string) (*Contact, error) {
	if contactID == "" {
		return nil, fmt.Errorf("ID de contacto no proporcionado")
	}

	// Parámetros para la solicitud
	params := map[string]string{
		"fields": "First_Name,Last_Name,Email,Phone,id,Created_Time,Modified_Time",
	}

	response, err := fetchZohoData("Contacts/"+contactID, params)
	if err != nil {
		return nil, fmt.Errorf("error al obtener contacto: %v", err)
	}

	if response == nil || response.Data == nil || len(response.Data) == 0 {
		return nil, fmt.Errorf("contacto no encontrado")
	}

	// Convertir los datos a un objeto Contact
	contactMap, ok := response.Data[0].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("formato de datos inesperado")
	}

	contact := Contact{
		ID: fmt.Sprintf("%v", contactMap["id"]),
	}

	if firstName, ok := contactMap["First_Name"].(string); ok {
		contact.FirstName = firstName
	}

	if lastName, ok := contactMap["Last_Name"].(string); ok {
		contact.LastName = lastName
	}

	if email, ok := contactMap["Email"].(string); ok {
		contact.Email = email
	}

	if phone, ok := contactMap["Phone"].(string); ok {
		contact.Phone = phone
	}

	return &contact, nil
}

// searchContactsByEmailFunc busca contactos por dirección de email (versión para uso en funciones)
func searchContactsByEmailFunc(email string) ([]Contact, error) {
	if email == "" {
		return nil, fmt.Errorf("email no proporcionado")
	}

	// Parámetros para la búsqueda
	params := map[string]string{
		"fields":   "First_Name,Last_Name,Email,Phone,id,Created_Time,Modified_Time",
		"criteria": fmt.Sprintf("(Email:equals:%s)", email),
	}

	response, err := fetchZohoData("Contacts", params)
	if err != nil {
		return nil, fmt.Errorf("error al buscar contactos: %v", err)
	}

	if response == nil || response.Data == nil {
		return []Contact{}, nil
	}

	// Convertir los datos a objetos Contact
	var contacts []Contact
	for _, item := range response.Data {
		if contactMap, ok := item.(map[string]interface{}); ok {
			contact := Contact{
				ID: fmt.Sprintf("%v", contactMap["id"]),
			}

			if firstName, ok := contactMap["First_Name"].(string); ok {
				contact.FirstName = firstName
			}

			if lastName, ok := contactMap["Last_Name"].(string); ok {
				contact.LastName = lastName
			}

			if email, ok := contactMap["Email"].(string); ok {
				contact.Email = email
			}

			if phone, ok := contactMap["Phone"].(string); ok {
				contact.Phone = phone
			}

			contacts = append(contacts, contact)
		}
	}

	return contacts, nil
}

// createContactFunc crea un nuevo contacto en Zoho Bigin (versión para uso en funciones)
func createContactFunc(contact Contact) (*Contact, error) {
	// Preparar los datos para la creación
	contactData := map[string]interface{}{
		"First_Name": contact.FirstName,
		"Last_Name":  contact.LastName,
		"Email":      contact.Email,
		"Phone":      contact.Phone,
	}

	// Convertir a JSON
	jsonData, err := json.Marshal(map[string]interface{}{
		"data": []interface{}{contactData},
	})
	if err != nil {
		return nil, fmt.Errorf("error al serializar datos de contacto: %v", err)
	}

	// Hacer la solicitud a la API de Zoho
	resp, err := makeZohoRequest("POST", "/Contacts", nil, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("error al crear contacto: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error al leer respuesta: %v", err)
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("error al crear contacto (código %d): %s", resp.StatusCode, string(body))
	}

	// Decodificar la respuesta
	var contactResp struct {
		Data []struct {
			Details struct {
				ID string `json:"id"`
			} `json:"details"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &contactResp); err != nil {
		return nil, fmt.Errorf("error al decodificar respuesta: %v", err)
	}

	if len(contactResp.Data) == 0 {
		return nil, fmt.Errorf("no se recibió ID de contacto en la respuesta")
	}

	// Actualizar el ID del contacto con el recibido
	contact.ID = contactResp.Data[0].Details.ID

	return &contact, nil
}