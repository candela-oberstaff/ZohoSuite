# Zoho Bigin Backend - Go

Backend en Go para la interfaz de Zoho Bigin, reescrito desde Python/FastAPI para mejor rendimiento y concurrencia.

## Características

- **Alto rendimiento**: Escrito en Go para manejar múltiples usuarios concurrentes
- **API RESTful**: Compatible con el frontend React existente
- **Autenticación Zoho**: Manejo automático de tokens de acceso con cache
- **CORS configurado**: Permite conexiones desde el frontend
- **Paginación**: Soporte completo para paginación de datos
- **Gestión de errores**: Manejo robusto de errores y logging

## Requisitos

- Go 1.21 o superior
- Variables de entorno de Zoho configuradas

## Instalación

1. **Navegar al directorio del backend Go:**
   ```bash
   cd backend-go
   ```

2. **Instalar dependencias:**
   ```bash
   go mod download
   ```

3. **Configurar variables de entorno:**
   
   Crear un archivo `.env` en el directorio `backend-go` con:
   ```env
   ZOHO_CLIENT_ID=tu_client_id
   ZOHO_CLIENT_SECRET=tu_client_secret
   ZOHO_REFRESH_TOKEN=tu_refresh_token
   PORT=8000
   ```

## Ejecución

### Desarrollo
```bash
go run .
```

### Producción
```bash
# Compilar
go build -o zoho-bigin-backend

# Ejecutar
./zoho-bigin-backend
```

## Endpoints API

Todos los endpoints mantienen compatibilidad con el backend Python original:

### Contactos
- `GET /api/contacts` - Obtener contactos con paginación y búsqueda
- `GET /api/contacts/:id` - Obtener contacto específico

### Módulos y Pipelines
- `GET /api/modulos` - Obtener módulos disponibles
- `GET /api/pipelines` - Obtener pipelines con filtrado
- `GET /api/team-pipelines` - Obtener pipelines del equipo
- `GET /api/pipeline-fields` - Obtener campos del pipeline Oberstaff

### Oportunidades
- `GET /api/oberstaff-pipeline` - Obtener pipeline Oberstaff específico
- `GET /api/opportunities` - Obtener oportunidades con paginación
- `POST /api/opportunities` - Crear nueva oportunidad

## Estructura del Proyecto

```
backend-go/
├── main.go          # Punto de entrada y configuración del servidor
├── models.go        # Estructuras de datos y modelos
├── config.go        # Configuración y manejo de tokens Zoho
├── handlers.go      # Manejadores de rutas HTTP
├── go.mod          # Dependencias del proyecto
└── README.md       # Este archivo
```

## Ventajas sobre Python

1. **Rendimiento**: 5-10x más rápido en operaciones concurrentes
2. **Memoria**: Menor uso de memoria RAM
3. **Concurrencia**: Mejor manejo de múltiples usuarios simultáneos
4. **Compilación**: Binario único sin dependencias externas
5. **Escalabilidad**: Mejor rendimiento bajo carga

## Migración desde Python

El backend Go es completamente compatible con el frontend existente. Para migrar:

1. Detener el servidor Python
2. Iniciar el servidor Go en el puerto 8000
3. El frontend continuará funcionando sin cambios

## Logging

El servidor incluye logging detallado para:
- Renovación de tokens
- Creación de contactos y oportunidades
- Errores de API
- Información de depuración

## Variables de Entorno

| Variable | Descripción | Requerida |
|----------|-------------|----------|
| `ZOHO_CLIENT_ID` | ID del cliente Zoho | Sí |
| `ZOHO_CLIENT_SECRET` | Secreto del cliente Zoho | Sí |
| `ZOHO_REFRESH_TOKEN` | Token de actualización Zoho | Sí |
| `PORT` | Puerto del servidor (default: 8000) | No |

## Desarrollo

Para desarrollo activo, usar:
```bash
# Instalar air para hot reload (opcional)
go install github.com/cosmtrek/air@latest

# Ejecutar con hot reload
air
```

## Troubleshooting

### Error de token
- Verificar que las variables de entorno estén configuradas
- Verificar que el refresh token sea válido

### Error de conexión
- Verificar que el puerto 8000 esté disponible
- Verificar configuración de CORS si hay problemas desde el frontend

### Error de compilación
- Verificar versión de Go (mínimo 1.21)
- Ejecutar `go mod tidy` para limpiar dependencias