package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	IntelliscreenBaseURL = "https://api.intelliscreen.io"
)

// IntelliscreenClient estructura para el cliente de Intelliscreen
type IntelliscreenClient struct {
	APIKey     string
	BaseURL    string
	HTTPClient *http.Client
}

// NewIntelliscreenClient crea un nuevo cliente de Intelliscreen
func NewIntelliscreenClient() *IntelliscreenClient {
	apiKey := os.Getenv("INTELLISCREEN_API_KEY")
	if apiKey == "" {
		apiKey = "9cc1610f1cbb201b3123726765bc67b6" // API key proporcionada por el usuario
	}

	return &IntelliscreenClient{
		APIKey:  apiKey,
		BaseURL: IntelliscreenBaseURL,
		HTTPClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// makeRequest realiza una petición HTTP a la API de Intelliscreen
func (c *IntelliscreenClient) makeRequest(method, endpoint string, body interface{}) (*http.Response, error) {
	url := c.BaseURL + endpoint

	var reqBody io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("error marshaling request body: %v", err)
		}
		reqBody = bytes.NewBuffer(jsonBody)
	}

	req, err := http.NewRequest(method, url, reqBody)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %v", err)
	}

	// Agregar headers
	req.Header.Set("X-API-Key", c.APIKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	return c.HTTPClient.Do(req)
}

// ===== FUNCIONES PARA CANDIDATOS =====

// CandidatesResponse estructura para la respuesta de la API de candidatos
type CandidatesResponse struct {
	Candidates []Candidate `json:"candidates"`
	Total      int         `json:"total"`
	Page       int         `json:"page"`
	NumPages   int         `json:"num_pages"`
	PageSize   int         `json:"page_size"`
}

// GetCandidates obtiene la lista de candidatos
func (c *IntelliscreenClient) GetCandidates() ([]Candidate, error) {
	resp, err := c.makeRequest("GET", "/candidates/?page=1", nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var response CandidatesResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("error decoding response: %v", err)
	}

	return response.Candidates, nil
}

// GetCandidatesWithPagination obtiene la lista de candidatos con paginación
func (c *IntelliscreenClient) GetCandidatesWithPagination(page int) (*CandidatesResponse, error) {
	endpoint := fmt.Sprintf("/candidates/?page=%d", page)
	resp, err := c.makeRequest("GET", endpoint, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var response CandidatesResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("error decoding response: %v", err)
	}

	return &response, nil
}

// GetCandidate obtiene un candidato específico por ID
func (c *IntelliscreenClient) GetCandidate(candidateID string) (*Candidate, error) {
	endpoint := fmt.Sprintf("/candidates/%s", candidateID)
	resp, err := c.makeRequest("GET", endpoint, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API request failed with status %d", resp.StatusCode)
	}

	var candidate Candidate
	if err := json.NewDecoder(resp.Body).Decode(&candidate); err != nil {
		return nil, fmt.Errorf("error decoding response: %v", err)
	}

	return &candidate, nil
}

// CreateCandidate crea un nuevo candidato
func (c *IntelliscreenClient) CreateCandidate(candidate Candidate) (*Candidate, error) {
	resp, err := c.makeRequest("POST", "/candidates/", candidate)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API request failed with status %d", resp.StatusCode)
	}

	var createdCandidate Candidate
	if err := json.NewDecoder(resp.Body).Decode(&createdCandidate); err != nil {
		return nil, fmt.Errorf("error decoding response: %v", err)
	}

	return &createdCandidate, nil
}

// ===== FUNCIONES PARA POSICIONES =====

// GetPositions obtiene la lista de posiciones
func (c *IntelliscreenClient) GetPositions() ([]Position, error) {
	resp, err := c.makeRequest("GET", "/positions/", nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API request failed with status %d", resp.StatusCode)
	}

	var positions []Position
	if err := json.NewDecoder(resp.Body).Decode(&positions); err != nil {
		return nil, fmt.Errorf("error decoding response: %v", err)
	}

	return positions, nil
}

// CreatePosition crea una nueva posición
func (c *IntelliscreenClient) CreatePosition(position Position) (*Position, error) {
	resp, err := c.makeRequest("POST", "/positions/", position)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API request failed with status %d", resp.StatusCode)
	}

	var createdPosition Position
	if err := json.NewDecoder(resp.Body).Decode(&createdPosition); err != nil {
		return nil, fmt.Errorf("error decoding response: %v", err)
	}

	return &createdPosition, nil
}

// ===== FUNCIONES PARA EVALUACIONES =====

// GetAssessments obtiene la lista de evaluaciones
func (c *IntelliscreenClient) GetAssessments() ([]Assessment, error) {
	resp, err := c.makeRequest("GET", "/assessments/", nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API request failed with status %d", resp.StatusCode)
	}

	var assessments []Assessment
	if err := json.NewDecoder(resp.Body).Decode(&assessments); err != nil {
		return nil, fmt.Errorf("error decoding response: %v", err)
	}

	return assessments, nil
}

// GetCandidateResults obtiene los resultados de un candidato
func (c *IntelliscreenClient) GetCandidateResults(candidateID string) ([]CandidateResult, error) {
	endpoint := fmt.Sprintf("/candidates/%s/results", candidateID)
	resp, err := c.makeRequest("GET", endpoint, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API request failed with status %d", resp.StatusCode)
	}

	var results []CandidateResult
	if err := json.NewDecoder(resp.Body).Decode(&results); err != nil {
		return nil, fmt.Errorf("error decoding response: %v", err)
	}

	return results, nil
}

// ===== HANDLERS PARA LAS RUTAS API =====

// Variable global para el cliente de Intelliscreen
var intelliscreenClient *IntelliscreenClient

// InitIntelliscreenClient inicializa el cliente de Intelliscreen
func InitIntelliscreenClient() {
	intelliscreenClient = NewIntelliscreenClient()
}

// getCandidatesHandler maneja la obtención de candidatos
func getCandidatesHandler(c *gin.Context) {
	candidates, err := intelliscreenClient.GetCandidates()
	if err != nil {
		c.JSON(http.StatusInternalServerError, ApiResponse{
			Success: false,
			Message: fmt.Sprintf("Error obteniendo candidatos: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, ApiResponse{
		Success: true,
		Data:    candidates,
		Message: "Candidatos obtenidos exitosamente",
	})
}

// getIntelliscreenCandidatesHandler maneja la obtención de candidatos de Intelliscreen con paginación
func getIntelliscreenCandidatesHandler(c *gin.Context) {
	// Obtener el parámetro de página, por defecto 1
	page := 1
	if pageParam := c.Query("page"); pageParam != "" {
		if p, err := strconv.Atoi(pageParam); err == nil && p > 0 {
			page = p
		}
	}

	// Obtener candidatos con paginación
	response, err := intelliscreenClient.GetCandidatesWithPagination(page)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ApiResponse{
			Success: false,
			Message: fmt.Sprintf("Error obteniendo candidatos de Intelliscreen: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, ApiResponse{
		Success: true,
		Data:    response,
		Message: "Candidatos de Intelliscreen obtenidos exitosamente",
	})
}

// getCandidateHandler maneja la obtención de un candidato específico
func getCandidateHandler(c *gin.Context) {
	candidateID := c.Param("id")
	candidate, err := intelliscreenClient.GetCandidate(candidateID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ApiResponse{
			Success: false,
			Message: fmt.Sprintf("Error obteniendo candidato: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, ApiResponse{
		Success: true,
		Data:    candidate,
		Message: "Candidato obtenido exitosamente",
	})
}

// createCandidateHandler maneja la creación de candidatos
func createCandidateHandler(c *gin.Context) {
	var candidate Candidate
	if err := c.ShouldBindJSON(&candidate); err != nil {
		c.JSON(http.StatusBadRequest, ApiResponse{
			Success: false,
			Message: fmt.Sprintf("Error en los datos del candidato: %v", err),
		})
		return
	}

	createdCandidate, err := intelliscreenClient.CreateCandidate(candidate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ApiResponse{
			Success: false,
			Message: fmt.Sprintf("Error creando candidato: %v", err),
		})
		return
	}

	c.JSON(http.StatusCreated, ApiResponse{
		Success: true,
		Data:    createdCandidate,
		Message: "Candidato creado exitosamente",
	})
}

// getPositionsHandler maneja la obtención de posiciones
func getPositionsHandler(c *gin.Context) {
	positions, err := intelliscreenClient.GetPositions()
	if err != nil {
		c.JSON(http.StatusInternalServerError, ApiResponse{
			Success: false,
			Message: fmt.Sprintf("Error obteniendo posiciones: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, ApiResponse{
		Success: true,
		Data:    positions,
		Message: "Posiciones obtenidas exitosamente",
	})
}

// createPositionHandler maneja la creación de posiciones
func createPositionHandler(c *gin.Context) {
	var request PositionCreateRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, ApiResponse{
			Success: false,
			Message: fmt.Sprintf("Error en los datos de la posición: %v", err),
		})
		return
	}

	// Convertir request a Position
	position := Position{
		Title:             request.Title,
		Description:       request.Description,
		Requirements:      request.Requirements,
		ZohoOpportunityID: request.ZohoOpportunityID,
		ZohoCompanyID:     request.ZohoCompanyID,
		Assessments:       request.Assessments,
		CustomFields:      request.CustomFields,
		Status:            "active",
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}

	createdPosition, err := intelliscreenClient.CreatePosition(position)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ApiResponse{
			Success: false,
			Message: fmt.Sprintf("Error creando posición: %v", err),
		})
		return
	}

	c.JSON(http.StatusCreated, ApiResponse{
		Success: true,
		Data:    createdPosition,
		Message: "Posición creada exitosamente",
	})
}

// getAssessmentsHandler maneja la obtención de evaluaciones
func getAssessmentsHandler(c *gin.Context) {
	assessments, err := intelliscreenClient.GetAssessments()
	if err != nil {
		c.JSON(http.StatusInternalServerError, ApiResponse{
			Success: false,
			Message: fmt.Sprintf("Error obteniendo evaluaciones: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, ApiResponse{
		Success: true,
		Data:    assessments,
		Message: "Evaluaciones obtenidas exitosamente",
	})
}

// getCandidateResultsHandler maneja la obtención de resultados de candidatos
func getCandidateResultsHandler(c *gin.Context) {
	candidateID := c.Param("id")
	results, err := intelliscreenClient.GetCandidateResults(candidateID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ApiResponse{
			Success: false,
			Message: fmt.Sprintf("Error obteniendo resultados del candidato: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, ApiResponse{
		Success: true,
		Data:    results,
		Message: "Resultados del candidato obtenidos exitosamente",
	})
}

// getRecruitmentDashboardHandler maneja la obtención del dashboard de reclutamiento
func getRecruitmentDashboardHandler(c *gin.Context) {
	fmt.Println("[DEBUG] Iniciando getRecruitmentDashboardHandler")
	
	// Obtener datos reales de la API de Intelliscreen
	fmt.Println("[DEBUG] Obteniendo candidatos...")
	candidates, err := intelliscreenClient.GetCandidates()
	if err != nil {
		fmt.Printf("[ERROR] Error obteniendo candidatos: %v\n", err)
		c.JSON(http.StatusInternalServerError, ApiResponse{
			Success: false,
			Message: fmt.Sprintf("Error obteniendo candidatos: %v", err),
		})
		return
	}
	fmt.Printf("[DEBUG] Candidatos obtenidos: %d\n", len(candidates))

	// Intentar obtener posiciones de la API (si está disponible)
	fmt.Println("[DEBUG] Intentando obtener posiciones de la API...")
	positions, err := intelliscreenClient.GetPositions()
	if err != nil {
		fmt.Printf("[WARNING] No se pudieron obtener posiciones de la API: %v\n", err)
		positions = []Position{} // Lista vacía si no hay endpoint de posiciones
	}
	fmt.Printf("[DEBUG] Posiciones obtenidas: %d\n", len(positions))

	// Intentar obtener evaluaciones de la API
	fmt.Println("[DEBUG] Intentando obtener evaluaciones de la API...")
	assessments, err := intelliscreenClient.GetAssessments()
	if err != nil {
		fmt.Printf("[WARNING] No se pudieron obtener evaluaciones de la API: %v\n", err)
		assessments = []Assessment{}
	}
	fmt.Printf("[DEBUG] Evaluaciones obtenidas: %d\n", len(assessments))

	// Calcular métricas del dashboard basadas en datos reales
	dashboard := RecruitmentDashboard{
		TotalCandidates:      len(candidates),
		ActiveCandidates:     countActiveCandidates(candidates),
		TotalPositions:       len(positions),
		ActivePositions:      countActivePositions(positions),
		PendingEvaluations:   countPendingAssessments(assessments),
		CompletedEvaluations: countCompletedAssessments(assessments),
		TopPositions:         getTopPositions(positions),
		RecentActivity:       generateRecentActivityFromCandidates(candidates),
		PerformanceMetrics:   calculatePerformanceMetrics(candidates, positions, assessments),
	}

	c.JSON(http.StatusOK, ApiResponse{
		Success: true,
		Data:    dashboard,
		Message: "Dashboard de reclutamiento obtenido exitosamente",
	})
}

// ===== FUNCIONES AUXILIARES =====

// countActiveCandidates cuenta candidatos activos
func countActiveCandidates(candidates []Candidate) int {
	count := 0
	for _, candidate := range candidates {
		if candidate.Status == "active" || candidate.Status == "in_process" {
			count++
		}
	}
	return count
}

// countActivePositions cuenta posiciones activas
func countActivePositions(positions []Position) int {
	count := 0
	for _, position := range positions {
		if position.Status == "active" || position.Status == "open" {
			count++
		}
	}
	return count
}

// getTopPositions obtiene las posiciones principales
func getTopPositions(positions []Position) []PositionSummary {
	var summaries []PositionSummary
	for _, position := range positions {
		summary := PositionSummary{
			ID:             position.ID,
			Title:          position.Title,
			CandidateCount: len(position.Candidates),
			Status:         position.Status,
		}
		summaries = append(summaries, summary)
	}
	return summaries
}

// countPendingAssessments cuenta evaluaciones pendientes
func countPendingAssessments(assessments []Assessment) int {
	count := 0
	for _, assessment := range assessments {
		if assessment.Status == "pending" || assessment.Status == "in_progress" {
			count++
		}
	}
	return count
}

// countCompletedAssessments cuenta evaluaciones completadas
func countCompletedAssessments(assessments []Assessment) int {
	count := 0
	for _, assessment := range assessments {
		if assessment.Status == "completed" || assessment.Status == "finished" {
			count++
		}
	}
	return count
}

// generateRecentActivityFromCandidates genera actividad reciente basada en candidatos reales
func generateRecentActivityFromCandidates(candidates []Candidate) []RecruitmentActivity {
	var activities []RecruitmentActivity
	
	// Tomar los últimos candidatos como actividad reciente
	for i, candidate := range candidates {
		if i >= 10 { // Limitar a 10 actividades recientes
			break
		}
		
		activity := RecruitmentActivity{
			ID:          fmt.Sprintf("activity_%d", i+1),
			Type:        "candidate_updated",
			Description: fmt.Sprintf("Candidato actualizado: %s %s", candidate.FirstName, candidate.LastName),
			Timestamp:   candidate.UpdatedAt,
			EntityID:    candidate.ID,
			EntityType:  "candidate",
		}
		activities = append(activities, activity)
	}
	
	return activities
}

// calculatePerformanceMetrics calcula métricas de rendimiento basadas en datos reales
func calculatePerformanceMetrics(candidates []Candidate, positions []Position, assessments []Assessment) map[string]interface{} {
	metrics := map[string]interface{}{}
	
	// Calcular tasa de éxito basada en candidatos
	if len(candidates) > 0 {
		hiredCount := 0
		for _, candidate := range candidates {
			if candidate.Status == "hired" || candidate.Status == "accepted" {
				hiredCount++
			}
		}
		metrics["success_rate"] = float64(hiredCount) / float64(len(candidates)) * 100
	} else {
		metrics["success_rate"] = 0.0
	}
	
	// Calcular tiempo promedio de contratación (estimado)
	if len(positions) > 0 {
		totalDays := 0
		completedPositions := 0
		for _, position := range positions {
			if position.Status == "closed" || position.Status == "filled" {
				days := int(time.Since(position.CreatedAt).Hours() / 24)
				totalDays += days
				completedPositions++
			}
		}
		if completedPositions > 0 {
			metrics["average_time_to_hire"] = float64(totalDays) / float64(completedPositions)
		} else {
			metrics["average_time_to_hire"] = 0.0
		}
	} else {
		metrics["average_time_to_hire"] = 0.0
	}
	
	// Calcular satisfacción del candidato basada en evaluaciones completadas
	if len(assessments) > 0 {
		completedAssessments := countCompletedAssessments(assessments)
		totalAssessments := len(assessments)
		if totalAssessments > 0 {
			metrics["candidate_satisfaction"] = float64(completedAssessments) / float64(totalAssessments) * 5.0 // Escala de 1-5
		} else {
			metrics["candidate_satisfaction"] = 0.0
		}
	} else {
		metrics["candidate_satisfaction"] = 0.0
	}
	
	return metrics
}

// testIntelliscreenHandler maneja las pruebas de la API de Intelliscreen
func testIntelliscreenHandler(c *gin.Context) {
	testType := c.Query("type")
	if testType == "" {
		testType = "connectivity"
	}

	var result map[string]interface{}
	var err error

	switch testType {
	case "connectivity":
		result, err = testConnectivity()
	case "candidates":
		result, err = testCandidatesAPI()
	case "positions":
		result, err = testPositionsAPI()
	case "assessments":
		result, err = testAssessmentsAPI()
	case "create-candidate":
		result, err = testCreateCandidateAPI()
	case "create-position":
		result, err = testCreatePositionAPI()
	default:
		result, err = testConnectivity()
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, ApiResponse{
			Success: false,
			Message: fmt.Sprintf("Error en prueba %s: %v", testType, err),
			Data:    result,
		})
		return
	}

	c.JSON(http.StatusOK, ApiResponse{
		Success: true,
		Message: fmt.Sprintf("Prueba %s completada exitosamente", testType),
		Data:    result,
	})
}

// testConnectivity prueba la conectividad básica
func testConnectivity() (map[string]interface{}, error) {
	result := map[string]interface{}{
		"test_type": "connectivity",
		"api_key":   intelliscreenClient.APIKey[:10] + "...",
		"base_url":  intelliscreenClient.BaseURL,
		"timestamp": time.Now(),
	}

	// Intentar hacer una petición simple
	resp, err := intelliscreenClient.makeRequest("GET", "/candidates/", nil)
	if err != nil {
		result["error"] = err.Error()
		result["status"] = "failed"
		return result, err
	}
	defer resp.Body.Close()

	result["http_status"] = resp.StatusCode
	result["status"] = "success"

	return result, nil
}

// testCandidatesAPI prueba la API de candidatos
func testCandidatesAPI() (map[string]interface{}, error) {
	result := map[string]interface{}{
		"test_type": "candidates",
		"timestamp": time.Now(),
	}

	candidates, err := intelliscreenClient.GetCandidates()
	if err != nil {
		result["error"] = err.Error()
		result["status"] = "failed"
		return result, err
	}

	result["status"] = "success"
	result["candidates_count"] = len(candidates)
	if len(candidates) > 0 {
		result["first_candidate"] = candidates[0]
	}

	return result, nil
}

// testPositionsAPI prueba la API de posiciones
func testPositionsAPI() (map[string]interface{}, error) {
	result := map[string]interface{}{
		"test_type": "positions",
		"timestamp": time.Now(),
	}

	positions, err := intelliscreenClient.GetPositions()
	if err != nil {
		result["error"] = err.Error()
		result["status"] = "failed"
		return result, err
	}

	result["status"] = "success"
	result["positions_count"] = len(positions)
	if len(positions) > 0 {
		result["first_position"] = positions[0]
	}

	return result, nil
}

// testAssessmentsAPI prueba la API de evaluaciones
func testAssessmentsAPI() (map[string]interface{}, error) {
	result := map[string]interface{}{
		"test_type": "assessments",
		"timestamp": time.Now(),
	}

	assessments, err := intelliscreenClient.GetAssessments()
	if err != nil {
		result["error"] = err.Error()
		result["status"] = "failed"
		return result, err
	}

	result["status"] = "success"
	result["assessments_count"] = len(assessments)
	if len(assessments) > 0 {
		result["first_assessment"] = assessments[0]
	}

	return result, nil
}

// testCreateCandidateAPI prueba la creación de candidatos
func testCreateCandidateAPI() (map[string]interface{}, error) {
	result := map[string]interface{}{
		"test_type": "create-candidate",
		"timestamp": time.Now(),
	}

	// Crear candidato de prueba
	testCandidate := Candidate{
		Email:     fmt.Sprintf("test-%d@example.com", time.Now().Unix()),
		FirstName: "Test",
		LastName:  "Candidate",
		Phone:     "+1234567890",
		Status:    "active",
		Education: []Education{
			{
				Institution:  "Test University",
				Degree:       "Computer Science",
				FieldOfStudy: "Software Engineering",
			},
		},
		Skills: []Skill{
			{Name: "Go", Level: "Advanced"},
			{Name: "React", Level: "Intermediate"},
		},
	}

	createdCandidate, err := intelliscreenClient.CreateCandidate(testCandidate)
	if err != nil {
		result["error"] = err.Error()
		result["status"] = "failed"
		result["test_candidate"] = testCandidate
		return result, err
	}

	result["status"] = "success"
	result["test_candidate"] = testCandidate
	result["created_candidate"] = createdCandidate

	return result, nil
}

// testCreatePositionAPI prueba la creación de posiciones
func testCreatePositionAPI() (map[string]interface{}, error) {
	result := map[string]interface{}{
		"test_type": "create-position",
		"timestamp": time.Now(),
	}

	// Crear posición de prueba
	testPosition := Position{
		Title:        fmt.Sprintf("Test Position %d", time.Now().Unix()),
		Description:  "This is a test position created by the API test",
		Requirements: "Test requirements for the position",
		Status:       "active",
		Assessments:  []string{"technical-test"},
		CustomFields: map[string]interface{}{
			"test_field": "test_value",
			"created_by": "api_test",
		},
	}

	createdPosition, err := intelliscreenClient.CreatePosition(testPosition)
	if err != nil {
		result["error"] = err.Error()
		result["status"] = "failed"
		result["test_position"] = testPosition
		return result, err
	}

	result["status"] = "success"
	result["test_position"] = testPosition
	result["created_position"] = createdPosition

	return result, nil
}