# Migración de Backend: Python → Go

Esta guía te ayudará a migrar del backend Python (FastAPI) al nuevo backend Go para mejor rendimiento y manejo de concurrencia.

## ¿Por qué migrar a Go?

### Ventajas del Backend Go
- **5-10x mejor rendimiento** en operaciones concurrentes
- **Menor uso de memoria** (típicamente 50-70% menos RAM)
- **Mejor manejo de concurrencia** para múltiples usuarios simultáneos
- **Binario único** sin dependencias externas
- **Startup más rápido** del servidor
- **Mejor escalabilidad** bajo carga

### Compatibilidad
- ✅ **100% compatible** con el frontend React existente
- ✅ **Mismos endpoints** y estructura de respuestas
- ✅ **Misma configuración** de variables de entorno
- ✅ **Sin cambios** requeridos en el frontend

## Pasos de Migración

### 1. Preparación

**Instalar Go (si no está instalado):**
```bash
# Descargar desde: https://golang.org/dl/
# Verificar instalación:
go version
```

**Copiar variables de entorno:**
```bash
# Si tienes un .env en el directorio raíz, copiarlo:
cp .env backend-go/.env

# O crear uno nuevo desde el ejemplo:
cp backend-go/.env.example backend-go/.env
# Luego editar backend-go/.env con tus credenciales
```

### 2. Probar el Backend Go

**Navegar al directorio Go:**
```bash
cd backend-go
```

**Instalar dependencias:**
```bash
go mod download
```

**Ejecutar en modo desarrollo:**
```bash
# Opción 1: Usar el script de PowerShell (Windows)
.\run.ps1

# Opción 2: Ejecutar directamente
go run .

# Opción 3: Compilar y ejecutar
go build -o zoho-bigin-backend.exe
.\zoho-bigin-backend.exe
```

**Verificar que funciona:**
- Abrir http://localhost:8000 en el navegador
- Deberías ver: `{"message":"Zoho Bigin API - Go Backend","status":"running"}`

### 3. Migración Completa

**Detener el backend Python:**
```bash
# Si está corriendo en otra terminal, presionar Ctrl+C
# O encontrar el proceso:
# Windows: tasklist | findstr python
# Linux/Mac: ps aux | grep python
```

**Iniciar el backend Go:**
```bash
cd backend-go
go run .
```

**Probar el frontend:**
- El frontend debería continuar funcionando sin cambios
- Todas las funcionalidades deberían estar disponibles
- Verificar que los datos se cargan correctamente

### 4. Configuración de Producción

**Compilar para producción:**
```bash
cd backend-go
go build -o zoho-bigin-backend
```

**Ejecutar en producción:**
```bash
# Windows
.\zoho-bigin-backend.exe

# Linux/Mac
./zoho-bigin-backend
```

## Verificación de Funcionalidades

Verifica que todas estas funcionalidades trabajen correctamente:

### ✅ Checklist de Migración

- [ ] **Servidor inicia** en puerto 8000
- [ ] **Endpoint raíz** responde: `GET /`
- [ ] **Contactos** funcionan: `GET /api/contacts`
- [ ] **Búsqueda de contactos** funciona: `GET /api/contacts?search=test`
- [ ] **Contacto por ID** funciona: `GET /api/contacts/{id}`
- [ ] **Módulos** funcionan: `GET /api/modulos`
- [ ] **Pipelines** funcionan: `GET /api/pipelines`
- [ ] **Team pipelines** funcionan: `GET /api/team-pipelines`
- [ ] **Pipeline fields** funcionan: `GET /api/pipeline-fields`
- [ ] **Oberstaff pipeline** funciona: `GET /api/oberstaff-pipeline`
- [ ] **Oportunidades** funcionan: `GET /api/opportunities`
- [ ] **Crear oportunidad** funciona: `POST /api/opportunities`
- [ ] **Frontend carga datos** correctamente
- [ ] **Paginación** funciona en todas las vistas
- [ ] **Búsqueda** funciona en contactos
- [ ] **Creación de oportunidades** desde el frontend

## Troubleshooting

### Problemas Comunes

**Error: "go: command not found"**
- Instalar Go desde https://golang.org/dl/
- Verificar que Go esté en el PATH

**Error: "missing environment variables"**
- Verificar que el archivo `.env` existe en `backend-go/`
- Verificar que contiene las variables: `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`

**Error: "port already in use"**
- Verificar que el backend Python esté detenido
- Cambiar el puerto en `.env`: `PORT=8001`
- Actualizar `frontend/src/services/api.ts` si cambias el puerto

**Frontend no carga datos**
- Verificar que el backend Go esté corriendo en el puerto correcto
- Verificar la configuración de CORS
- Revisar la consola del navegador para errores

**Errores de autenticación Zoho**
- Verificar que las credenciales en `.env` sean correctas
- Verificar que el refresh token sea válido
- Revisar los logs del servidor para detalles

### Logs y Debugging

El backend Go incluye logging detallado:
```bash
# Los logs aparecerán en la consola donde ejecutes:
go run .

# Buscar mensajes como:
# "Token de acceso renovado exitosamente"
# "Contacto creado exitosamente con ID: ..."
# "Server starting on port 8000"
```

## Rollback (Volver a Python)

Si necesitas volver al backend Python:

1. **Detener el backend Go** (Ctrl+C)
2. **Navegar al directorio backend:**
   ```bash
   cd backend
   ```
3. **Activar el entorno virtual:**
   ```bash
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```
4. **Ejecutar el backend Python:**
   ```bash
   python app.py
   # o
   uvicorn app:app --host 0.0.0.0 --port 8000
   ```

## Mantenimiento

### Actualizaciones
```bash
# Actualizar dependencias Go
cd backend-go
go get -u
go mod tidy

# Recompilar
go build -o zoho-bigin-backend
```

### Monitoreo
- El backend Go usa menos recursos que Python
- Monitorear uso de CPU y memoria
- Revisar logs para errores de API de Zoho

## Soporte

Si encuentras problemas durante la migración:

1. **Revisar este documento** completamente
2. **Verificar los logs** del servidor
3. **Probar endpoints individualmente** con herramientas como Postman
4. **Comparar respuestas** entre Python y Go backends

¡La migración debería ser transparente para los usuarios finales!