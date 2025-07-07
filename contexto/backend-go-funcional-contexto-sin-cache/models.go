package main

import "time"

// ApiResponse estructura genérica para respuestas de la API
type ApiResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
	Message string      `json:"message,omitempty"`
}

// Contact estructura para contactos
type Contact struct {
	ID           string    `json:"id"`
	FirstName    string    `json:"First_Name"`
	LastName     string    `json:"Last_Name"`
	Email        string    `json:"Email"`
	Phone        string    `json:"Phone"`
	CreatedTime  time.Time `json:"Created_Time"`
	ModifiedTime time.Time `json:"Modified_Time"`
}

// OpportunityCreate estructura para crear oportunidades
// Según la documentación de Bigin, los campos obligatorios son: Deal_Name, Sub_Pipeline, Stage
type OpportunityCreate struct {
	DealName     string  `json:"Deal_Name" binding:"required"`
	SubPipeline  string  `json:"Sub_Pipeline,omitempty"` // Campo obligatorio según la documentación
	Stage        string  `json:"Stage,omitempty"`        // Campo obligatorio según la documentación
	Amount       float64 `json:"Amount,omitempty"`
	AccountName  string  `json:"Account_Name,omitempty"`
	ContactName  string  `json:"Contact_Name,omitempty"` // ID del contacto para asociar
	ContactId    string  `json:"Contact_Id,omitempty"`   // Alternativa para el ID del contacto desde el frontend
	ContactEmail string  `json:"Contact_Email,omitempty"`
	ContactPhone string  `json:"Contact_Phone,omitempty"`
	ClosingDate  string  `json:"Closing_Date,omitempty"`
	Pipeline     string  `json:"Pipeline,omitempty"` // Mantenido para compatibilidad
}

// Opportunity estructura para oportunidades
type Opportunity struct {
	ID           string      `json:"id"`
	DealName     string      `json:"Deal_Name"`
	Stage        string      `json:"Stage"`
	Amount       float64     `json:"Amount"`
	AccountName  string      `json:"Account_Name"`
	ClosingDate  string      `json:"Closing_Date"`
	CreatedTime  time.Time   `json:"Created_Time"`
	ModifiedTime time.Time   `json:"Modified_Time"`
	Pipeline     interface{} `json:"Pipeline"`
}

// Pipeline estructura para pipelines
type Pipeline struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// Module estructura para módulos
type Module struct {
	APIName     string `json:"api_name"`
	DisplayName string `json:"display_name"`
	ID          string `json:"id"`
}

// PickListValue estructura para valores de lista desplegable
type PickListValue struct {
	DisplayValue string `json:"display_value"`
	ActualValue  string `json:"actual_value"`
}

// Field estructura para campos
type Field struct {
	APIName        string          `json:"api_name"`
	DisplayLabel   string          `json:"display_label"`
	PickListValues []PickListValue `json:"pick_list_values,omitempty"`
}

// PipelineFieldsResponse estructura para respuesta de campos de pipeline
type PipelineFieldsResponse struct {
	PipelineID   string          `json:"pipeline_id"`
	PipelineName string          `json:"pipeline_name"`
	Stages       []PickListValue `json:"stages"`
	StageField   Field           `json:"stage_field"`
}

// OpportunitiesResponse estructura para respuesta de oportunidades
type OpportunitiesResponse struct {
	Opportunities []interface{} `json:"opportunities"`
	Pipeline      interface{}   `json:"pipeline"`
	Page          int           `json:"page,omitempty"`
	Limit         int           `json:"limit,omitempty"`
	Total         int           `json:"total"`
	MoreRecords   bool          `json:"more_records,omitempty"`
}

// OberstaffPipelineResponse estructura para respuesta del pipeline Oberstaff
type OberstaffPipelineResponse struct {
	Opportunities []interface{} `json:"opportunities"`
	Pipeline      interface{}   `json:"pipeline"`
	Total         int           `json:"total"`
}

// ZohoResponse estructura genérica para respuestas de Zoho
type ZohoResponse struct {
	Data []interface{} `json:"data"`
	Info struct {
		Count         int    `json:"count"`
		MoreRecords   bool   `json:"more_records"`
		Page          int    `json:"page"`
		PerPage       int    `json:"per_page"`
		NextPageToken string `json:"next_page_token,omitempty"`
	} `json:"info"`
}

// ZohoCreateResponse estructura para respuestas de creación en Zoho
type ZohoCreateResponse struct {
	Data []struct {
		Details struct {
			ID string `json:"id"`
		} `json:"details"`
	} `json:"data"`
}
