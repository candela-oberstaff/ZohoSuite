package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

var (
	BIGIN_API_URL = getEnvWithDefault("BIGIN_API_URL", "https://www.zohoapis.com/bigin/v2")
	ZOHO_ACCOUNTS_URL = getEnvWithDefault("ZOHO_ACCOUNTS_URL", "https://accounts.zoho.com")
)

// getEnvWithDefault obtiene una variable de entorno o devuelve un valor por defecto
func getEnvWithDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

var (
	// Cache para el token de acceso
	accessTokenCache struct {
		token     string
		expiresAt time.Time
		mutex     sync.RWMutex
	}
)

// TokenResponse estructura para la respuesta del token
type TokenResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
	TokenType   string `json:"token_type"`
}

// getAccessToken obtiene un token de acceso válido (con cache)
func getAccessToken() (string, error) {
	accessTokenCache.mutex.RLock()
	if accessTokenCache.token != "" && time.Now().Before(accessTokenCache.expiresAt) {
		token := accessTokenCache.token
		accessTokenCache.mutex.RUnlock()
		return token, nil
	}
	accessTokenCache.mutex.RUnlock()

	// Necesitamos refrescar el token
	accessTokenCache.mutex.Lock()
	defer accessTokenCache.mutex.Unlock()

	// Verificar nuevamente por si otro goroutine ya actualizó el token
	if accessTokenCache.token != "" && time.Now().Before(accessTokenCache.expiresAt) {
		return accessTokenCache.token, nil
	}

	// Obtener variables de entorno
	clientID := os.Getenv("ZOHO_CLIENT_ID")
	clientSecret := os.Getenv("ZOHO_CLIENT_SECRET")
	refreshToken := os.Getenv("ZOHO_REFRESH_TOKEN")

	if clientID == "" || clientSecret == "" || refreshToken == "" {
		return "", fmt.Errorf("faltan variables de entorno de Zoho: ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN")
	}

	// Preparar datos para la solicitud
	data := url.Values{}
	data.Set("grant_type", "refresh_token")
	data.Set("client_id", clientID)
	data.Set("client_secret", clientSecret)
	data.Set("refresh_token", refreshToken)

	// Realizar solicitud
	resp, err := http.PostForm(ZOHO_ACCOUNTS_URL+"/oauth/v2/token", data)
	if err != nil {
		return "", fmt.Errorf("error al solicitar token: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("error al leer respuesta del token: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("error HTTP %d al obtener token: %s", resp.StatusCode, string(body))
	}

	var tokenResp TokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return "", fmt.Errorf("error al parsear respuesta del token: %v", err)
	}

	// Actualizar cache (con un margen de seguridad de 5 minutos)
	accessTokenCache.token = tokenResp.AccessToken
	accessTokenCache.expiresAt = time.Now().Add(time.Duration(tokenResp.ExpiresIn-300) * time.Second)

	log.Printf("Token de acceso renovado exitosamente, expira en %d segundos", tokenResp.ExpiresIn)
	return tokenResp.AccessToken, nil
}

// makeZohoRequest realiza una solicitud HTTP a la API de Zoho
func makeZohoRequest(method, endpoint string, params map[string]string, body interface{}) (*http.Response, error) {
	token, err := getAccessToken()
	if err != nil {
		return nil, err
	}

	// Construir URL
	u, err := url.Parse(BIGIN_API_URL + endpoint)
	if err != nil {
		return nil, err
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
			return nil, err
		}
		reqBody = bytes.NewBuffer(jsonBody)
	}

	// Crear solicitud
	req, err := http.NewRequest(method, u.String(), reqBody)
	if err != nil {
		return nil, err
	}

	// Configurar headers
	req.Header.Set("Authorization", "Zoho-oauthtoken "+token)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	// Realizar solicitud
	client := &http.Client{Timeout: 30 * time.Second}
	return client.Do(req)
}

// fetchZohoData función auxiliar para obtener datos paginados de Zoho
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
	
	resp, err := makeZohoRequest("GET", "/"+module, params, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("error HTTP %d: %s", resp.StatusCode, string(body))
	}

	var zohoResp ZohoResponse
	if err := json.Unmarshal(body, &zohoResp); err != nil {
		return nil, err
	}

	return &zohoResp, nil
}