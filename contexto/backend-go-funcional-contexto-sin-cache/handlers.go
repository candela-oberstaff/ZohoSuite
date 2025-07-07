package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// getContacts obtiene contactos con paginación y búsqueda
func getContacts(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	search := c.Query("search")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 200 {
		limit = 20
	}

	params := map[string]string{
		"page":     strconv.Itoa(page),
		"per_page": strconv.Itoa(limit),
		"fields":   "First_Name,Last_Name,Email,Phone,id,Created_Time,Modified_Time",
	}

	if search != "" {
		params["criteria"] = fmt.Sprintf("(First_Name:contains:%s)or(Last_Name:contains:%s)or(Email:contains:%s)", search, search, search)
	}

	response, err := fetchZohoData("Contacts", params)
	if err != nil {
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	if response == nil || response.Data == nil {
		c.JSON(200, ApiResponse{
			Success: true,
			Data: gin.H{
				"items":      []interface{}{},
				"total":      0,
				"page":       page,
				"pageSize":   limit,
				"totalPages": 0,
			},
		})
		return
	}

	// Calcular total aproximado basado en la paginación
	total := response.Info.Count
	totalPages := 1

	// Si hay más registros, calcular un total aproximado
	if response.Info.MoreRecords {
		// Para páginas intermedias, estimamos que hay al menos una página más
		total = page*limit + 1
		totalPages = page + 1
	} else {
		// En la última página, calculamos el total exacto
		total = (page-1)*limit + response.Info.Count
		totalPages = page
	}

	c.JSON(200, ApiResponse{
		Success: true,
		Data: gin.H{
			"items":       response.Data,
			"total":       total,
			"page":        page,
			"pageSize":    limit,
			"totalPages":  totalPages,
			"moreRecords": response.Info.MoreRecords,
		},
	})
}

// getContactByID obtiene un contacto específico por ID
func getContactByID(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "ID de contacto requerido",
		})
		return
	}

	params := map[string]string{
		"fields": "First_Name,Last_Name,Email,Phone,id,Created_Time,Modified_Time",
	}

	response, err := fetchZohoData("Contacts/"+id, params)
	if err != nil {
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	if response == nil || response.Data == nil || len(response.Data) == 0 {
		c.JSON(404, ApiResponse{
			Success: false,
			Error:   "Contacto no encontrado",
		})
		return
	}

	c.JSON(200, ApiResponse{
		Success: true,
		Data:    response.Data[0],
	})
}

// getModules obtiene los módulos disponibles en Bigin
func getModules(c *gin.Context) {
	response, err := fetchZohoData("settings/modules", nil)
	if err != nil {
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	if response == nil || response.Data == nil {
		c.JSON(200, ApiResponse{
			Success: true,
			Data:    []interface{}{},
		})
		return
	}

	c.JSON(200, ApiResponse{
		Success: true,
		Data:    response.Data,
	})
}

// getPipelines obtiene pipelines con filtrado opcional por ID
func getPipelines(c *gin.Context) {
	pipelineID := c.Query("pipeline_id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 200 {
		limit = 20
	}

	params := map[string]string{
		"page":     strconv.Itoa(page),
		"per_page": strconv.Itoa(limit),
		"fields":   "Deal_Name,Stage,Amount,Account_Name,Closing_Date,id,Created_Time,Modified_Time,Pipeline",
	}

	if pipelineID != "" {
		params["pipeline_id"] = pipelineID
	}

	response, err := fetchZohoData("Pipelines", params)
	if err != nil {
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	if response == nil || response.Data == nil {
		c.JSON(200, ApiResponse{
			Success: true,
			Data: gin.H{
				"pipelines":    []interface{}{},
				"page":         page,
				"limit":        limit,
				"total":        0,
				"more_records": false,
			},
		})
		return
	}

	c.JSON(200, ApiResponse{
		Success: true,
		Data: gin.H{
			"pipelines":    response.Data,
			"page":         page,
			"limit":        limit,
			"total":        response.Info.Count,
			"more_records": response.Info.MoreRecords,
		},
	})
}

// Estructura para un pipeline individual dentro de un Deal
type DealPipelineInfo struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// Estructura para un Deal cuando solo se pide el campo Pipeline
type DealWithPipeline struct {
	Pipeline DealPipelineInfo `json:"Pipeline"`
}

// getTeamPipelines obtiene los pipelines del equipo consultando el endpoint /Pipelines
func getTeamPipelines(c *gin.Context) {
	log.Println("Iniciando getTeamPipelines (estilo Python)")
	// Obtener datos del endpoint /Pipelines, solicitando solo el campo "Pipeline"
	// y un número generoso de registros para aumentar la probabilidad de encontrar todos los pipelines.
	response, err := fetchZohoData("Pipelines", map[string]string{
		"fields":   "Pipeline",
		"per_page": "200", // Máximo permitido por página
	})

	if err != nil {
		log.Printf("Error en fetchZohoData para /Pipelines: %v", err)
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   fmt.Sprintf("Error al obtener datos de pipelines: %v", err),
		})
		return
	}

	if response == nil || response.Data == nil {
		log.Println("No se recibieron datos o response.Data es nil desde /Pipelines")
		c.JSON(200, ApiResponse{
			Success: true,
			Data:    []DealPipelineInfo{}, // Devolver un slice vacío del tipo esperado
			Message: "No se encontraron pipelines.",
		})
		return
	}

	// Procesar los datos para extraer pipelines únicos
	teamPipelinesMap := make(map[string]DealPipelineInfo)
	dealsData := response.Data
	if dealsData == nil {
		log.Printf("Error: response.Data no es un []interface{}. Tipo: %T", response.Data)
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Formato de respuesta inesperado al procesar pipelines.",
		})
		return
	}

	log.Printf("Procesando %d deals para extraer pipelines", len(dealsData))
	for _, dealInterface := range dealsData {
		dealMap, ok := dealInterface.(map[string]interface{})
		if !ok {
			log.Printf("Advertencia: Elemento en dealsData no es un map[string]interface{}: %T", dealInterface)
			continue
		}

		pipelineField, ok := dealMap["Pipeline"]
		if !ok || pipelineField == nil {
			// log.Printf("Advertencia: Deal no tiene campo 'Pipeline' o es nil: %+v", dealMap)
			continue
		}

		pipelineData, ok := pipelineField.(map[string]interface{})
		if !ok {
			log.Printf("Advertencia: Campo 'Pipeline' no es un map[string]interface{}: %T", pipelineField)
			continue
		}

		var pipelineInfo DealPipelineInfo
		if idVal, found := pipelineData["id"]; found && idVal != nil {
			pipelineInfo.ID = fmt.Sprintf("%v", idVal)
		}
		if nameVal, found := pipelineData["name"]; found && nameVal != nil {
			pipelineInfo.Name = fmt.Sprintf("%v", nameVal)
		}

		if pipelineInfo.ID != "" && pipelineInfo.Name != "" {
			if _, exists := teamPipelinesMap[pipelineInfo.ID]; !exists {
				teamPipelinesMap[pipelineInfo.ID] = pipelineInfo
				log.Printf("Pipeline único encontrado: ID=%s, Name=%s", pipelineInfo.ID, pipelineInfo.Name)
			}
		}
	}

	// Convertir el mapa de pipelines únicos a un slice
	finalPipelinesList := make([]DealPipelineInfo, 0, len(teamPipelinesMap))
	for _, p := range teamPipelinesMap {
		finalPipelinesList = append(finalPipelinesList, p)
	}
	log.Printf("Total de pipelines únicos extraídos: %d", len(finalPipelinesList))

	c.JSON(200, ApiResponse{
		Success: true,
		Data:    finalPipelinesList,
	})
}

// testOberstaffPipeline - Endpoint de test para obtener y mostrar el pipeline Oberstaff con sus fases
func testOberstaffPipeline(c *gin.Context) {
	log.Printf("=== TEST OBERSTAFF PIPELINE - Iniciando ===")

	result := map[string]interface{}{
		"pipeline_info":   nil,
		"stages":          []interface{}{},
		"fields_metadata": nil,
		"errors":          []string{},
		"debug_info":      []string{},
	}

	// Paso 1: Intentar obtener pipelines desde settings
	log.Printf("Paso 1: Obteniendo pipelines desde settings/pipelines")
	result["debug_info"] = append(result["debug_info"].([]string), "Intentando obtener pipelines desde settings/pipelines")

	pipelinesResp, err := fetchZohoData("settings/pipelines", nil)
	if err != nil {
		if strings.Contains(err.Error(), "OAUTH_SCOPE_MISMATCH") {
			errorMsg := "Error de OAuth scope al acceder a settings/pipelines"
			log.Printf(errorMsg)
			result["errors"] = append(result["errors"].([]string), errorMsg)
			result["debug_info"] = append(result["debug_info"].([]string), "OAuth scope insuficiente para settings/pipelines")
		} else {
			errorMsg := fmt.Sprintf("Error obteniendo pipelines: %v", err)
			log.Printf(errorMsg)
			result["errors"] = append(result["errors"].([]string), errorMsg)
		}
	} else if pipelinesResp != nil && pipelinesResp.Data != nil {
		log.Printf("Pipelines obtenidos exitosamente: %d encontrados", len(pipelinesResp.Data))
		result["debug_info"] = append(result["debug_info"].([]string), fmt.Sprintf("Pipelines encontrados: %d", len(pipelinesResp.Data)))

		// Buscar pipeline Oberstaff
		for i, pipeline := range pipelinesResp.Data {
			pipelineMap, ok := pipeline.(map[string]interface{})
			if !ok {
				continue
			}

			name, exists := pipelineMap["name"]
			if exists {
				nameStr := fmt.Sprintf("%v", name)
				log.Printf("Pipeline %d: %s", i, nameStr)
				result["debug_info"] = append(result["debug_info"].([]string), fmt.Sprintf("Pipeline %d: %s", i, nameStr))

				if strings.Contains(strings.ToLower(nameStr), "oberstaff") {
					log.Printf("¡Pipeline Oberstaff encontrado!")
					result["pipeline_info"] = pipelineMap
					result["debug_info"] = append(result["debug_info"].([]string), "Pipeline Oberstaff encontrado")

					// Extraer información de stages si está disponible
					if stages, hasStages := pipelineMap["stages"]; hasStages {
						result["stages"] = stages
						log.Printf("Stages encontrados en pipeline: %+v", stages)
					}
					break
				}
			}
		}
	}

	// Paso 2: Intentar obtener metadata de campos del módulo Pipelines
	log.Printf("Paso 2: Obteniendo metadata de campos del módulo Pipelines")
	result["debug_info"] = append(result["debug_info"].([]string), "Obteniendo metadata de campos")

	fieldsResp, err := fetchZohoData("settings/fields", map[string]string{"module": "Pipelines"})
	if err != nil {
		errorMsg := fmt.Sprintf("Error obteniendo fields metadata: %v", err)
		log.Printf(errorMsg)
		result["errors"] = append(result["errors"].([]string), errorMsg)
	} else if fieldsResp != nil && fieldsResp.Data != nil {
		log.Printf("Fields metadata obtenido exitosamente")
		result["fields_metadata"] = fieldsResp.Data
		result["debug_info"] = append(result["debug_info"].([]string), "Fields metadata obtenido")

		// Buscar campo Stage para obtener pick list values
		for _, field := range fieldsResp.Data {
			fieldMap, ok := field.(map[string]interface{})
			if !ok {
				continue
			}

			if apiName, exists := fieldMap["api_name"]; exists && apiName == "Stage" {
				log.Printf("Campo Stage encontrado: %+v", fieldMap)
				if pickList, hasPickList := fieldMap["pick_list_values"]; hasPickList {
					result["stages"] = pickList
					log.Printf("Pick list values para Stage: %+v", pickList)
					result["debug_info"] = append(result["debug_info"].([]string), "Stages obtenidos desde pick_list_values")
				}
				break
			}
		}
	}

	// Paso 3: Intentar obtener algunas oportunidades existentes para ver su estructura
	log.Printf("Paso 3: Obteniendo muestra de oportunidades existentes")
	result["debug_info"] = append(result["debug_info"].([]string), "Obteniendo muestra de oportunidades")

	dealsResp, err := fetchZohoData("Pipelines", map[string]string{
		"per_page": "5",
		"fields": "Deal_Name,Stage,Pipeline,Sub_Pipeline,Amount,Account_Name,id,Created_Time",
	})
	if err != nil {
		errorMsg := fmt.Sprintf("Error obteniendo oportunidades de muestra: %v", err)
		log.Printf(errorMsg)
		result["errors"] = append(result["errors"].([]string), errorMsg)
	} else if dealsResp != nil && dealsResp.Data != nil {
		log.Printf("Oportunidades de muestra obtenidas: %d", len(dealsResp.Data))
		result["sample_opportunities"] = dealsResp.Data
		result["debug_info"] = append(result["debug_info"].([]string), fmt.Sprintf("Muestra de %d oportunidades obtenida", len(dealsResp.Data)))

		// Analizar estructura de las oportunidades
		for i, deal := range dealsResp.Data {
			dealMap, ok := deal.(map[string]interface{})
			if !ok {
				continue
			}

			log.Printf("Oportunidad %d estructura: Pipeline=%v, Stage=%v, Sub_Pipeline=%v",
				i, dealMap["Pipeline"], dealMap["Stage"], dealMap["Sub_Pipeline"])

			if i == 0 { // Solo loggear la primera para no saturar
				result["debug_info"] = append(result["debug_info"].([]string),
					fmt.Sprintf("Estructura ejemplo - Pipeline: %v, Stage: %v, Sub_Pipeline: %v",
						dealMap["Pipeline"], dealMap["Stage"], dealMap["Sub_Pipeline"]))
			}
		}
	}

	log.Printf("=== TEST OBERSTAFF PIPELINE - Completado ===")

	c.JSON(200, ApiResponse{
		Success: true,
		Data:    result,
		Message: "Test del pipeline Oberstaff completado",
	})
}

// getPipelineFields obtiene los campos y stages específicos del pipeline Oberstaff
func getPipelineFields(c *gin.Context) {
	log.Printf("Iniciando obtención de campos del pipeline Oberstaff")

	// Paso 1: Obtener team pipelines usando la función getTeamPipelines actualizada
	pipelinesResponse, err := fetchZohoData("Pipelines", map[string]string{
		"fields":   "Pipeline",
		"per_page": "200",
	})

	if err != nil {
		log.Printf("Error obteniendo pipelines en getPipelineFields: %v", err)
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   fmt.Sprintf("Error obteniendo pipelines: %v", err),
		})
		return
	}

	var oberstaffPipelineID, oberstaffPipelineName string
	if pipelinesResponse != nil && pipelinesResponse.Data != nil {
		teamPipelinesMap := make(map[string]DealPipelineInfo)
		dealsData := pipelinesResponse.Data
		if dealsData != nil {
			for _, dealInterface := range dealsData {
				dealMap, ok := dealInterface.(map[string]interface{})
				if !ok { continue }
				pipelineField, ok := dealMap["Pipeline"]
				if !ok || pipelineField == nil { continue }
				pipelineData, ok := pipelineField.(map[string]interface{})
				if !ok { continue }

				var pipelineInfo DealPipelineInfo
				if idVal, found := pipelineData["id"]; found && idVal != nil {
					pipelineInfo.ID = fmt.Sprintf("%v", idVal)
				}
				if nameVal, found := pipelineData["name"]; found && nameVal != nil {
					pipelineInfo.Name = fmt.Sprintf("%v", nameVal)
				}

				if pipelineInfo.ID != "" && pipelineInfo.Name != "" {
					if _, exists := teamPipelinesMap[pipelineInfo.ID]; !exists {
						teamPipelinesMap[pipelineInfo.ID] = pipelineInfo
					}
				}
			}
		} else {
			log.Printf("Error: pipelinesResponse.Data no es un []interface{} en getPipelineFields. Tipo: %T", pipelinesResponse.Data)
			c.JSON(500, ApiResponse{ Success: false, Error: "Formato de respuesta inesperado al procesar pipelines."})
			return
		}

		// Buscar el pipeline Oberstaff en los pipelines extraídos
		for _, pInfo := range teamPipelinesMap {
			if strings.Contains(strings.ToLower(pInfo.Name), "oberstaff") {
				oberstaffPipelineID = pInfo.ID
				oberstaffPipelineName = pInfo.Name
				log.Printf("Pipeline Oberstaff encontrado: ID=%s, Nombre=%s", oberstaffPipelineID, oberstaffPipelineName)
				break
			}
		}
	}

	if oberstaffPipelineID == "" {
		log.Printf("Pipeline Oberstaff no encontrado después de buscar en todos los pipelines.")
		c.JSON(404, ApiResponse{
			Success: false,
			Error:   "Pipeline Oberstaff no encontrado. Verifique que exista y tenga oportunidades asociadas.",
		})
		return
	}

	// Paso 2: Intentar obtener layouts metadata para el pipeline específico
	var oberstaffStages []PickListValue
	params := map[string]string{
		"module": "Pipelines", // Módulo correcto para layouts de pipelines
	}

	log.Printf("Obteniendo layouts metadata para el módulo Pipelines, buscando layout que contenga '%s' en el nombre", oberstaffPipelineName)
	resp, err := makeZohoRequest("GET", "/settings/layouts", params, nil)
	if err == nil {
		defer resp.Body.Close()
		body, errRead := io.ReadAll(resp.Body)
		if errRead == nil && resp.StatusCode == 200 {
			var layoutsResp struct {
				Layouts []map[string]interface{} `json:"layouts"`
			}

			if errUnmarshal := json.Unmarshal(body, &layoutsResp); errUnmarshal == nil {
				log.Printf("Layouts encontrados: %d", len(layoutsResp.Layouts))

				foundLayoutForPipeline := false
				for _, layout := range layoutsResp.Layouts {
					layoutName, nameExists := layout["name"].(string)
					// Comprobar si el layout pertenece al pipeline Oberstaff por su ID o nombre
					// Esto asume que el layout puede tener un nombre que referencie al pipeline
					// o que el ID del pipeline esté en alguna propiedad del layout (requiere conocer la estructura exacta)
					if nameExists && strings.Contains(strings.ToLower(layoutName), strings.ToLower(oberstaffPipelineName)) {
						log.Printf("Layout '%s' coincide con el nombre del pipeline Oberstaff ('%s')", layoutName, oberstaffPipelineName)
						foundLayoutForPipeline = true
						if sections, sectionsExist := layout["sections"].([]interface{}); sectionsExist {
							for _, section := range sections {
								if sectionMap, sectionIsMap := section.(map[string]interface{}); sectionIsMap {
									if fields, fieldsExist := sectionMap["fields"].([]interface{}); fieldsExist {
										for _, field := range fields {
											if fieldMap, fieldIsMap := field.(map[string]interface{}); fieldIsMap {
												if apiName, apiNameExists := fieldMap["api_name"].(string); apiNameExists && apiName == "Stage" {
													if pickListValues, plvExists := fieldMap["pick_list_values"].([]interface{}); plvExists {
														log.Printf("Stages encontrados en layout '%s' para el campo Stage: %d", layoutName, len(pickListValues))
														for _, pickListItem := range pickListValues {
															if pickListMap, plmIsMap := pickListItem.(map[string]interface{}); plmIsMap {
																displayValue := fmt.Sprintf("%v", pickListMap["display_value"])
																actualValue := fmt.Sprintf("%v", pickListMap["actual_value"])
																oberstaffStages = append(oberstaffStages, PickListValue{
																	DisplayValue: displayValue,
																	ActualValue:  actualValue,
																})
															}
														}
														goto stagesProcessedFromLayout // Salir si se encontraron stages
													}
												}
											}
										}
									}
								}
							}
						}
						// Si se procesó un layout que coincide con el nombre del pipeline, no seguir buscando.
						break
					}
				}
				if !foundLayoutForPipeline {
					log.Printf("No se encontró un layout específico para el pipeline '%s' por nombre. Se intentará obtener stages de los registros.", oberstaffPipelineName)
				}
			stagesProcessedFromLayout:
			} else {
				log.Printf("Error al decodificar JSON de layouts: %v. Body: %s", errUnmarshal, string(body))
			}
		} else if errRead != nil {
			log.Printf("Error al leer cuerpo de respuesta de layouts: %v", errRead)
		} else {
			log.Printf("Error en la respuesta de layouts: StatusCode %d. Body: %s", resp.StatusCode, string(body))
			// Si hay un error de scope, el log ya lo indica makeZohoRequest
		}
	} else {
		log.Printf("Error en la petición a /settings/layouts: %v", err)
	}

	// Paso 3: Si no se encontraron stages en layouts, obtener desde registros del pipeline
	if len(oberstaffStages) == 0 {
		log.Printf("No se encontraron stages en layouts (o hubo un error), obteniendo desde registros del pipeline Oberstaff ID: %s", oberstaffPipelineID)
		uniqueStages := make(map[string]bool)

		// Iterar por páginas para obtener todos los deals del pipeline Oberstaff
		currentPage := 1
		for {
			paramsRecords := map[string]string{
				"pipeline_id": oberstaffPipelineID,
				"fields":      "Stage", // Solo necesitamos el campo Stage
				"per_page":    "200",
				"page":        strconv.Itoa(currentPage),
			}

			recordsResp, errRecords := fetchZohoData("Pipelines", paramsRecords)
			if errRecords != nil {
				log.Printf("Error obteniendo registros del pipeline Oberstaff (página %d): %v", currentPage, errRecords)
				// No necesariamente fatal, podríamos tener stages de páginas anteriores
				break
			}

			if recordsResp != nil && recordsResp.Data != nil && len(recordsResp.Data) > 0 {
				log.Printf("Registros encontrados en pipeline Oberstaff (página %d): %d", currentPage, len(recordsResp.Data))
				for _, record := range recordsResp.Data {
					recordMap, ok := record.(map[string]interface{})
					if !ok { continue }
					if stage, exists := recordMap["Stage"]; exists {
						stageStr := fmt.Sprintf("%v", stage)
						if stageStr != "" && stageStr != "<nil>" && !uniqueStages[stageStr] {
							uniqueStages[stageStr] = true
							log.Printf("Stage único encontrado en registros: %s", stageStr)
						}
					}
				}
			} else {
				log.Printf("No se encontraron más registros para el pipeline Oberstaff en la página %d o recordsResp.Data es nil/vacío.", currentPage)
			}
			// Después de obtener todos los registros para la etapa actual
			if recordsResp.Info.MoreRecords { // Changed from recordsResp.Info != nil
				currentPage++
			} else {
				break // No hay más registros
			}
		}

		// Convertir a formato PickListValue
		for stage := range uniqueStages {
			oberstaffStages = append(oberstaffStages, PickListValue{
				DisplayValue: stage,
				ActualValue:  stage, // Asumimos que display y actual son iguales si vienen de registros
			})
		}
		// Ordenar alfabéticamente para consistencia, aunque el orden de Zoho puede ser diferente
		sort.Slice(oberstaffStages, func(i, j int) bool {
			return oberstaffStages[i].DisplayValue < oberstaffStages[j].DisplayValue
		})
	}

	// Si AÚN no se encontraron stages, es un problema real.
	if len(oberstaffStages) == 0 {
		log.Printf("ALERTA: No se pudieron obtener stages para el pipeline Oberstaff (ID: %s, Nombre: %s) desde layouts NI desde registros existentes. Esto indica un problema o que el pipeline no tiene etapas definidas o no tiene oportunidades.", oberstaffPipelineID, oberstaffPipelineName)
		c.JSON(404, ApiResponse{
			Success: false,
			Error:   fmt.Sprintf("No se pudieron determinar las etapas para el pipeline '%s'. Verifique la configuración del pipeline en Zoho Bigin.", oberstaffPipelineName),
			Data: gin.H{
				"pipeline_id":   oberstaffPipelineID,
				"pipeline_name": oberstaffPipelineName,
				"stages":        []PickListValue{},
			},
		})
		return
	}

	log.Printf("Stages finales para Oberstaff (ID: %s): %d encontrados", oberstaffPipelineID, len(oberstaffStages))
	c.JSON(200, ApiResponse{
		Success: true,
		Data: gin.H{
			"pipeline_id":   oberstaffPipelineID,
			"pipeline_name": oberstaffPipelineName,
			"stages":        oberstaffStages,
			// "stage_field": nil, // Podríamos intentar obtener la metadata del campo Stage si es necesario
		},
		Message: "Campos y etapas del pipeline Oberstaff obtenidos.",
	})
}

// getOberstaffPipeline obtiene específicamente el embudo Oberstaff y todas sus oportunidades
func getOberstaffPipeline(c *gin.Context) {
	log.Printf("Iniciando obtención del pipeline Oberstaff")

	// Obtener todas las oportunidades con paginación basada en page_token
	var allOpportunities []interface{}
	var oberstaffPipeline map[string]interface{}
	var pageToken string
	moreRecords := true
	maxIterations := 50 // Límite de seguridad para evitar bucles infinitos
	iteration := 0

	for moreRecords && iteration < maxIterations {
		iteration++
		log.Printf("Obteniendo oportunidades - iteración %d", iteration)

		// Parámetros para la solicitud
		params := map[string]string{
			"fields":   "Deal_Name,Stage,Amount,Account_Name,Closing_Date,id,Created_Time,Modified_Time,Pipeline",
			"per_page": "200", // Máximo permitido por Zoho
		}

		// Agregar page_token si existe (para páginas posteriores a la primera)
		if pageToken != "" {
			params["page_token"] = pageToken
			log.Printf("Usando page_token: %s", pageToken)
		}

		// Obtener oportunidades de esta página
		dealsResp, err := fetchZohoData("Pipelines", params)
		if err != nil {
			log.Printf("Error obteniendo oportunidades (iteración %d): %v", iteration, err)
			// Si es un error de scope, intentar con un enfoque diferente
			if strings.Contains(err.Error(), "OAUTH_SCOPE_MISMATCH") {
				log.Printf("Error de scope detectado, intentando enfoque alternativo")
				// Devolver respuesta vacía pero exitosa para evitar errores en el frontend
				c.JSON(200, ApiResponse{
					Success: true,
					Data: OberstaffPipelineResponse{
						Opportunities: []interface{}{},
						Pipeline: map[string]interface{}{
							"id":   "oberstaff-pipeline",
							"name": "Pipeline Oberstaff",
						},
						Total: 0,
					},
					Message: "Acceso limitado: algunos datos pueden no estar disponibles debido a permisos de OAuth",
				})
				return
			}
			// Si es un error de límite de paginación, intentar con menos registros
			if strings.Contains(err.Error(), "DISCRETE_PAGINATION_LIMIT_EXCEEDED") {
				log.Printf("Límite de paginación excedido, finalizando búsqueda con %d oportunidades encontradas", len(allOpportunities))
				break
			}
			c.JSON(500, ApiResponse{
				Success: false,
				Error:   "Error al obtener oportunidades: " + err.Error(),
			})
			return
		}

		if dealsResp == nil || dealsResp.Data == nil {
			log.Printf("Respuesta de oportunidades vacía en iteración %d", iteration)
			break
		}

		log.Printf("Iteración %d: %d oportunidades obtenidas", iteration, len(dealsResp.Data))

		// Procesar oportunidades de esta página
		for i, deal := range dealsResp.Data {
			dealMap, ok := deal.(map[string]interface{})
			if !ok {
				log.Printf("Deal %d en iteración %d no es un mapa válido", i, iteration)
				continue
			}

			// Verificar el pipeline del deal
			pipelineInfo, exists := dealMap["Pipeline"]
			if !exists {
				continue
			}

			pipelineMap, ok := pipelineInfo.(map[string]interface{})
			if !ok {
				continue
			}

			pipelineName, exists := pipelineMap["name"]
			if !exists {
				continue
			}

			pipelineNameStr, ok := pipelineName.(string)
			if !ok {
				continue
			}

			// Verificar si el pipeline contiene "Oberstaff"
			if strings.Contains(strings.ToLower(pipelineNameStr), "oberstaff") {
				log.Printf("Encontrada oportunidad de Oberstaff: %s", dealMap["Deal_Name"])
				allOpportunities = append(allOpportunities, deal)

				// Usar la información del pipeline del primer deal encontrado
				if oberstaffPipeline == nil {
					oberstaffPipeline = map[string]interface{}{
						"id":   pipelineMap["id"],
						"name": pipelineNameStr,
					}
				}
			}
		}

		// Verificar si hay más registros y obtener el siguiente page_token
		moreRecords = dealsResp.Info.MoreRecords
		if moreRecords {
			pageToken = dealsResp.Info.NextPageToken
			if pageToken == "" {
				log.Printf("No se encontró next_page_token, finalizando paginación")
				break
			}
		}
	}

	// Si no se encontró el pipeline Oberstaff, crear uno por defecto
	if oberstaffPipeline == nil {
		oberstaffPipeline = map[string]interface{}{
			"id":   "oberstaff-pipeline",
			"name": "Pipeline Oberstaff",
		}
	}

	log.Printf("Total de oportunidades Oberstaff encontradas: %d", len(allOpportunities))

	response := OberstaffPipelineResponse{
		Opportunities: allOpportunities,
		Pipeline:      oberstaffPipeline,
		Total:         len(allOpportunities),
	}

	log.Printf("Enviando respuesta exitosa con %d oportunidades", len(allOpportunities))

	c.JSON(200, ApiResponse{
		Success: true,
		Data:    response,
	})
}

// getOpportunities obtiene oportunidades con paginación optimizada
func getOpportunities(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	pipelineID := c.Query("pipeline_id")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 200 {
		limit = 20
	}

	params := map[string]string{
		"per_page": strconv.Itoa(limit),
		"page":     strconv.Itoa(page),
		"fields":   "Deal_Name,Stage,Amount,Account_Name,Closing_Date,id,Created_Time,Modified_Time,Pipeline",
	}

	if pipelineID != "" {
		params["pipeline_id"] = pipelineID
	}

	response, err := fetchZohoData("Pipelines", params)
	if err != nil {
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	if response == nil || response.Data == nil {
		c.JSON(200, ApiResponse{
			Success: true,
			Data: OpportunitiesResponse{
				Opportunities: []interface{}{},
				Pipeline:      gin.H{"name": "Pipeline Principal"},
				Page:          page,
				Limit:         limit,
				Total:         0,
			},
		})
		return
	}

	// Extraer información del pipeline de la primera oportunidad
	pipelineInfo := gin.H{"name": "Pipeline Principal"}
	if len(response.Data) > 0 {
		firstOpp, ok := response.Data[0].(map[string]interface{})
		if ok {
			if pipeline, exists := firstOpp["Pipeline"]; exists && pipeline != nil {
				pipelineMap, ok := pipeline.(map[string]interface{})
				if ok {
					pipelineInfo = gin.H{
						"id":   pipelineMap["id"],
						"name": pipelineMap["name"],
					}
				}
			}
		}
	}

	result := OpportunitiesResponse{
		Opportunities: response.Data,
		Pipeline:      pipelineInfo,
		Page:          page,
		Limit:         limit,
		Total:         response.Info.Count,
		MoreRecords:   response.Info.MoreRecords,
	}

	c.JSON(200, ApiResponse{
		Success: true,
		Data:    result,
	})
}

// getOpportunityByID obtiene una oportunidad específica por su ID
func getOpportunityByID(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "ID de oportunidad no proporcionado",
		})
		return
	}

	log.Printf("Obteniendo oportunidad con ID: %s", id)

	// Parámetros para la solicitud
	params := map[string]string{
		"fields": "Deal_Name,Stage,Amount,Account_Name,Closing_Date,id,Created_Time,Modified_Time,Pipeline,Contact_Name",
	}

	// Hacer la solicitud a la API de Zoho Bigin
	resp, err := makeZohoRequest("GET", "/Pipelines/"+id, params, nil)
	if err != nil {
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al obtener la oportunidad: " + err.Error(),
		})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al leer la respuesta: " + err.Error(),
		})
		return
	}

	if resp.StatusCode != 200 {
		c.JSON(resp.StatusCode, ApiResponse{
			Success: false,
			Error:   fmt.Sprintf("Error al obtener la oportunidad (código %d): %s", resp.StatusCode, string(body)),
		})
		return
	}

	// Decodificar la respuesta
	var opportunityResp struct {
		Data []map[string]interface{} `json:"data"`
	}

	if err := json.Unmarshal(body, &opportunityResp); err != nil {
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al decodificar la respuesta: " + err.Error(),
		})
		return
	}

	if len(opportunityResp.Data) == 0 {
		c.JSON(404, ApiResponse{
			Success: false,
			Error:   "Oportunidad no encontrada",
		})
		return
	}

	// Devolver la oportunidad encontrada
	c.JSON(200, ApiResponse{
		Success: true,
		Data:    opportunityResp.Data[0],
		Message: "Oportunidad obtenida exitosamente",
	})
}

// getPipelineMetadata obtiene los metadatos de pipelines disponibles en Zoho Bigin
func getPipelineMetadata(c *gin.Context) {
	log.Printf("Iniciando obtención de metadatos de pipelines")

	// Hacer una solicitud a la API de Zoho Bigin para obtener los metadatos de layouts
	resp, err := makeZohoRequest("GET", "/settings/layouts", map[string]string{"module": "Pipelines"}, nil)
	if err != nil {
		log.Printf("Error al obtener metadatos de layouts: %v", err)
		c.JSON(http.StatusInternalServerError, ApiResponse{
			Success: false,
			Error:   "Error al obtener metadatos de layouts: " + err.Error(),
		})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Error al leer respuesta de layouts: %v", err)
		c.JSON(http.StatusInternalServerError, ApiResponse{
			Success: false,
			Error:   "Error al leer respuesta de layouts: " + err.Error(),
		})
		return
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("Error en la respuesta de layouts: StatusCode %d. Body: %s", resp.StatusCode, string(body))
		c.JSON(resp.StatusCode, ApiResponse{
			Success: false,
			Error:   fmt.Sprintf("Error al obtener metadatos de layouts: StatusCode %d", resp.StatusCode),
		})
		return
	}

	var layoutsResp struct {
		Layouts []map[string]interface{} `json:"layouts"`
	}

	if err := json.Unmarshal(body, &layoutsResp); err != nil {
		log.Printf("Error al decodificar JSON de layouts: %v. Body: %s", err, string(body))
		c.JSON(http.StatusInternalServerError, ApiResponse{
			Success: false,
			Error:   "Error al decodificar respuesta de layouts: " + err.Error(),
		})
		return
	}

	log.Printf("Layouts encontrados: %d", len(layoutsResp.Layouts))

	// Procesar los layouts para extraer información relevante
	var pipelineLayouts []map[string]interface{}
	for _, layout := range layoutsResp.Layouts {
		layoutInfo := map[string]interface{}{
			"id":   layout["id"],
			"name": layout["name"],
		}

		// Extraer información de secciones y campos si están disponibles
		if sections, ok := layout["sections"].([]interface{}); ok {
			var fieldsInfo []map[string]interface{}
			for _, section := range sections {
				if sectionMap, ok := section.(map[string]interface{}); ok {
					if fields, ok := sectionMap["fields"].([]interface{}); ok {
						for _, field := range fields {
							if fieldMap, ok := field.(map[string]interface{}); ok {
								fieldInfo := map[string]interface{}{
									"api_name":      fieldMap["api_name"],
									"display_label": fieldMap["display_label"],
									"data_type":     fieldMap["data_type"],
								}

								// Extraer valores de lista de selección si están disponibles
								if pickListValues, ok := fieldMap["pick_list_values"].([]interface{}); ok {
									var values []map[string]string
									for _, plv := range pickListValues {
										if plvMap, ok := plv.(map[string]interface{}); ok {
											values = append(values, map[string]string{
												"display_value": fmt.Sprintf("%v", plvMap["display_value"]),
												"actual_value":  fmt.Sprintf("%v", plvMap["actual_value"]),
											})
										}
									}
									fieldInfo["pick_list_values"] = values
								}

								fieldsInfo = append(fieldsInfo, fieldInfo)
							}
						}
					}
				}
			}
			layoutInfo["fields"] = fieldsInfo
		}

		pipelineLayouts = append(pipelineLayouts, layoutInfo)
	}

	// También obtener información de pipelines desde el endpoint de settings/pipelines
	pipelinesResp, err := fetchZohoData("settings/pipelines", nil)
	var pipelinesInfo []interface{}
	if err == nil && pipelinesResp != nil && pipelinesResp.Data != nil {
		pipelinesInfo = pipelinesResp.Data
		log.Printf("Pipelines encontrados desde settings/pipelines: %d", len(pipelinesInfo))
	} else {
		log.Printf("No se pudieron obtener pipelines desde settings/pipelines: %v", err)
	}

	c.JSON(http.StatusOK, ApiResponse{
		Success: true,
		Data: gin.H{
			"layouts":   pipelineLayouts,
			"pipelines": pipelinesInfo,
		},
		Message: "Metadatos de pipelines obtenidos exitosamente",
	})
}

// createOpportunity crea una nueva oportunidad en Zoho Bigin con contacto asociado
func createOpportunity(c *gin.Context) {
	var opportunity OpportunityCreate
	if err := c.ShouldBindJSON(&opportunity); err != nil {
		c.JSON(400, ApiResponse{
			Success: false,
			Error:   "Datos de oportunidad inválidos: " + err.Error(),
		})
		return
	}

	var contactID string

	// Paso 1: Determinar el Pipeline ID y el valor correcto para Sub_Pipeline.
	// Se prioriza el opportunity.Pipeline enviado desde el frontend, asumiendo que es el ID del pipeline deseado (ej. Oberstaff).
	subPipelineID := opportunity.Pipeline // opportunity.Pipeline es el ID del pipeline enviado desde el frontend.

	if subPipelineID == "" || subPipelineID == "default" {
		log.Printf("Advertencia: No se proporcionó un ID de pipeline específico desde el frontend para la creación de la oportunidad. La oportunidad podría crearse en un pipeline incorrecto o la creación podría fallar.")
		// Considerar si se debe devolver un error aquí si un pipeline específico es estrictamente necesario.
	} else {
		log.Printf("Se utilizará el Pipeline ID '%s' (enviado como opportunity.Pipeline desde el frontend) para el campo Pipeline.", subPipelineID)
	}

	// Obtener el valor correcto para Sub_Pipeline basado en el layout del pipeline
	// Primero intentamos usar el valor proporcionado desde el frontend
	subPipelineValue := opportunity.SubPipeline

	// Si no se proporcionó un valor específico, usamos valores predeterminados sin consultar caché ni API
	if subPipelineValue == "" {
		// Para el pipeline Oberstaff (ID: 5974997000000091023)
		if subPipelineID == "5974997000000091023" {
			subPipelineValue = "Estándar"
			log.Printf("Usando valor predeterminado de Sub_Pipeline para Embudo Oberstaff: %s", subPipelineValue)
		} else {
			// Para otros pipelines, usamos "Embudo Test Standard" como valor predeterminado
			subPipelineValue = "Embudo Test Standard"
			log.Printf("Usando valor predeterminado de Sub_Pipeline: %s", subPipelineValue)
		}
	} else {
		log.Printf("Usando valor de Sub_Pipeline proporcionado desde el frontend: %s", subPipelineValue)
	}

	// Paso 2: Crear el contacto si se proporciona información
	if opportunity.AccountName != "" {
		contactName := opportunity.ContactName
		if contactName == "" {
			contactName = opportunity.AccountName
		}

		contactData := map[string]interface{}{
			"Last_Name": contactName,
		}

		if opportunity.ContactEmail != "" {
			contactData["Email"] = opportunity.ContactEmail
		}
		if opportunity.ContactPhone != "" {
			contactData["Phone"] = opportunity.ContactPhone
		}

		contactPayload := map[string]interface{}{
			"data": []interface{}{contactData},
		}

		log.Printf("Creando contacto: %+v", contactPayload)

		resp, err := makeZohoRequest("POST", "/Contacts", nil, contactPayload)
		if err != nil {
			c.JSON(500, ApiResponse{
				Success: false,
				Error:   "Error al crear contacto: " + err.Error(),
			})
			return
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			c.JSON(500, ApiResponse{
				Success: false,
				Error:   "Error al leer respuesta del contacto: " + err.Error(),
			})
			return
		}

		if resp.StatusCode == 201 {
			var contactResult ZohoCreateResponse
			if err := json.Unmarshal(body, &contactResult); err == nil {
				if len(contactResult.Data) > 0 {
					contactID = contactResult.Data[0].Details.ID
					log.Printf("Contacto creado exitosamente con ID: %s", contactID)
				}
			}
		} else {
			log.Printf("Error al crear contacto: %d - %s", resp.StatusCode, string(body))
			c.JSON(500, ApiResponse{
				Success: false,
				Error:   fmt.Sprintf("Error al crear contacto: %d", resp.StatusCode),
			})
			return
		}
	}

	// Paso 3: Crear la oportunidad
	// Según la documentación de Bigin, los campos obligatorios son: Deal_Name, Sub_Pipeline, Stage
	opportunityData := map[string]interface{}{
		"Deal_Name": opportunity.DealName,
	}

	// Configurar Pipeline y Sub_Pipeline según el ejemplo de la documentación
	if subPipelineID != "" && subPipelineID != "default" {
		// Configurar Pipeline como un objeto con id
		opportunityData["Pipeline"] = map[string]interface{}{
			"id": subPipelineID,
		}
		
		// Configurar Sub_Pipeline con el valor obtenido anteriormente
		// IMPORTANTE: Para el pipeline Oberstaff (ID: 5974997000000091023) el valor DEBE ser "Estándar"
		if subPipelineID == "5974997000000091023" {
			subPipelineValue = "Estándar"
			log.Printf("Forzando valor de Sub_Pipeline para Embudo Oberstaff a: %s", subPipelineValue)
		}
		opportunityData["Sub_Pipeline"] = subPipelineValue
		
		log.Printf("Asignando oportunidad al Pipeline ID: %s, Sub_Pipeline: %s", subPipelineID, subPipelineValue)
	} else {
		log.Printf("Advertencia: Pipeline ID no está disponible o es 'default'. La oportunidad podría no asignarse al pipeline correcto o la creación podría fallar. ID recibido: '%s'", subPipelineID)
		// Es importante que el frontend envíe un ID de pipeline válido en opportunity.Pipeline.
	}

	// Configurar Stage (obligatorio según la documentación)
	if opportunity.Stage != "" {
		opportunityData["Stage"] = opportunity.Stage
		log.Printf("Usando stage especificado: %s", opportunity.Stage)
	} else {
		// Usar el primer stage del pipeline Oberstaff como defecto
		// Valores comunes para el primer stage en pipelines de ventas
		opportunityData["Stage"] = "Qualification" // o "Lead", "Prospecting", etc.
		log.Printf("Usando stage por defecto: Qualification")
	}

	// Campos opcionales
	if opportunity.Amount != 0 {
		opportunityData["Amount"] = opportunity.Amount
	}
	if opportunity.ClosingDate != "" {
		opportunityData["Closing_Date"] = opportunity.ClosingDate
	}

	// Asociar el contacto a la oportunidad
	// Contact_Name es un campo obligatorio según el error MANDATORY_NOT_FOUND
	if contactID != "" {
		opportunityData["Contact_Name"] = contactID
		log.Printf("Asociando oportunidad al contacto ID: %s", contactID)
	} else if opportunity.ContactId != "" {
		// Usar el ID de contacto proporcionado directamente desde el frontend como Contact_Id
		opportunityData["Contact_Name"] = opportunity.ContactId
		log.Printf("Asociando oportunidad al contacto ID (desde frontend Contact_Id): %s", opportunity.ContactId)
	} else if opportunity.ContactName != "" {
		// Usar el ID de contacto proporcionado directamente desde el frontend como Contact_Name
		opportunityData["Contact_Name"] = opportunity.ContactName
		log.Printf("Asociando oportunidad al contacto ID (desde frontend Contact_Name): %s", opportunity.ContactName)
	} else {
		// Si no hay contacto, devolver un error indicando que es obligatorio seleccionar un contacto
		log.Printf("Error: No se proporcionó un contacto. El campo Contact_Name es obligatorio.")
		c.JSON(http.StatusBadRequest, ApiResponse{
			Success: false,
			Error:   "El campo 'Contacto Asociado' es obligatorio. Por favor, seleccione un contacto existente o cree uno nuevo.",
		})
		return
	}

	opportunityPayload := map[string]interface{}{
		"data": []interface{}{opportunityData},
	}

	log.Printf("Creando oportunidad con datos: %+v", opportunityPayload)

	// Usar el endpoint correcto para crear oportunidades (Pipelines es el módulo correcto)
	resp, err := makeZohoRequest("POST", "/Pipelines", nil, opportunityPayload)
	if err != nil {
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al crear oportunidad: " + err.Error(),
		})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   "Error al leer respuesta de la oportunidad: " + err.Error(),
		})
		return
	}

	if resp.StatusCode == 201 {
		var opportunityResult map[string]interface{}
		if err := json.Unmarshal(body, &opportunityResult); err == nil {
			c.JSON(201, ApiResponse{
				Success: true,
				Data: gin.H{
					"opportunity": opportunityResult["data"],
					"contact_id":  contactID,
					"pipeline_id": opportunity.Pipeline,
				},
				Message: "Contacto y oportunidad creados exitosamente en el pipeline Oberstaff",
			})
		} else {
			c.JSON(201, ApiResponse{
				Success: true,
				Message: "Oportunidad creada exitosamente en el pipeline Oberstaff",
			})
		}
	} else {
		log.Printf("Error al crear oportunidad: %d - %s", resp.StatusCode, string(body))
		c.JSON(500, ApiResponse{
			Success: false,
			Error:   fmt.Sprintf("Error al crear oportunidad: %d", resp.StatusCode),
		})
	}
}
