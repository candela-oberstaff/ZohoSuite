package main

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

// debugGetCompanyOpportunities obtiene las oportunidades asociadas a una empresa específica (versión de depuración)
func debugGetCompanyOpportunities(c *gin.Context) {
	companyID := c.Param("id")
	if companyID == "" {
		c.JSON(http.StatusBadRequest, ApiResponse{
			Success: false,
			Error:   "ID de empresa requerido",
		})
		return
	}

	// Obtener el nombre de la empresa para la búsqueda
	companyResp, err := fetchZohoData("Accounts/"+companyID, nil)
	if err != nil || companyResp == nil || companyResp.Data == nil || len(companyResp.Data) == 0 {
		c.JSON(http.StatusNotFound, ApiResponse{
			Success: false,
			Error:   "Empresa no encontrada",
		})
		return
	}

	companyName := ""
	if company, ok := companyResp.Data[0].(map[string]interface{}); ok {
		if name, ok := company["Account_Name"].(string); ok {
			companyName = name
		}
	}

	if companyName == "" {
		c.JSON(http.StatusInternalServerError, ApiResponse{
			Success: false,
			Error:   "No se pudo obtener el nombre de la empresa",
		})
		return
	}

	// Buscar oportunidades por nombre de empresa
	params := map[string]string{
		"fields":   "Deal_Name,Stage,Amount,Account_Name,Closing_Date,id,Created_Time,Modified_Time,Pipeline",
		"criteria": fmt.Sprintf("(Account_Name.id:equals:%s)", companyID),
	}

	response, err := fetchZohoData("Pipelines", params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ApiResponse{
			Success: false,
			Error:   "Error al obtener oportunidades: " + err.Error(),
		})
		return
	}

	if response == nil || response.Data == nil {
		c.JSON(http.StatusOK, ApiResponse{
			Success: true,
			Data:    []interface{}{},
			Message: "No se encontraron oportunidades para esta empresa",
		})
		return
	}

	c.JSON(http.StatusOK, ApiResponse{
		Success: true,
		Data:    response.Data,
		Message: fmt.Sprintf("Se encontraron %d oportunidades para la empresa %s", len(response.Data), companyName),
	})
}

// debugOpportunities muestra oportunidades para una empresa específica (función de depuración)
func debugOpportunities(c *gin.Context) {
	companyName := c.Param("companyName")
	if companyName == "" {
		c.JSON(http.StatusBadRequest, ApiResponse{
			Success: false,
			Error:   "Nombre de empresa requerido",
		})
		return
	}

	// Buscar oportunidades por nombre de empresa
	params := map[string]string{
		"fields":   "Deal_Name,Stage,Amount,Account_Name,Closing_Date,id,Created_Time,Modified_Time,Pipeline",
		"criteria": fmt.Sprintf("(Account_Name:contains:%s)", companyName),
	}

	response, err := fetchZohoData("Pipelines", params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ApiResponse{
			Success: false,
			Error:   "Error al obtener oportunidades: " + err.Error(),
		})
		return
	}

	if response == nil || response.Data == nil {
		c.JSON(http.StatusOK, ApiResponse{
			Success: true,
			Data:    []interface{}{},
			Message: "No se encontraron oportunidades para esta empresa",
		})
		return
	}

	c.JSON(http.StatusOK, ApiResponse{
		Success: true,
		Data:    response.Data,
		Message: fmt.Sprintf("Se encontraron %d oportunidades para la empresa %s", len(response.Data), companyName),
	})
}

// debugAllOpportunities muestra todas las oportunidades (función de depuración)
func debugAllOpportunities(c *gin.Context) {
	// Buscar todas las oportunidades
	params := map[string]string{
		"fields": "Deal_Name,Stage,Amount,Account_Name,Closing_Date,id,Created_Time,Modified_Time,Pipeline",
	}

	response, err := fetchZohoData("Pipelines", params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ApiResponse{
			Success: false,
			Error:   "Error al obtener oportunidades: " + err.Error(),
		})
		return
	}

	if response == nil || response.Data == nil {
		c.JSON(http.StatusOK, ApiResponse{
			Success: true,
			Data:    []interface{}{},
			Message: "No se encontraron oportunidades",
		})
		return
	}

	c.JSON(http.StatusOK, ApiResponse{
		Success: true,
		Data:    response.Data,
		Message: fmt.Sprintf("Se encontraron %d oportunidades", len(response.Data)),
	})
}

// debugTestDeals muestra información de prueba para deals (función de depuración)
func debugTestDeals(c *gin.Context) {
	// Datos de prueba para deals
	testDeals := []map[string]interface{}{
		{
			"id":         "test_deal_1",
			"Deal_Name":  "Deal de prueba 1",
			"Stage":      "Qualification",
			"Amount":     10000,
			"Created_At": "2023-01-01",
		},
		{
			"id":         "test_deal_2",
			"Deal_Name":  "Deal de prueba 2",
			"Stage":      "Needs Analysis",
			"Amount":     20000,
			"Created_At": "2023-01-02",
		},
		{
			"id":         "test_deal_3",
			"Deal_Name":  "Deal de prueba 3",
			"Stage":      "Proposal",
			"Amount":     30000,
			"Created_At": "2023-01-03",
		},
	}

	c.JSON(http.StatusOK, ApiResponse{
		Success: true,
		Data:    testDeals,
		Message: "Datos de prueba para deals",
	})
}

// debugTestContacts muestra información de prueba para contactos (función de depuración)
func debugTestContacts(c *gin.Context) {
	// Datos de prueba para contactos
	testContacts := []map[string]interface{}{
		{
			"id":         "test_contact_1",
			"First_Name": "Juan",
			"Last_Name":  "Pérez",
			"Email":      "juan.perez@example.com",
			"Phone":      "123456789",
			"Created_At": "2023-01-01",
		},
		{
			"id":         "test_contact_2",
			"First_Name": "María",
			"Last_Name":  "González",
			"Email":      "maria.gonzalez@example.com",
			"Phone":      "987654321",
			"Created_At": "2023-01-02",
		},
		{
			"id":         "test_contact_3",
			"First_Name": "Pedro",
			"Last_Name":  "Sánchez",
			"Email":      "pedro.sanchez@example.com",
			"Phone":      "456789123",
			"Created_At": "2023-01-03",
		},
	}

	c.JSON(http.StatusOK, ApiResponse{
		Success: true,
		Data:    testContacts,
		Message: "Datos de prueba para contactos",
	})
}