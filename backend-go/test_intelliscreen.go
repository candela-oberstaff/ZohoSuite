package main

import (
	"encoding/json"
	"fmt"
	"log"
)

// TestIntelliscreenAPI función para probar la conectividad con la API de Intelliscreen
func TestIntelliscreenAPI() {
	fmt.Println("=== PRUEBA DE CONECTIVIDAD CON INTELLISCREEN API ===")

	// Inicializar cliente
	client := NewIntelliscreenClient()
	fmt.Printf("Cliente inicializado con API Key: %s\n", client.APIKey[:10]+"...")
	fmt.Printf("Base URL: %s\n", client.BaseURL)

	// Probar obtener candidatos
	fmt.Println("\n--- Probando obtener candidatos ---")
	candidates, err := client.GetCandidates()
	if err != nil {
		fmt.Printf("❌ Error obteniendo candidatos: %v\n", err)
	} else {
		fmt.Printf("✅ Candidatos obtenidos exitosamente: %d candidatos\n", len(candidates))
		if len(candidates) > 0 {
			fmt.Printf("Primer candidato: %+v\n", candidates[0])
		}
	}

	// Probar obtener posiciones
	fmt.Println("\n--- Probando obtener posiciones ---")
	positions, err := client.GetPositions()
	if err != nil {
		fmt.Printf("❌ Error obteniendo posiciones: %v\n", err)
	} else {
		fmt.Printf("✅ Posiciones obtenidas exitosamente: %d posiciones\n", len(positions))
		if len(positions) > 0 {
			fmt.Printf("Primera posición: %+v\n", positions[0])
		}
	}

	// Probar obtener evaluaciones
	fmt.Println("\n--- Probando obtener evaluaciones ---")
	assessments, err := client.GetAssessments()
	if err != nil {
		fmt.Printf("❌ Error obteniendo evaluaciones: %v\n", err)
	} else {
		fmt.Printf("✅ Evaluaciones obtenidas exitosamente: %d evaluaciones\n", len(assessments))
		if len(assessments) > 0 {
			fmt.Printf("Primera evaluación: %+v\n", assessments[0])
		}
	}

	fmt.Println("\n=== FIN DE PRUEBAS ===")
}

// TestCreateCandidate función para probar la creación de un candidato
func TestCreateCandidate() {
	fmt.Println("\n=== PRUEBA DE CREACIÓN DE CANDIDATO ===")

	client := NewIntelliscreenClient()

	// Crear candidato de prueba
	testCandidate := Candidate{
		Email:     "test@example.com",
		FirstName: "Juan",
		LastName:  "Pérez",
		Phone:     "+1234567890",
		Status:    "active",
		Education: []Education{
			{
				Institution:  "Universidad Ejemplo",
				Degree:       "Ingeniería en Sistemas",
				FieldOfStudy: "Ciencias de la Computación",
				StartDate:    "2018-01-01",
				EndDate:      "2022-12-31",
				GPA:          "8.5",
			},
		},
		WorkHistory: []WorkHistory{
			{
				Company:     "Tech Corp",
				Position:    "Desarrollador Junior",
				StartDate:   "2022-01-01",
				EndDate:     "2024-01-01",
				Description: "Desarrollo de aplicaciones web con Go y React",
			},
		},
		Skills: []Skill{
			{Name: "Go", Level: "Intermedio"},
			{Name: "React", Level: "Avanzado"},
			{Name: "JavaScript", Level: "Avanzado"},
		},
	}

	// Mostrar datos del candidato
	candidateJSON, _ := json.MarshalIndent(testCandidate, "", "  ")
	fmt.Printf("Candidato a crear:\n%s\n\n", string(candidateJSON))

	// Intentar crear el candidato
	createdCandidate, err := client.CreateCandidate(testCandidate)
	if err != nil {
		fmt.Printf("❌ Error creando candidato: %v\n", err)
	} else {
		fmt.Printf("✅ Candidato creado exitosamente\n")
		createdJSON, _ := json.MarshalIndent(createdCandidate, "", "  ")
		fmt.Printf("Candidato creado:\n%s\n", string(createdJSON))
	}
}

// TestCreatePosition función para probar la creación de una posición
func TestCreatePosition() {
	fmt.Println("\n=== PRUEBA DE CREACIÓN DE POSICIÓN ===")

	client := NewIntelliscreenClient()

	// Crear posición de prueba
	testPosition := Position{
		Title:        "Desarrollador Full Stack Senior",
		Description:  "Buscamos un desarrollador full stack con experiencia en Go, React y bases de datos",
		Requirements: "5+ años de experiencia, conocimientos en Go, React, PostgreSQL, Docker",
		Status:       "active",
		Assessments:  []string{"technical-assessment", "coding-challenge"},
		CustomFields: map[string]interface{}{
			"salary_range": "$80,000 - $120,000",
			"remote_work":  true,
			"department":   "Engineering",
		},
	}

	// Mostrar datos de la posición
	positionJSON, _ := json.MarshalIndent(testPosition, "", "  ")
	fmt.Printf("Posición a crear:\n%s\n\n", string(positionJSON))

	// Intentar crear la posición
	createdPosition, err := client.CreatePosition(testPosition)
	if err != nil {
		fmt.Printf("❌ Error creando posición: %v\n", err)
	} else {
		fmt.Printf("✅ Posición creada exitosamente\n")
		createdJSON, _ := json.MarshalIndent(createdPosition, "", "  ")
		fmt.Printf("Posición creada:\n%s\n", string(createdJSON))
	}
}

// RunAllTests ejecuta todas las pruebas
func RunAllTests() {
	log.Println("Iniciando pruebas del módulo de reclutamiento...")

	// Probar conectividad básica
	TestIntelliscreenAPI()

	// Probar creación de candidato
	TestCreateCandidate()

	// Probar creación de posición
	TestCreatePosition()

	log.Println("Pruebas completadas.")
}