package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

// getCompanyOpportunitiesHandler obtiene las oportunidades asociadas a una empresa específica (handler para Gin)
func getCompanyOpportunitiesHandler(c *gin.Context) {
	companyID := c.Param("id")
	if companyID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID de empresa no proporcionado"})
		return
	}

	log.Printf("Obteniendo oportunidades para la empresa con ID: %s", companyID)

	// Parámetros para la solicitud
	params := map[string]string{
		"fields":       "Deal_Name,Stage,Amount,Account_Name,Closing_Date,id,Created_Time,Modified_Time,Pipeline,Contact_Name",
		"Account_Name": companyID,
	}

	// Hacer la solicitud a la API de Zoho Bigin
	resp, err := makeZohoRequest("GET", "/Pipelines", params, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error al obtener oportunidades: %v", err)})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error al leer la respuesta: %v", err)})
		return
	}

	if resp.StatusCode != http.StatusOK {
		c.JSON(resp.StatusCode, gin.H{"error": fmt.Sprintf("Error al obtener oportunidades (código %d): %s", resp.StatusCode, string(body))})
		return
	}

	// Decodificar la respuesta
	var opportunitiesResp struct {
		Data []map[string]interface{} `json:"data"`
	}

	if err := json.Unmarshal(body, &opportunitiesResp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error al decodificar la respuesta: %v", err)})
		return
	}

	// Convertir los mapas a objetos Opportunity
	opportunities := make([]Opportunity, 0, len(opportunitiesResp.Data))
	for _, opportunityData := range opportunitiesResp.Data {
		opportunity := Opportunity{
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

		// Extraer información de la pipeline
		if pipeline, ok := opportunityData["Pipeline"].(map[string]interface{}); ok {
			// La estructura Opportunity tiene un campo Pipeline que es un mapa
			opportunity.Pipeline = pipeline
		}

		// Extraer información de la empresa
	if accountName, ok := opportunityData["Account_Name"].(map[string]interface{}); ok {
		if name, ok := accountName["name"].(string); ok {
			// La estructura Opportunity tiene AccountName como string
			opportunity.AccountName = name
		} else if id, ok := accountName["id"].(string); ok {
			// Si no hay nombre, usar el ID
			opportunity.AccountName = id
		}
	} else {
		// Si no hay información de empresa, usar el ID de la empresa actual
		opportunity.AccountName = companyID
	}

		// La estructura Opportunity no tiene campo ContactName, así que no procesamos esta información

		opportunities = append(opportunities, opportunity)
	}

	c.JSON(http.StatusOK, opportunities)
}