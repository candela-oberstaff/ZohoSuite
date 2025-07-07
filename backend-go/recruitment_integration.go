package main

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// ===== FUNCIONES DE INTEGRACIÓN ZOHO-INTELLISCREEN =====

// SyncCandidateWithZoho sincroniza un candidato de Intelliscreen con Zoho Bigin
func SyncCandidateWithZoho(candidate *Candidate) error {
	// Verificar si el candidato ya tiene un contacto en Zoho
	if candidate.ZohoContactID != "" {
		return nil // Ya está sincronizado
	}

	// Buscar contacto existente por email usando la función interna
	contacts, err := searchContactsByEmailFunc(candidate.Email)
	if err != nil {
		log.Printf("Error buscando contacto por email: %v", err)
	}

	// Si existe un contacto, usar ese ID
	if len(contacts) > 0 {
		candidate.ZohoContactID = contacts[0].ID
		return nil
	}

	// Si no existe, crear nuevo contacto en Zoho
	zohoContact := Contact{
		FirstName: candidate.FirstName,
		LastName:  candidate.LastName,
		Email:     candidate.Email,
		Phone:     candidate.Phone,
	}

	createdContact, err := createContactFunc(zohoContact)
	if err != nil {
		return fmt.Errorf("error creando contacto en Zoho: %v", err)
	}

	candidate.ZohoContactID = createdContact.ID
	return nil
}

// CreatePositionFromOpportunity crea una posición de reclutamiento desde una oportunidad de Zoho
func CreatePositionFromOpportunity(opportunityID string) (*Position, error) {
	// Obtener la oportunidad de Zoho
	opportunity, err := getOpportunityByIDFunc(opportunityID)
	if err != nil {
		return nil, fmt.Errorf("error obteniendo oportunidad: %v", err)
	}

	// Crear posición basada en la oportunidad
	position := Position{
		Title:             opportunity.DealName,
		Description:       fmt.Sprintf("Posición de reclutamiento para: %s", opportunity.DealName),
		ZohoOpportunityID: opportunity.ID,
		ZohoCompanyID:     opportunity.AccountName, // AccountName es ahora string
		Status:            "active",
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}

	// Crear la posición en Intelliscreen
	createdPosition, err := intelliscreenClient.CreatePosition(position)
	if err != nil {
		return nil, fmt.Errorf("error creando posición en Intelliscreen: %v", err)
	}

	return createdPosition, nil
}

// UpdateOpportunityWithRecruitmentData actualiza una oportunidad con datos de reclutamiento
func UpdateOpportunityWithRecruitmentData(opportunityID string, candidateCount int, averageScore float64) error {
	// Obtener la oportunidad actual
	opportunity, err := getOpportunityByIDFunc(opportunityID)
	if err != nil {
		return fmt.Errorf("error obteniendo oportunidad: %v", err)
	}

	// Actualizar campos personalizados con datos de reclutamiento
	updateData := map[string]interface{}{
		"Candidate_Count":   candidateCount,
		"Average_AI_Score":  averageScore,
		"Last_Updated":      time.Now().Format("2006-01-02 15:04:05"),
	}

	// Actualizar la oportunidad usando la función interna
	err = updateOpportunityFunc(opportunity.ID, updateData)
	if err != nil {
		return fmt.Errorf("error actualizando oportunidad: %v", err)
	}

	return nil
}

// GetCandidatesForPosition obtiene candidatos para una posición específica con datos de Zoho
func GetCandidatesForPosition(positionID string) ([]CandidateWithZohoData, error) {
	// Obtener candidatos de Intelliscreen
	candidates, err := intelliscreenClient.GetCandidates()
	if err != nil {
		return nil, fmt.Errorf("error obteniendo candidatos: %v", err)
	}

	var enrichedCandidates []CandidateWithZohoData

	for _, candidate := range candidates {
		enrichedCandidate := CandidateWithZohoData{
			Candidate: candidate,
		}

		// Obtener datos de Zoho si existe el contacto
		if candidate.ZohoContactID != "" {
			zohoContact, err := getContactByIDFunc(candidate.ZohoContactID)
			if err == nil {
				enrichedCandidate.ZohoContact = zohoContact
			}
		}

		// Obtener datos de la empresa si existe
		if candidate.ZohoCompanyID != "" {
			zohoCompany, err := getCompanyByIDFunc(candidate.ZohoCompanyID)
			if err == nil {
				enrichedCandidate.ZohoCompany = zohoCompany
			}
		}

		enrichedCandidates = append(enrichedCandidates, enrichedCandidate)
	}

	return enrichedCandidates, nil
}

// ===== ESTRUCTURAS ADICIONALES PARA INTEGRACIÓN =====

// CandidateWithZohoData estructura que combina datos de candidato con datos de Zoho
type CandidateWithZohoData struct {
	Candidate   Candidate `json:"candidate"`
	ZohoContact *Contact  `json:"zoho_contact,omitempty"`
	ZohoCompany *Company  `json:"zoho_company,omitempty"`
}

// PositionWithZohoData estructura que combina datos de posición con datos de Zoho
type PositionWithZohoData struct {
	Position        Position     `json:"position"`
	ZohoOpportunity *Opportunity `json:"zoho_opportunity,omitempty"`
	ZohoCompany     *Company     `json:"zoho_company,omitempty"`
}

// ===== HANDLERS PARA INTEGRACIÓN =====

// createPositionFromOpportunityHandler crea una posición desde una oportunidad
func createPositionFromOpportunityHandler(c *gin.Context) {
	opportunityID := c.Param("opportunity_id")
	if opportunityID == "" {
		c.JSON(http.StatusBadRequest, ApiResponse{
			Success: false,
			Message: "ID de oportunidad requerido",
		})
		return
	}

	position, err := CreatePositionFromOpportunity(opportunityID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ApiResponse{
			Success: false,
			Message: fmt.Sprintf("Error creando posición desde oportunidad: %v", err),
		})
		return
	}

	c.JSON(http.StatusCreated, ApiResponse{
		Success: true,
		Data:    position,
		Message: "Posición creada exitosamente desde oportunidad",
	})
}

// syncCandidateWithZohoHandler sincroniza un candidato con Zoho
func syncCandidateWithZohoHandler(c *gin.Context) {
	candidateID := c.Param("candidate_id")
	if candidateID == "" {
		c.JSON(http.StatusBadRequest, ApiResponse{
			Success: false,
			Message: "ID de candidato requerido",
		})
		return
	}

	// Obtener candidato de Intelliscreen
	candidate, err := intelliscreenClient.GetCandidate(candidateID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ApiResponse{
			Success: false,
			Message: fmt.Sprintf("Error obteniendo candidato: %v", err),
		})
		return
	}

	// Sincronizar con Zoho
	err = SyncCandidateWithZoho(candidate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ApiResponse{
			Success: false,
			Message: fmt.Sprintf("Error sincronizando candidato con Zoho: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, ApiResponse{
		Success: true,
		Data:    candidate,
		Message: "Candidato sincronizado exitosamente con Zoho",
	})
}

// getPositionWithZohoDataHandler obtiene una posición con datos enriquecidos de Zoho
func getPositionWithZohoDataHandler(c *gin.Context) {
	positionID := c.Param("position_id")
	if positionID == "" {
		c.JSON(http.StatusBadRequest, ApiResponse{
			Success: false,
			Message: "ID de posición requerido",
		})
		return
	}

	// Obtener posiciones de Intelliscreen
	positions, err := intelliscreenClient.GetPositions()
	if err != nil {
		c.JSON(http.StatusInternalServerError, ApiResponse{
			Success: false,
			Message: fmt.Sprintf("Error obteniendo posiciones: %v", err),
		})
		return
	}

	// Buscar la posición específica
	var targetPosition *Position
	for _, position := range positions {
		if position.ID == positionID {
			targetPosition = &position
			break
		}
	}

	if targetPosition == nil {
		c.JSON(http.StatusNotFound, ApiResponse{
			Success: false,
			Message: "Posición no encontrada",
		})
		return
	}

	// Enriquecer con datos de Zoho
	positionWithZoho := PositionWithZohoData{
		Position: *targetPosition,
	}

	// Obtener oportunidad de Zoho si existe
	if targetPosition.ZohoOpportunityID != "" {
		opportunity, err := getOpportunityByIDFunc(targetPosition.ZohoOpportunityID)
		if err == nil {
			positionWithZoho.ZohoOpportunity = opportunity
		}
	}

	// Obtener empresa de Zoho si existe
	if targetPosition.ZohoCompanyID != "" {
		company, err := getCompanyByIDFunc(targetPosition.ZohoCompanyID)
		if err == nil {
			positionWithZoho.ZohoCompany = company
		}
	}

	c.JSON(http.StatusOK, ApiResponse{
		Success: true,
		Data:    positionWithZoho,
		Message: "Posición con datos de Zoho obtenida exitosamente",
	})
}

// getCandidatesForPositionHandler obtiene candidatos para una posición con datos de Zoho
func getCandidatesForPositionHandler(c *gin.Context) {
	positionID := c.Param("position_id")
	if positionID == "" {
		c.JSON(http.StatusBadRequest, ApiResponse{
			Success: false,
			Message: "ID de posición requerido",
		})
		return
	}

	candidates, err := GetCandidatesForPosition(positionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ApiResponse{
			Success: false,
			Message: fmt.Sprintf("Error obteniendo candidatos para posición: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, ApiResponse{
		Success: true,
		Data:    candidates,
		Message: "Candidatos para posición obtenidos exitosamente",
	})
}

// updateOpportunityWithRecruitmentHandler actualiza oportunidad con datos de reclutamiento
func updateOpportunityWithRecruitmentHandler(c *gin.Context) {
	opportunityID := c.Param("opportunity_id")
	if opportunityID == "" {
		c.JSON(http.StatusBadRequest, ApiResponse{
			Success: false,
			Message: "ID de oportunidad requerido",
		})
		return
	}

	// Obtener parámetros de query
	candidateCountStr := c.Query("candidate_count")
	averageScoreStr := c.Query("average_score")

	candidateCount := 0
	if candidateCountStr != "" {
		if count, err := strconv.Atoi(candidateCountStr); err == nil {
			candidateCount = count
		}
	}

	averageScore := 0.0
	if averageScoreStr != "" {
		if score, err := strconv.ParseFloat(averageScoreStr, 64); err == nil {
			averageScore = score
		}
	}

	err := UpdateOpportunityWithRecruitmentData(opportunityID, candidateCount, averageScore)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ApiResponse{
			Success: false,
			Message: fmt.Sprintf("Error actualizando oportunidad: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, ApiResponse{
		Success: true,
		Message: "Oportunidad actualizada exitosamente con datos de reclutamiento",
	})
}