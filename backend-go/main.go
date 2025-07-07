package main

import (
	"fmt"
	"log"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	fmt.Println("=== Zoho Bigin Backend - Go ===")
	fmt.Println("Iniciando servidor...")
	log.SetOutput(os.Stdout)

	// Cargar variables de entorno
	fmt.Println("Cargando variables de entorno...")
	err := godotenv.Load()
	if err != nil {
		fmt.Println("Warning: .env file not found")
	} else {
		fmt.Println("Archivo .env cargado exitosamente")
	}

	// Inicializar cliente de Intelliscreen
	InitIntelliscreenClient()

	// Configurar Gin en modo debug
	fmt.Println("Configurando Gin...")
	gin.SetMode(gin.DebugMode)
	router := gin.Default()

	// Configurar CORS
	fmt.Println("Configurando CORS...")
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization", "Cache-Control"}
	router.Use(cors.New(config))

	// Configurar todas las rutas
	fmt.Println("Configurando rutas...")
	setupRoutes(router)

	// Obtener puerto del entorno o usar 8000 por defecto
	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}

	fmt.Printf("🚀 Servidor iniciando en puerto %s\n", port)
	fmt.Printf("📡 URL: http://localhost:%s\n", port)
	fmt.Println("🛑 Presiona Ctrl+C para detener")

	// Iniciar servidor
	fmt.Printf("Llamando router.Run()...\n")
	serverAddr := ":" + port
	fmt.Printf("Dirección del servidor: %s\n", serverAddr)
	if err := router.Run(serverAddr); err != nil {
		fmt.Printf("Error al iniciar servidor: %v\n", err)
		log.Fatalf("Error al iniciar servidor: %v", err)
	}
}

func setupBasicRoutes(router *gin.Engine) {
	fmt.Println("Configurando ruta raíz...")
	// Ruta raíz
	router.GET("/", func(c *gin.Context) {
		fmt.Println("Solicitud recibida en ruta raíz")
		c.JSON(200, gin.H{
			"message": "Zoho Bigin API - Go Backend",
			"status":  "running",
			"version": "1.0.0",
		})
	})

	fmt.Println("Configurando ruta de prueba...")
	// Ruta de prueba
	router.GET("/test", func(c *gin.Context) {
		fmt.Println("Solicitud recibida en ruta de prueba")
		c.JSON(200, gin.H{
			"message":   "Test endpoint working!",
			"timestamp": "now",
		})
	})

	fmt.Println("Rutas configuradas exitosamente")
}

func setupRoutes(router *gin.Engine) {
	// Ruta raíz
	router.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "Zoho Bigin API - Go Backend",
			"status":  "running",
		})
	})

	// Grupo de rutas API
	api := router.Group("/api")
	{
		// Rutas de contactos (inglés y español)
		api.GET("/contacts", getContacts)
		api.GET("/contacts/:id", getContactByID)
		api.GET("/contactos", getContacts)
		api.GET("/contactos/:id", getContactByID)

		// Rutas de empresas/cuentas
		api.GET("/companies", getCompanies)
		api.GET("/companies/:id", getCompanyByID)
		api.GET("/companies/:id/opportunities", getCompanyOpportunitiesHandler)
		api.POST("/companies", createCompany)
		api.PUT("/companies/:id", updateCompany)
		api.DELETE("/companies/:id", deleteCompany)
		
		// Endpoints de debugging
		api.GET("/debug/opportunities/:companyName", debugOpportunities)
		api.GET("/debug/all-opportunities", debugAllOpportunities)
		api.GET("/debug/test-deals", debugTestDeals)
		api.GET("/debug/test-contacts", debugTestContacts)
		api.GET("/debug/test-intelliscreen", testIntelliscreenHandler)
		api.GET("/empresas", getCompanies)
		api.GET("/empresas/:id", getCompanyByID)
		api.GET("/empresas/:id/opportunities", getCompanyOpportunitiesHandler)
		api.POST("/empresas", createCompany)
		api.PUT("/empresas/:id", updateCompany)
		api.DELETE("/empresas/:id", deleteCompany)

		// Rutas de módulos y pipelines
		api.GET("/modulos", getModules)
		api.GET("/pipelines", getPipelines)
		api.GET("/team-pipelines", getTeamPipelines)
		api.GET("/pipeline-fields", getPipelineFields)
		api.GET("/empresas-productos-pipeline-fields", getEmpresasProductosPipelineFields)

		// Rutas de oportunidades
		api.GET("/oberstaff-pipeline", getOberstaffPipeline)
		api.GET("/empresas-productos-pipeline", getEmpresasProductosPipeline)
		api.GET("/test-oberstaff-pipeline", testOberstaffPipeline)
		api.GET("/opportunities", getOpportunities)
		api.POST("/opportunities", createOpportunity)
		api.PUT("/opportunities/:id", updateOpportunity)

		// Rutas de clientes de Zoho Billing
		api.GET("/billing/customers", getCustomers)
		api.GET("/billing/customers/:id", getCustomerByID)
		api.POST("/billing/customers", createCustomer)
		api.PUT("/billing/customers/:id", updateCustomer)
		api.GET("/billing/customers/count", getCustomersCount) // Ruta para obtener el total de clientes
		api.GET("/billing/customers/active/count", getActiveCustomersCount) // Ruta para obtener el total de clientes activos
		api.GET("/billing/customers/active/refresh", refreshActiveCustomersCache) // Ruta para forzar la actualización de la caché de clientes activos
		api.GET("/billing/transactions", getCustomerTransactions) // Ruta para obtener transacciones de un cliente
		api.GET("/billing/subscriptions", getCustomerSubscriptions) // Ruta para obtener suscripciones de un cliente
		api.GET("/billing/subscriptions/all", getAllSubscriptions) // Ruta para obtener todas las suscripciones con información del cliente
		api.GET("/billing/subscriptions/count", getSubscriptionsCount) // Ruta para obtener el conteo de suscripciones por estado
		api.GET("/billing/subscriptions/:id", getSubscriptionByID) // Ruta para obtener detalle de una suscripción
		api.POST("/billing/subscriptions", createSubscription) // Ruta para crear nueva suscripción
		api.PUT("/billing/subscriptions/:id", updateSubscription) // Ruta para actualizar suscripción
		api.POST("/billing/subscriptions/:id/cancel", cancelSubscription) // Ruta para cancelar suscripción
		api.POST("/billing/subscriptions/:id/pause", pauseSubscription) // Ruta para pausar suscripción
		api.POST("/billing/subscriptions/:id/resume", resumeSubscription) // Ruta para reanudar suscripción
		api.POST("/billing/subscriptions/:id/change-plan", changePlan) // Ruta para cambiar plan de suscripción
		api.POST("/billing/customers/from-opportunity/:id", createCustomerFromOpportunity) // Ruta para crear cliente a partir de oportunidad

		// Rutas para planes
		api.GET("/billing/plans", getPlans)
		api.GET("/billing/plans/:code", getPlanByCode)
		api.POST("/billing/plans", createPlan)
		api.PUT("/billing/plans/:code", updatePlan)
		api.POST("/billing/customers/:id/payment-method-link", generatePaymentMethodUpdateLink) // Ruta para generar enlace de actualización de método de pago

		// Rutas para el módulo de reclutamiento (Intelliscreen)
		recruitmentGroup := api.Group("/recruitment")
		{
			// Rutas para candidatos
			recruitmentGroup.GET("/candidates", getCandidatesHandler)
			recruitmentGroup.GET("/candidates/:id", getCandidateHandler)
			recruitmentGroup.GET("/candidates/:id/detail", getCandidateDetailHandler)
			recruitmentGroup.POST("/candidates", createCandidateHandler)
			recruitmentGroup.GET("/candidates/:id/results", getCandidateResultsHandler)

			// Rutas para posiciones
			recruitmentGroup.GET("/positions", getPositionsHandler)
			recruitmentGroup.POST("/positions", createPositionHandler)
			recruitmentGroup.GET("/positions/:position_id", getPositionWithZohoDataHandler)
			recruitmentGroup.GET("/positions/:position_id/candidates", getCandidatesForPositionHandler)

			// Rutas para evaluaciones
			recruitmentGroup.GET("/assessments", getAssessmentsHandler)

			// Ruta para dashboard
			recruitmentGroup.GET("/dashboard", getRecruitmentDashboardHandler)

			// Rutas de integración con Zoho
			recruitmentGroup.POST("/opportunities/:opportunity_id/create-position", createPositionFromOpportunityHandler)
			recruitmentGroup.POST("/candidates/:candidate_id/sync-zoho", syncCandidateWithZohoHandler)
			recruitmentGroup.PUT("/opportunities/:opportunity_id/update-recruitment-data", updateOpportunityWithRecruitmentHandler)
		}

		// Rutas específicas para Intelliscreen API
		intelliscreenGroup := api.Group("/intelliscreen")
		{
			intelliscreenGroup.GET("/candidates", getIntelliscreenCandidatesHandler)
		}
	}

	// Ruta para obtener metadatos de pipelines
	api.GET("/pipeline-metadata", getPipelineMetadata)
	
	// Ruta para obtener oportunidad por ID
	api.GET("/opportunities/:id", getOpportunityByID)
}
