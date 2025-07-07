package main

import "time"

// ApiResponse estructura genérica para respuestas de la API
type ApiResponse struct {
	Success bool                   `json:"success"`
	Data    interface{}            `json:"data,omitempty"`
	Error   string                 `json:"error,omitempty"`
	Message string                 `json:"message,omitempty"`
	Meta    map[string]interface{} `json:"meta,omitempty"`
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

// Company estructura para empresas/cuentas de Zoho Bigin
type Company struct {
	ID           string    `json:"id"`
	AccountName  string    `json:"Account_Name"`
	Website      string    `json:"Website"`
	Phone        string    `json:"Phone"`
	Email        string    `json:"Email"`
	Industry     string    `json:"Industry"`
	AnnualRevenue float64  `json:"Annual_Revenue"`
	Employees    int       `json:"Employees"`
	Description  string    `json:"Description"`
	BillingStreet string   `json:"Billing_Street"`
	BillingCity  string    `json:"Billing_City"`
	BillingState string    `json:"Billing_State"`
	BillingCode  string    `json:"Billing_Code"`
	BillingCountry string  `json:"Billing_Country"`
	CreatedTime  time.Time `json:"Created_Time"`
	ModifiedTime time.Time `json:"Modified_Time"`
}

// CompanyCreate estructura para crear empresas/cuentas
type CompanyCreate struct {
	AccountName   string  `json:"Account_Name" binding:"required"`
	Website       string  `json:"Website,omitempty"`
	Phone         string  `json:"Phone,omitempty"`
	Email         string  `json:"Email,omitempty"`
	Industry      string  `json:"Industry,omitempty"`
	AnnualRevenue float64 `json:"Annual_Revenue,omitempty"`
	Employees     int     `json:"Employees,omitempty"`
	Description   string  `json:"Description,omitempty"`
	BillingStreet string  `json:"Billing_Street,omitempty"`
	BillingCity   string  `json:"Billing_City,omitempty"`
	BillingState  string  `json:"Billing_State,omitempty"`
	BillingCode   string  `json:"Billing_Code,omitempty"`
	BillingCountry string `json:"Billing_Country,omitempty"`
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
	DisplayValue   string              `json:"display_value"`
	ActualValue    string              `json:"actual_value"`
	SequenceNumber int                 `json:"sequence_number,omitempty"`
	APIName        string              `json:"api_name,omitempty"`
	Label          string              `json:"label,omitempty"`
	Values         []map[string]string `json:"values,omitempty"`
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
	Opportunities []interface{}          `json:"opportunities"`
	Pipeline      map[string]interface{} `json:"pipeline"`
	Total         int                    `json:"total"`
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

// BillingAddress estructura para direcciones de facturación
type BillingAddress struct {
	Attention    string `json:"attention,omitempty"`
	Street       string `json:"street,omitempty"`
	City         string `json:"city,omitempty"`
	State        string `json:"state,omitempty"`
	Zip          string `json:"zip,omitempty"`
	Country      string `json:"country,omitempty"`
	Fax          string `json:"fax,omitempty"`
	Phone        string `json:"phone,omitempty"`
}

// Customer estructura para clientes de Zoho Billing
type Customer struct {
	CustomerID    string         `json:"customer_id,omitempty"`
	DisplayName   string         `json:"display_name"`
	FirstName     string         `json:"first_name,omitempty"`
	LastName      string         `json:"last_name,omitempty"`
	Email         string         `json:"email,omitempty"`
	CompanyName   string         `json:"company_name,omitempty"`
	Phone         string         `json:"phone,omitempty"`
	Mobile        string         `json:"mobile,omitempty"`
	Website       string         `json:"website,omitempty"`
	BillingAddress *BillingAddress `json:"billing_address,omitempty"`
	Currency      string         `json:"currency_code,omitempty"`
	Notes         string         `json:"notes,omitempty"`
	CreatedTime   string         `json:"created_time,omitempty"`
	LastModifiedTime string      `json:"last_modified_time,omitempty"`
}

// CustomerCreate estructura para crear clientes en Zoho Billing
type CustomerCreate struct {
	DisplayName   string         `json:"display_name" binding:"required"`
	FirstName     string         `json:"first_name,omitempty"`
	LastName      string         `json:"last_name,omitempty"`
	Email         string         `json:"email,omitempty"`
	CompanyName   string         `json:"company_name,omitempty"`
	Phone         string         `json:"phone,omitempty"`
	Mobile        string         `json:"mobile,omitempty"`
	Website       string         `json:"website,omitempty"`
	BillingAddress *BillingAddress `json:"billing_address,omitempty"`
	Currency      string         `json:"currency_code,omitempty"`
	Notes         string         `json:"notes,omitempty"`
}

// CustomerResponse estructura para respuesta de clientes de Zoho Billing
type CustomerResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Customer Customer `json:"customer,omitempty"`
}

// CustomersResponse estructura para respuesta de lista de clientes de Zoho Billing
type CustomersResponse struct {
	Code      int    `json:"code"`
	Message   string `json:"message"`
	Customers []Customer `json:"customers,omitempty"`
	Page      int    `json:"page,omitempty"`
	PerPage   int    `json:"per_page,omitempty"`
	HasMorePage bool  `json:"has_more_page,omitempty"`
	AppliedFilters map[string]interface{} `json:"applied_filters,omitempty"`
}

// TransactionResponse representa la respuesta de la API de Zoho Billing para transacciones
type TransactionResponse struct {
	Code        int          `json:"code"`
	Message     string       `json:"message"`
	Transactions []Transaction `json:"transactions,omitempty"`
	// Campos adicionales que podrían estar en la respuesta
	Page        int          `json:"page,omitempty"`
	PerPage     int          `json:"per_page,omitempty"`
	HasMorePage bool         `json:"has_more_page,omitempty"`
}

// Transaction representa una transacción en Zoho Billing
type Transaction struct {
	TransactionID string  `json:"transaction_id"`
	ReferenceID   string  `json:"reference_id"`
	Date          string  `json:"date"`
	Type          string  `json:"type"`
	Status        string  `json:"status"`
	Amount        float64 `json:"amount"`
	// Campos adicionales que podrían estar en la respuesta
	CustomerID    string  `json:"customer_id,omitempty"`
	CustomerName  string  `json:"customer_name,omitempty"`
	Description   string  `json:"description,omitempty"`
	CurrencyCode  string  `json:"currency_code,omitempty"`
	CurrencySymbol string  `json:"currency_symbol,omitempty"`
}

// SubscriptionResponse representa la respuesta de la API de Zoho Billing para suscripciones
type SubscriptionResponse struct {
	Code          int           `json:"code"`
	Message       string        `json:"message"`
	Subscriptions []Subscription `json:"subscriptions,omitempty"`
	// Campos adicionales para paginación
	Page          int           `json:"page,omitempty"`
	PerPage       int           `json:"per_page,omitempty"`
	HasMorePage   bool          `json:"has_more_page,omitempty"`
}

// SubscriptionDetailResponse representa la respuesta de la API de Zoho Billing para el detalle de una suscripción
type SubscriptionDetailResponse struct {
	Code         int          `json:"code"`
	Message      string       `json:"message"`
	Subscription Subscription `json:"subscription,omitempty"`
}

// Subscription representa una suscripción en Zoho Billing
type Subscription struct {
	SubscriptionID    string  `json:"subscription_id"`
	Name              string  `json:"name"`
	CustomerID        string  `json:"customer_id"`
	CustomerName      string  `json:"customer_name,omitempty"`
	Status            string  `json:"status"`
	PlanName          string  `json:"plan_name,omitempty"`
	PlanCode          string  `json:"plan_code,omitempty"`
	Interval          int     `json:"interval,omitempty"`
	IntervalUnit      string  `json:"interval_unit,omitempty"`
	Amount            float64 `json:"amount,omitempty"`
	CurrencyCode      string  `json:"currency_code,omitempty"`
	CurrencySymbol    string  `json:"currency_symbol,omitempty"`
	CreatedTime       string  `json:"created_time,omitempty"`
	ActivatedAt       string  `json:"activated_at,omitempty"`
	CurrentTermStart  string  `json:"current_term_start,omitempty"`
	CurrentTermEnd    string  `json:"current_term_end,omitempty"`
	NextBillingAt     string  `json:"next_billing_at,omitempty"`
	LastBillingAt     string  `json:"last_billing_at,omitempty"`
	ReferenceID       string  `json:"reference_id,omitempty"`
}

// Plan estructura para planes de suscripción
type Plan struct {
	PlanCode        string  `json:"plan_code"`
	PlanName        string  `json:"plan_name"`
	Description     string  `json:"description"`
	Price           float64 `json:"price"`
	CurrencyCode    string  `json:"currency_code"`
	Interval        int     `json:"interval"`
	IntervalUnit    string  `json:"interval_unit"`
	TrialPeriod     int     `json:"trial_period"`
	TrialPeriodUnit string  `json:"trial_period_unit"`
	SetupFee        float64 `json:"setup_fee"`
	Status          string  `json:"status"`
	CreatedTime     string  `json:"created_time"`
	UpdatedTime     string  `json:"updated_time"`
}

// PlanResponse estructura para respuestas de planes
type PlanResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Plans   []Plan `json:"plans"`
}

// PlanDetailResponse estructura para respuesta de un plan específico
type PlanDetailResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Plan    Plan   `json:"plan"`
}

// CustomerDetailResponse representa la respuesta con información detallada de un cliente
type CustomerDetailResponse struct {
	Customer      Customer       `json:"customer"`
	Subscriptions []Subscription `json:"subscriptions,omitempty"`
	Transactions  []Transaction  `json:"transactions,omitempty"`
}

// ===== MÓDULO DE RECLUTAMIENTO - INTELLISCREEN =====

// Candidate estructura para candidatos de Intelliscreen
type Candidate struct {
	ID           string                 `json:"id"`
	Email        string                 `json:"email"`
	FirstName    string                 `json:"first_name"`
	LastName     string                 `json:"last_name"`
	Phone        string                 `json:"phone,omitempty"`
	Status       string                 `json:"status"`
	CreatedAt    time.Time              `json:"created_at"`
	UpdatedAt    time.Time              `json:"updated_at"`
	PersonalInfo map[string]interface{} `json:"personal_info,omitempty"`
	Education    []Education            `json:"education,omitempty"`
	WorkHistory  []WorkHistory          `json:"work_history,omitempty"`
	Skills       []Skill                `json:"skills,omitempty"`
	// Campos de integración con Zoho
	ZohoContactID string `json:"zoho_contact_id,omitempty"`
	ZohoCompanyID string `json:"zoho_company_id,omitempty"`
}

// Education estructura para educación del candidato
type Education struct {
	Institution string `json:"institution"`
	Degree      string `json:"degree"`
	FieldOfStudy string `json:"field_of_study,omitempty"`
	StartDate   string `json:"start_date,omitempty"`
	EndDate     string `json:"end_date,omitempty"`
	GPA         string `json:"gpa,omitempty"`
}

// WorkHistory estructura para historial laboral del candidato
type WorkHistory struct {
	Company     string `json:"company"`
	Position    string `json:"position"`
	StartDate   string `json:"start_date,omitempty"`
	EndDate     string `json:"end_date,omitempty"`
	Description string `json:"description,omitempty"`
}

// Skill estructura para habilidades del candidato
type Skill struct {
	Name  string `json:"name"`
	Level string `json:"level,omitempty"`
}

// Position estructura para posiciones de reclutamiento
type Position struct {
	ID              string                 `json:"id"`
	Title           string                 `json:"title"`
	Description     string                 `json:"description"`
	Requirements    string                 `json:"requirements,omitempty"`
	Status          string                 `json:"status"`
	CreatedAt       time.Time              `json:"created_at"`
	UpdatedAt       time.Time              `json:"updated_at"`
	Candidates      []PositionCandidate    `json:"candidates,omitempty"`
	Assessments     []string               `json:"assessments,omitempty"`
	// Campos de integración con Zoho
	ZohoOpportunityID string               `json:"zoho_opportunity_id,omitempty"`
	ZohoCompanyID     string               `json:"zoho_company_id,omitempty"`
	CustomFields      map[string]interface{} `json:"custom_fields,omitempty"`
}

// PositionCandidate estructura para candidatos en una posición específica
type PositionCandidate struct {
	CandidateID string    `json:"candidate_id"`
	Status      string    `json:"status"`
	AppliedAt   time.Time `json:"applied_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	AIScore     float64   `json:"ai_score,omitempty"`
	Notes       string    `json:"notes,omitempty"`
}

// Assessment estructura para evaluaciones
type Assessment struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Description string                 `json:"description,omitempty"`
	Type        string                 `json:"type"`
	Status      string                 `json:"status"`
	Tests       []Test                 `json:"tests,omitempty"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
	Settings    map[string]interface{} `json:"settings,omitempty"`
}

// Test estructura para tests individuales
type Test struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Type        string                 `json:"type"`
	Description string                 `json:"description,omitempty"`
	Questions   []TestQuestion         `json:"questions,omitempty"`
	TimeLimit   int                    `json:"time_limit,omitempty"`
	Settings    map[string]interface{} `json:"settings,omitempty"`
}

// TestQuestion estructura para preguntas de test
type TestQuestion struct {
	ID       string                 `json:"id"`
	Question string                 `json:"question"`
	Type     string                 `json:"type"`
	Options  []string               `json:"options,omitempty"`
	Settings map[string]interface{} `json:"settings,omitempty"`
}

// CandidateResult estructura para resultados de candidatos
type CandidateResult struct {
	CandidateID string                 `json:"candidate_id"`
	PositionID  string                 `json:"position_id"`
	AssessmentID string                `json:"assessment_id"`
	OverallScore float64               `json:"overall_score"`
	AIScore     float64                `json:"ai_score,omitempty"`
	TestResults []TestResult           `json:"test_results,omitempty"`
	Videos      []VideoResult          `json:"videos,omitempty"`
	CompletedAt time.Time              `json:"completed_at"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// TestResult estructura para resultados de tests individuales
type TestResult struct {
	TestID    string  `json:"test_id"`
	Score     float64 `json:"score"`
	MaxScore  float64 `json:"max_score"`
	TimeSpent int     `json:"time_spent,omitempty"`
	Answers   []TestAnswer `json:"answers,omitempty"`
}

// TestAnswer estructura para respuestas de test
type TestAnswer struct {
	QuestionID string      `json:"question_id"`
	Answer     interface{} `json:"answer"`
	IsCorrect  bool        `json:"is_correct,omitempty"`
	Score      float64     `json:"score,omitempty"`
}

// VideoResult estructura para resultados de videos
type VideoResult struct {
	VideoID     string `json:"video_id"`
	URL         string `json:"url"`
	Duration    int    `json:"duration,omitempty"`
	UploadedAt  time.Time `json:"uploaded_at"`
	Analysis    map[string]interface{} `json:"analysis,omitempty"`
}

// RecruitmentDashboard estructura para el dashboard de reclutamiento
type RecruitmentDashboard struct {
	TotalPositions    int                    `json:"total_positions"`
	ActivePositions   int                    `json:"active_positions"`
	TotalCandidates   int                    `json:"total_candidates"`
	ActiveCandidates  int                    `json:"active_candidates"`
	PendingEvaluations int                   `json:"pending_evaluations"`
	CompletedEvaluations int                 `json:"completed_evaluations"`
	RecentActivity    []RecruitmentActivity  `json:"recent_activity,omitempty"`
	TopPositions      []PositionSummary      `json:"top_positions,omitempty"`
	PerformanceMetrics map[string]interface{} `json:"performance_metrics,omitempty"`
}

// RecruitmentActivity estructura para actividad reciente
type RecruitmentActivity struct {
	ID          string    `json:"id"`
	Type        string    `json:"type"`
	Description string    `json:"description"`
	Timestamp   time.Time `json:"timestamp"`
	EntityID    string    `json:"entity_id,omitempty"`
	EntityType  string    `json:"entity_type,omitempty"`
}

// PositionSummary estructura para resumen de posiciones
type PositionSummary struct {
	ID              string  `json:"id"`
	Title           string  `json:"title"`
	CandidateCount  int     `json:"candidate_count"`
	AverageScore    float64 `json:"average_score"`
	Status          string  `json:"status"`
	ZohoCompanyName string  `json:"zoho_company_name,omitempty"`
}

// ===== ESTRUCTURAS DE RESPUESTA PARA INTELLISCREEN API =====

// IntelliscreenResponse estructura genérica para respuestas de Intelliscreen
type IntelliscreenResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
	Message string      `json:"message,omitempty"`
}

// CandidateListResponse estructura para lista de candidatos de Intelliscreen
type CandidateListResponse struct {
	Candidates []Candidate `json:"candidates"`
	Total      int         `json:"total"`
	Page       int         `json:"page,omitempty"`
	Limit      int         `json:"limit,omitempty"`
}

// PositionCreateRequest estructura para crear posiciones
type PositionCreateRequest struct {
	Title           string                 `json:"title" binding:"required"`
	Description     string                 `json:"description"`
	Requirements    string                 `json:"requirements,omitempty"`
	ZohoOpportunityID string               `json:"zoho_opportunity_id,omitempty"`
	ZohoCompanyID     string               `json:"zoho_company_id,omitempty"`
	Assessments       []string             `json:"assessments,omitempty"`
	CustomFields      map[string]interface{} `json:"custom_fields,omitempty"`
}

// CandidateInviteRequest estructura para invitar candidatos
type CandidateInviteRequest struct {
	Email     string `json:"email" binding:"required"`
	FirstName string `json:"first_name,omitempty"`
	LastName  string `json:"last_name,omitempty"`
	Message   string `json:"message,omitempty"`
}
