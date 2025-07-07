package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
)

// getOpportunityByIDFunc obtiene una oportunidad específica por su ID (versión para uso en funciones)
func getOpportunityByIDFunc(id string) (*Opportunity, error) {
	if id == "" {
		return nil, fmt.Errorf("ID de oportunidad no proporcionado")
	}

	log.Printf("Obteniendo oportunidad con ID: %s", id)

	// Parámetros para la solicitud
	params := map[string]string{
		"fields": "Deal_Name,Stage,Amount,Account_Name,Closing_Date,id,Created_Time,Modified_Time,Pipeline,Contact_Name,Contact_Email",
	}

	// Hacer la solicitud a la API de Zoho Bigin
	resp, err := makeZohoRequest("GET", "/Pipelines/"+id, params, nil)
	if err != nil {
		return nil, fmt.Errorf("error al obtener la oportunidad: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error al leer la respuesta: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("error al obtener la oportunidad (código %d): %s", resp.StatusCode, string(body))
	}

	// Decodificar la respuesta
	var opportunityResp struct {
		Data []map[string]interface{} `json:"data"`
	}

	if err := json.Unmarshal(body, &opportunityResp); err != nil {
		return nil, fmt.Errorf("error al decodificar la respuesta: %v", err)
	}

	if len(opportunityResp.Data) == 0 {
		return nil, fmt.Errorf("oportunidad no encontrada")
	}

	// Convertir el mapa a un objeto Opportunity
	opportunityData := opportunityResp.Data[0]
	opportunity := &Opportunity{
		ID: fmt.Sprintf("%v", opportunityData["id"]),
	}

	if dealName, ok := opportunityData["Deal_Name"].(string); ok {
		opportunity.DealName = dealName
	}

	if stage, ok := opportunityData["Stage"].(string); ok {
		opportunity.Stage = stage
	}

	if amount, ok := opportunityData["Amount"].(float64); ok {
		opportunity.Amount = amount
	}

	if closingDate, ok := opportunityData["Closing_Date"].(string); ok {
		opportunity.ClosingDate = closingDate
	}

	if pipeline, ok := opportunityData["Pipeline"].(map[string]interface{}); ok {
		// La estructura Opportunity tiene un campo Pipeline que es un mapa
		opportunity.Pipeline = pipeline
	}

	// Obtener información de la empresa si está disponible
	if accountName, ok := opportunityData["Account_Name"].(map[string]interface{}); ok {
		if name, ok := accountName["name"].(string); ok {
			// La estructura Opportunity tiene AccountName como string
			opportunity.AccountName = name
		} else if id, ok := accountName["id"].(string); ok {
			// Si no hay nombre, usar el ID
			opportunity.AccountName = id
		}
	}

	// La estructura Opportunity no tiene campos ContactName ni ContactEmail, así que no procesamos esta información

	return opportunity, nil
}

// splitName divide un nombre completo en nombre y apellido
func splitName(fullName string) []string {
	parts := make([]string, 2)
	nameParts := splitBySpace(fullName)

	if len(nameParts) == 1 {
		parts[0] = nameParts[0]
		parts[1] = ""
	} else if len(nameParts) == 2 {
		parts[0] = nameParts[0]
		parts[1] = nameParts[1]
	} else {
		parts[0] = nameParts[0]
		parts[1] = joinStrings(nameParts[1:], " ")
	}

	return parts
}

// splitBySpace divide una cadena por espacios
func splitBySpace(s string) []string {
	var result []string
	for _, part := range split(s, ' ') {
		if part != "" {
			result = append(result, part)
		}
	}
	return result
}

// split divide una cadena por un separador
func split(s string, sep rune) []string {
	var result []string
	var current string

	for _, c := range s {
		if c == sep {
			result = append(result, current)
			current = ""
		} else {
			current += string(c)
		}
	}

	if current != "" {
		result = append(result, current)
	}

	return result
}

// joinStrings une una lista de cadenas con un separador
func joinStrings(parts []string, sep string) string {
	if len(parts) == 0 {
		return ""
	}

	result := parts[0]
	for i := 1; i < len(parts); i++ {
		result += sep + parts[i]
	}

	return result
}