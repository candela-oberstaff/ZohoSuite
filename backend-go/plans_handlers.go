package main

import (
	"encoding/json"
	"fmt"
	"log"

	"github.com/gin-gonic/gin"
)

// getPlans obtiene todos los planes disponibles
func getPlans(c *gin.Context) {
	log.Println("Obteniendo todos los planes")

	// Obtener parámetros de consulta
	page := c.DefaultQuery("page", "1")
	perPage := c.DefaultQuery("per_page", "200")
	status := c.Query("status") // active, inactive, etc.

	// Construir la URL con parámetros
	url := fmt.Sprintf("plans?page=%s&per_page=%s", page, perPage)
	if status != "" {
		url += fmt.Sprintf("&status=%s", status)
	}

	// Obtener planes de Zoho Billing
	response, err := fetchZohoBillingData(url, nil)
	if err != nil {
		log.Printf("Error al obtener planes: %v", err)
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al obtener planes: " + err.Error(),
		})
		return
	}

	var planResponse PlanResponse
	if err := json.Unmarshal(response, &planResponse); err != nil {
		log.Printf("Error al decodificar respuesta de planes: %v", err)
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al procesar respuesta de Zoho Billing: " + err.Error(),
		})
		return
	}

	if planResponse.Code != 0 {
		log.Printf("Error en API Zoho Billing: Código %d, Mensaje: %s",
			planResponse.Code, planResponse.Message)
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "Error en la API de Zoho Billing: " + planResponse.Message,
		})
		return
	}

	log.Printf("Planes obtenidos exitosamente: %d planes", len(planResponse.Plans))
	c.JSON(200, ApiResponse{
		Success: true,
		Data:    planResponse.Plans,
		Message: fmt.Sprintf("%d planes obtenidos exitosamente", len(planResponse.Plans)),
	})
}

// getPlanByCode obtiene un plan específico por su código
func getPlanByCode(c *gin.Context) {
	planCode := c.Param("code")
	if planCode == "" {
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "Código de plan no proporcionado",
		})
		return
	}

	log.Printf("Obteniendo plan con código: %s", planCode)

	// Obtener plan específico de Zoho Billing
	response, err := fetchZohoBillingData(fmt.Sprintf("plans/%s", planCode), nil)
	if err != nil {
		log.Printf("Error al obtener plan: %v", err)
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al obtener plan: " + err.Error(),
		})
		return
	}

	var planDetailResponse PlanDetailResponse
	if err := json.Unmarshal(response, &planDetailResponse); err != nil {
		log.Printf("Error al decodificar respuesta del plan: %v", err)
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al procesar respuesta de Zoho Billing: " + err.Error(),
		})
		return
	}

	if planDetailResponse.Code != 0 {
		log.Printf("Error en API Zoho Billing: Código %d, Mensaje: %s",
			planDetailResponse.Code, planDetailResponse.Message)
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "Error en la API de Zoho Billing: " + planDetailResponse.Message,
		})
		return
	}

	log.Printf("Plan obtenido exitosamente: %s", planCode)
	c.JSON(200, ApiResponse{
		Success: true,
		Data:    planDetailResponse.Plan,
		Message: "Plan obtenido exitosamente",
	})
}

// createPlan crea un nuevo plan de suscripción
func createPlan(c *gin.Context) {
	var planData map[string]interface{}
	if err := c.ShouldBindJSON(&planData); err != nil {
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "Datos de plan inválidos: " + err.Error(),
		})
		return
	}

	// Validar campos requeridos
	requiredFields := []string{"plan_code", "plan_name", "price", "interval", "interval_unit"}
	for _, field := range requiredFields {
		if _, exists := planData[field]; !exists {
			c.JSON(400, ApiResponse{
				Success: false,
				Error:   fmt.Sprintf("Campo requerido faltante: %s", field),
			})
			return
		}
	}

	log.Printf("Creando nuevo plan con datos: %+v", planData)

	// Crear el plan en Zoho Billing
	response, err := createZohoBillingData("plans", planData)
	if err != nil {
		log.Printf("Error al crear plan: %v", err)
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al crear plan: " + err.Error(),
		})
		return
	}

	var planDetailResponse PlanDetailResponse
	if err := json.Unmarshal(response, &planDetailResponse); err != nil {
		log.Printf("Error al decodificar respuesta de creación de plan: %v", err)
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al procesar respuesta de Zoho Billing: " + err.Error(),
		})
		return
	}

	if planDetailResponse.Code != 0 {
		log.Printf("Error en API Zoho Billing al crear plan: Código %d, Mensaje: %s",
			planDetailResponse.Code, planDetailResponse.Message)
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "Error en la API de Zoho Billing: " + planDetailResponse.Message,
		})
		return
	}

	log.Printf("Plan creado exitosamente: %s", planDetailResponse.Plan.PlanCode)
	c.JSON(201, ApiResponse{
		Success: true,
		Data:    planDetailResponse.Plan,
		Message: "Plan creado exitosamente",
	})
}

// updatePlan actualiza un plan existente
func updatePlan(c *gin.Context) {
	planCode := c.Param("code")
	if planCode == "" {
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "Código de plan no proporcionado",
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

	log.Printf("Actualizando plan %s con datos: %+v", planCode, updateData)

	// Actualizar el plan en Zoho Billing
	response, err := updateZohoBillingData(fmt.Sprintf("plans/%s", planCode), updateData)
	if err != nil {
		log.Printf("Error al actualizar plan: %v", err)
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al actualizar plan: " + err.Error(),
		})
		return
	}

	var planDetailResponse PlanDetailResponse
	if err := json.Unmarshal(response, &planDetailResponse); err != nil {
		log.Printf("Error al decodificar respuesta de actualización: %v", err)
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al procesar respuesta de Zoho Billing: " + err.Error(),
		})
		return
	}

	if planDetailResponse.Code != 0 {
		log.Printf("Error en API Zoho Billing al actualizar plan: Código %d, Mensaje: %s",
			planDetailResponse.Code, planDetailResponse.Message)
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "Error en la API de Zoho Billing: " + planDetailResponse.Message,
		})
		return
	}

	log.Printf("Plan actualizado exitosamente: %s", planCode)
	c.JSON(200, ApiResponse{
		Success: true,
		Data:    planDetailResponse.Plan,
		Message: "Plan actualizado exitosamente",
	})
}