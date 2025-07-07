# Módulo de Reclutamiento - Integración Intelliscreen + Zoho

## Descripción General

Este módulo integra la API de Intelliscreen para gestión de reclutamiento con el sistema existente de Zoho Bigin, proporcionando una solución completa para el proceso de contratación.

## Arquitectura Implementada

### 1. Módulo de Candidatos
- **Integración con Zoho**: Los candidatos se sincronizan automáticamente con contactos de Zoho Bigin
- **Gestión completa**: Creación, consulta y seguimiento de candidatos
- **Datos enriquecidos**: Información educativa, historial laboral y habilidades

### 2. Módulo de Posiciones
- **Vinculación con Oportunidades**: Las posiciones se pueden crear directamente desde oportunidades de Zoho Bigin
- **Seguimiento integrado**: Conexión bidireccional entre posiciones y oportunidades
- **Gestión de candidatos**: Asignación y seguimiento de candidatos por posición

### 3. Módulo de Evaluaciones
- **Sistema independiente**: Gestión de assessments y tests
- **Resultados con IA**: Puntuaciones automáticas y análisis inteligente
- **Multimedia**: Soporte para evaluaciones en video

### 4. Dashboard de Reclutamiento
- **Vista unificada**: Métricas y KPIs del proceso de reclutamiento
- **Actividad reciente**: Seguimiento de acciones y cambios
- **Integración Zoho**: Datos combinados de ambos sistemas

## API Endpoints

### Candidatos
```
GET    /api/recruitment/candidates                    # Listar candidatos
GET    /api/recruitment/candidates/:id                # Obtener candidato específico
POST   /api/recruitment/candidates                    # Crear nuevo candidato
GET    /api/recruitment/candidates/:id/results        # Obtener resultados de candidato
POST   /api/recruitment/candidates/:id/sync-zoho      # Sincronizar candidato con Zoho
```

### Posiciones
```
GET    /api/recruitment/positions                     # Listar posiciones
POST   /api/recruitment/positions                     # Crear nueva posición
GET    /api/recruitment/positions/:id                 # Obtener posición con datos de Zoho
GET    /api/recruitment/positions/:id/candidates      # Obtener candidatos de una posición
```

### Evaluaciones
```
GET    /api/recruitment/assessments                   # Listar evaluaciones disponibles
```

### Dashboard
```
GET    /api/recruitment/dashboard                     # Obtener métricas del dashboard
```

### Integración Zoho
```
POST   /api/recruitment/opportunities/:id/create-position     # Crear posición desde oportunidad
PUT    /api/recruitment/opportunities/:id/update-recruitment-data # Actualizar oportunidad con datos de reclutamiento
```

## Configuración

### Variables de Entorno
```bash
INTELLISCREEN_API_KEY=9cc1610f1cbb201b3123726765bc67b6
```

### Ejemplo de Uso con cURL
```bash
# Obtener candidatos
curl -X GET "http://localhost:8080/api/recruitment/candidates" \
  -H "Content-Type: application/json"

# Crear nueva posición
curl -X POST "http://localhost:8080/api/recruitment/positions" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Desarrollador Full Stack",
    "description": "Posición para desarrollador con experiencia en Go y React",
    "requirements": "3+ años de experiencia",
    "zoho_opportunity_id": "123456789"
  }'

# Crear posición desde oportunidad de Zoho
curl -X POST "http://localhost:8080/api/recruitment/opportunities/123456789/create-position" \
  -H "Content-Type: application/json"
```

## Estructuras de Datos Principales

### Candidate
```go
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
```

### Position
```go
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
```

## Flujo de Trabajo Recomendado

1. **Crear Posición desde Oportunidad**
   - Usar endpoint `/opportunities/:id/create-position`
   - La posición se vincula automáticamente con la oportunidad de Zoho

2. **Gestionar Candidatos**
   - Crear candidatos manualmente o importar desde Intelliscreen
   - Los candidatos se sincronizan automáticamente con Zoho como contactos

3. **Asignar Evaluaciones**
   - Configurar assessments para cada posición
   - Los candidatos completan evaluaciones en Intelliscreen

4. **Revisar Resultados**
   - Usar dashboard para vista general
   - Revisar resultados individuales con puntuaciones de IA

5. **Actualizar Zoho**
   - Los datos de reclutamiento se sincronizan de vuelta a las oportunidades
   - Métricas como número de candidatos y puntuaciones promedio

## Características Técnicas

- **Cliente HTTP robusto**: Manejo de errores y timeouts
- **Integración bidireccional**: Sincronización automática entre sistemas
- **Logging detallado**: Seguimiento de todas las operaciones
- **Validación de datos**: Verificación de integridad en todas las operaciones
- **Arquitectura modular**: Fácil extensión y mantenimiento

## Archivos del Módulo

- `models.go`: Estructuras de datos para reclutamiento
- `intelliscreen.go`: Cliente y funciones de la API de Intelliscreen
- `recruitment_integration.go`: Funciones de integración con Zoho
- `main.go`: Configuración de rutas y servidor

## Próximos Pasos

1. Implementar autenticación y autorización
2. Agregar notificaciones por email
3. Crear interfaz web para el dashboard
4. Implementar webhooks para sincronización en tiempo real
5. Agregar métricas avanzadas y reportes