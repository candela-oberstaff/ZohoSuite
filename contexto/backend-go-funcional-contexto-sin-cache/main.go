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

		// Rutas de módulos y pipelines
		api.GET("/modulos", getModules)
		api.GET("/pipelines", getPipelines)
		api.GET("/team-pipelines", getTeamPipelines)
		api.GET("/pipeline-fields", getPipelineFields)

		// Rutas de oportunidades
		api.GET("/oberstaff-pipeline", getOberstaffPipeline)
		api.GET("/test-oberstaff-pipeline", testOberstaffPipeline)
		api.GET("/opportunities", getOpportunities)
		api.POST("/opportunities", createOpportunity)
	}

	// Ruta para obtener metadatos de pipelines
	api.GET("/pipeline-metadata", getPipelineMetadata)
	
	// Ruta para obtener oportunidad por ID
	api.GET("/opportunities/:id", getOpportunityByID)
}
