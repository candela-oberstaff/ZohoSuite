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
	"time"
)

// fetchZohoBillingData obtiene datos de Zoho Billing con manejo de errores
func fetchZohoBillingData(endpoint string, params map[string]string) ([]byte, error) {
	// Asegurar que siempre haya parámetros
	if params == nil {
		params = make(map[string]string)
	}
	
	// Registrar la solicitud que se va a realizar
	log.Printf("Solicitando datos de Zoho Billing: %s con parámetros: %v", endpoint, params)
	
	resp, err := makeZohoBillingRequest("GET", "/"+endpoint, params, nil)
	if err != nil {
		log.Printf("Error al realizar solicitud a %s: %v", endpoint, err)
		return nil, fmt.Errorf("error de conexión con Zoho Billing: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Error al leer respuesta de %s: %v", endpoint, err)
		return nil, fmt.Errorf("error al leer respuesta de Zoho Billing: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		// Intentar extraer mensaje de error de la respuesta JSON
		var errorResponse struct {
			Code    int    `json:"code"`
			Message string `json:"message"`
		}

		// Intentar decodificar la respuesta de error
		json.Unmarshal(body, &errorResponse) // Ignoramos errores aquí intencionalmente

		// Construir mensaje de error detallado
		var errorMsg string
		if errorResponse.Message != "" {
			errorMsg = fmt.Sprintf("Código: %d, Mensaje: %s", errorResponse.Code, errorResponse.Message)
		} else {
			errorMsg = string(body)
		}

		log.Printf("Error en API Zoho Billing (%s) - Código HTTP: %d - %s", endpoint, resp.StatusCode, errorMsg)
		return nil, fmt.Errorf("error en la API de Zoho Billing (HTTP %d): %s", resp.StatusCode, errorMsg)
	}

	log.Printf("Datos recibidos correctamente de Zoho Billing %s", endpoint)
	return body, nil
}

// createZohoBillingData crea datos en Zoho Billing con manejo de errores
func createZohoBillingData(endpoint string, data interface{}) ([]byte, error) {
	// Registrar la solicitud que se va a realizar
	log.Printf("Creando datos en Zoho Billing: %s", endpoint)
	
	resp, err := makeZohoBillingRequest("POST", "/"+endpoint, nil, data)
	if err != nil {
		log.Printf("Error al realizar solicitud POST a %s: %v", endpoint, err)
		return nil, fmt.Errorf("error de conexión con Zoho Billing: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Error al leer respuesta de %s: %v", endpoint, err)
		return nil, fmt.Errorf("error al leer respuesta de Zoho Billing: %w", err)
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		// Intentar extraer mensaje de error de la respuesta JSON
		var errorResponse struct {
			Code    int    `json:"code"`
			Message string `json:"message"`
		}

		// Intentar decodificar la respuesta de error
		json.Unmarshal(body, &errorResponse) // Ignoramos errores aquí intencionalmente

		// Construir mensaje de error detallado
		var errorMsg string
		if errorResponse.Message != "" {
			errorMsg = fmt.Sprintf("Código: %d, Mensaje: %s", errorResponse.Code, errorResponse.Message)
		} else {
			errorMsg = string(body)
		}

		log.Printf("Error en API Zoho Billing (%s) - Código HTTP: %d - %s", endpoint, resp.StatusCode, errorMsg)
		return nil, fmt.Errorf("error en la API de Zoho Billing (HTTP %d): %s", resp.StatusCode, errorMsg)
	}

	log.Printf("Datos creados correctamente en Zoho Billing %s", endpoint)
	return body, nil
}

// updateZohoBillingData actualiza datos en Zoho Billing con manejo de errores
func updateZohoBillingData(endpoint string, data interface{}) ([]byte, error) {
	// Registrar la solicitud que se va a realizar
	log.Printf("Actualizando datos en Zoho Billing: %s", endpoint)
	
	resp, err := makeZohoBillingRequest("PUT", "/"+endpoint, nil, data)
	if err != nil {
		log.Printf("Error al realizar solicitud PUT a %s: %v", endpoint, err)
		return nil, fmt.Errorf("error de conexión con Zoho Billing: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Error al leer respuesta de %s: %v", endpoint, err)
		return nil, fmt.Errorf("error al leer respuesta de Zoho Billing: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		// Intentar extraer mensaje de error de la respuesta JSON
		var errorResponse struct {
			Code    int    `json:"code"`
			Message string `json:"message"`
		}

		// Intentar decodificar la respuesta de error
		json.Unmarshal(body, &errorResponse) // Ignoramos errores aquí intencionalmente

		// Construir mensaje de error detallado
		var errorMsg string
		if errorResponse.Message != "" {
			errorMsg = fmt.Sprintf("Código: %d, Mensaje: %s", errorResponse.Code, errorResponse.Message)
		} else {
			errorMsg = string(body)
		}

		log.Printf("Error en API Zoho Billing (%s) - Código HTTP: %d - %s", endpoint, resp.StatusCode, errorMsg)
		return nil, fmt.Errorf("error en la API de Zoho Billing (HTTP %d): %s", resp.StatusCode, errorMsg)
	}

	log.Printf("Datos actualizados correctamente en Zoho Billing %s", endpoint)
	return body, nil
}

// makeZohoBillingRequest realiza una solicitud HTTP a la API de Zoho Billing con reintentos
func makeZohoBillingRequest(method, endpoint string, params map[string]string, body interface{}) (*http.Response, error) {
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
		
		// Obtener organization ID
		orgID := os.Getenv("ZOHO_BILLING_ORG_ID")
		if orgID == "" {
			return nil, fmt.Errorf("falta ZOHO_BILLING_ORG_ID en variables de entorno")
		}
		
		// Construir URL
		u, err := url.Parse(BILLING_API_URL + endpoint)
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
		req.Header.Set("X-com-zoho-subscriptions-organizationid", orgID)
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