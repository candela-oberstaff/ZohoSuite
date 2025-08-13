# Intelliscreen Monitor - Monitor de Vacantes

## Descripción

Script en Python diseñado para monitorear automáticamente las nuevas posiciones/vacantes publicadas en Intelliscreen y notificar sobre ellas mediante webhook.

## Características

### 🔍 **Funcionalidades Principales**
- **Monitoreo automático** de nuevas posiciones en Intelliscreen
- **Detección inteligente** basada en timestamp de la última verificación
- **Enriquecimiento de datos** con información detallada de candidatos
- **Envío por webhook** para integración con otros sistemas
- **Logging detallado** con emojis para mejor visualización
- **Manejo robusto de errores** con reintentos automáticos
- **Persistencia** de última verificación en archivo JSON

### 🛠️ **Características Técnicas**
- Configuración via variables de entorno
- Validación de respuestas de API 
- Timeout configurable para requests HTTP
- Paginación inteligente (hasta 100 elementos)
- Rate limiting con backoff exponencial
- Modo de una sola ejecución o continuo
- Prueba de conectividad

## Configuración

### Variables de Entorno

Crea un archivo `.env` en el directorio raíz con:

```env
# API Key de Intelliscreen (REQUERIDA)
INTELLISCREEN_API_KEY=9cc1610f1cbb201b3123726765bc67b6

# URL del webhook para notificaciones (OPCIONAL)
WEBHOOK_URL=http://localhost:3000/webhook/new-positions

# Intervalo entre verificaciones en segundos (OPCIONAL)
CHECK_INTERVAL=300
```

### Dependencias

Instalar las dependencias requeridas:

```bash
pip install requests python-dotenv
```

## Uso

### 1. Monitoreo Continuo (Modo por defecto)

```bash
python intelliscreen_monitor.py
```

Ejecuta el monitor de forma continua, verificando nuevas posiciones cada 5 minutos (300 segundos) por defecto.

### 2. Verificación Única

```bash
python intelliscreen_monitor.py --once
```

Ejecuta una sola verificación y termina.

### 3. Prueba de Conexión

```bash
python intelliscreen_monitor.py --test
```

Verifica que la conexión con la API funcione correctamente.

### 4. Modo Verbose

```bash
python intelliscreen_monitor.py --verbose
```

Muestra información detallada del proceso.

### 5. Ayuda

```bash
python intelliscreen_monitor.py --help
```

## Estructura de Datos

### Datos Enviados por Webhook

Cuando se detectan nuevas posiciones, se envía un JSON al webhook con esta estructura:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "source": "intelliscreen_monitor",
  "new_positions_count": 2,
  "positions": [
    {
      "id": "12345",
      "title": "Desarrollador Frontend",
      "description": "Posición para desarrollador React...",
      "company": "TechCorp",
      "location": "Madrid, España",
      "employment_type": "full_time",
      "posted_date": "2024-01-15T08:00:00Z",
      "status": "open",
      "candidates_count": 5,
      "candidates": [
        {
          "id": "candidate_1",
          "name": "Juan Pérez",
          "email": "juan@email.com",
          "status": "pending",
          "score": 85,
          "applied_date": "2024-01-15T09:00:00Z"
        }
      ]
    }
  ]
}
```

### Archivo de Estado

El script mantiene el timestamp de la última verificación en:

```
last_check_timestamp.json
```

## Logging

El script genera logs detallados con:

- ✅ **Éxito** - Operaciones completadas
- ❌ **Error** - Errores y fallos
- ⚠️ **Advertencia** - Situaciones inusuales
- ℹ️ **Info** - Información general
- 🔍 **Debug** - Información detallada
- 🆕 **Nuevo** - Nuevas posiciones encontradas
- 📋 **Procesado** - Datos procesados
- 💾 **Guardado** - Datos persistidos
- 🔄 **Proceso** - Operaciones en curso
- ⏱️ **Tiempo** - Información temporal

## Endpoints de Intelliscreen Utilizados

El script utiliza los siguientes endpoints de la API de Intelliscreen:

### Posiciones
- `GET /positions` - Obtener lista de posiciones
- `GET /positions/{position_id}` - Obtener detalles de posición específica

### Candidatos
- `GET /positions/{position_id}/candidates` - Obtener candidatos de una posición
- `GET /positions/{position_id}/{candidate_id}/results` - Obtener resultados de candidato

## Manejo de Errores

### Errores de Red
- **Timeout**: 30 segundos por request
- **Reintentos**: Hasta 3 intentos con backoff exponencial
- **Rate Limiting**: Respeta límites de la API

### Errores de API
- **401 Unauthorized**: Verificar API Key
- **404 Not Found**: Posición o recurso no encontrado
- **429 Too Many Requests**: Espera antes de reintentar
- **500 Server Error**: Error del servidor de Intelliscreen

### Errores del Script
- **Archivo de configuración**: Usar valores por defecto
- **Webhook no disponible**: Continuar sin enviar notificaciones
- **Errores consecutivos**: Detener después de 5 fallos seguidos

## Configuraciones Avanzadas

### Personalizar Intervalo

```bash
# Verificar cada hora (3600 segundos)
CHECK_INTERVAL=3600 python intelliscreen_monitor.py
```

### Webhook Personalizado

```bash
# Usar webhook diferente
WEBHOOK_URL=https://mi-servidor.com/webhook python intelliscreen_monitor.py
```

## Solución de Problemas

### Problema: "No se puede conectar a la API"
**Solución:**
1. Verificar que `INTELLISCREEN_API_KEY` esté configurada correctamente
2. Comprobar conexión a internet
3. Verificar que la API de Intelliscreen esté funcionando

### Problema: "Error enviando datos por webhook"
**Solución:**
1. Verificar que la URL del webhook sea accesible
2. Comprobar que el servidor del webhook esté funcionando
3. Revisar logs para detalles del error

### Problema: "Demasiados errores consecutivos"
**Solución:**
1. Revisar logs para identificar el tipo de error
2. Verificar configuración de red
3. Comprobar estado de la API de Intelliscreen
4. Revisar límites de rate limiting

## Desarrollo y Contribución

### Estructura del Código

```
intelliscrren_monitor.py
├── IntelliscreenMonitor     # Clase principal
├── test_connection()        # Prueba de conectividad
├── get_all_positions()      # Obtener posiciones
├── get_position_details()   # Detalles de posición
├── find_new_positions()     # Detectar nuevas
├── enrich_position_data()   # Enriquecer datos
├── send_webhook()           # Enviar notificaciones
└── main()                   # Función principal
```

### Extensiones Posibles

1. **Base de datos**: Persistir datos en SQLite o PostgreSQL
2. **Filtros**: Filtrar por tipo de posición, ubicación, etc.
3. **Múltiples webhooks**: Enviar a diferentes endpoints
4. **Métricas**: Recopilar estadísticas de uso
5. **Interfaz web**: Panel de control web
6. **Notificaciones**: Email, Slack, Discord, etc.

## Licencia

Este código es parte del proyecto private de integración con Zoho.

---

**Nota**: Asegúrate de mantener tu API Key segura y no la compartas en repositorios públicos.