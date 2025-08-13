# 🤖 Sistema de Chat con N8N - Guía Completa

## 📋 Descripción General

Este sistema permite crear un chat bidireccional entre el frontend y un agente de IA configurado en n8n. El flujo funciona de la siguiente manera:

1. **Frontend** → Envía mensaje a **n8n** (webhook)
2. **n8n** → Procesa el mensaje con IA y envía respuesta a **Backend Go**
3. **Backend Go** → Almacena la respuesta temporalmente
4. **Frontend** → Obtiene la respuesta del backend mediante polling

## 🏗️ Arquitectura del Sistema

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │───▶│     n8n     │───▶│ Backend Go  │◀───│   Frontend  │
│  (React)    │    │ (Webhook)   │    │  (Storage)  │    │  (Polling)  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## 🔧 Configuración del Backend Go

### 1. Endpoints Implementados

- **POST** `/api/webhook/receive` - Recibe datos de n8n
- **GET** `/api/webhook/response/:sessionId` - Entrega respuestas al frontend

### 2. Estructura de Datos

```go
type WebhookResponse struct {
    ID        string                 `json:"id"`
    Content   string                 `json:"content"`
    Response  string                 `json:"response"`
    Timestamp time.Time              `json:"timestamp"`
    SessionID string                 `json:"sessionId"`
    UserID    string                 `json:"userId"`
    Data      map[string]interface{} `json:"data"`
}
```

## 🌐 Configuración de LocalTunnel

### URL Actual Activa
**URL:** `https://tender-vans-fold.loca.lt/api/webhook/receive`

### Comandos
```bash
# Iniciar LocalTunnel
lt --port 8000

# Verificar estado
curl -X POST https://tender-vans-fold.loca.lt/api/webhook/receive \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

⚠️ **Importante:** Las URLs de LocalTunnel son temporales y cambian cada vez que se reinicia.

## 🔗 Configuración de n8n

### 1. Nodo Webhook (Trigger)
- **Método:** POST
- **Ruta:** `/webhook/chat` (o tu ruta personalizada)
- **Respuesta:** Activado

### 2. Nodo de Procesamiento IA
Configura tu nodo de IA (OpenAI, Claude, etc.) para procesar el mensaje recibido.

### 3. Nodo "Respond to Webhook"
```json
{
  "id": "{{ $json.messageId || $uuid() }}",
  "content": "Respuesta del agente: {{ $json.message }}",
  "response": "{{ $('IA_NODE').json.response }}",
  "timestamp": "{{ $now }}",
  "success": true,
  "sessionId": "{{ $json.sessionId }}",
  "userId": "{{ $json.userId }}"
}
```

### 4. Nodo "HTTP Request" (Envío al Backend)
- **URL:** `https://tender-vans-fold.loca.lt/api/webhook/receive`
- **Método:** POST
- **Content-Type:** application/json
- **Cuerpo:**
```json
{
  "response": "{{ $('IA_NODE').json.response }}",
  "messageId": "{{ $json.messageId }}",
  "sessionId": "{{ $json.sessionId }}",
  "userId": "{{ $json.userId }}",
  "timestamp": "{{ $now }}",
  "originalMessage": "{{ $json.message }}"
}
```

## 💻 Configuración del Frontend

### 1. WebhookService
El servicio maneja:
- Envío de mensajes a n8n
- Polling para obtener respuestas del backend
- Gestión de sesiones y usuarios

### 2. Flujo de Comunicación
```typescript
// 1. Enviar mensaje a n8n
const response = await fetch(webhookUrl, {
  method: 'POST',
  body: JSON.stringify({
    message: content,
    sessionId: this.sessionId,
    userId: this.userId,
    messageId: messageId
  })
})

// 2. Hacer polling para obtener respuesta
const webhookResponse = await this.pollForResponse(sessionId)
```

### 3. Configuración de URL
En el componente N8nChat, configura la URL de tu webhook de n8n:
```typescript
const [webhookUrl, setWebhookUrl] = useState('https://n8n.obertrack.com/webhook/tu-webhook-id')
```

## 🚀 Pasos para Iniciar el Sistema

### 1. Iniciar Backend Go
```bash
cd backend-go
go run .
```

### 2. Iniciar LocalTunnel
```bash
lt --port 8000
# Anota la URL generada
```

### 3. Configurar n8n
- Actualiza la URL del nodo HTTP Request con la nueva URL de LocalTunnel
- Activa el workflow

### 4. Iniciar Frontend
```bash
cd frontend
npm run dev
```

### 5. Probar el Sistema
- Ve a `/n8n-chat`
- Configura la URL del webhook de n8n
- Prueba la conexión
- Envía un mensaje

## 🔍 Verificación y Debugging

### 1. Verificar Backend
```bash
# Verificar que el servidor esté corriendo
curl http://localhost:8000/

# Probar endpoint de webhook
curl -X POST http://localhost:8000/api/webhook/receive \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### 2. Verificar LocalTunnel
```bash
# Probar conectividad
curl -X POST https://tender-vans-fold.loca.lt/api/webhook/receive \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### 3. Logs del Backend
Revisa los logs del backend Go para ver:
- Mensajes recibidos de n8n
- Respuestas almacenadas
- Solicitudes del frontend

### 4. Logs del Frontend
Abre las herramientas de desarrollador para ver:
- Envío de mensajes
- Polling de respuestas
- Errores de conexión

## ⚠️ Solución de Problemas

### Error 503 - Tunnel Unavailable
- LocalTunnel se desconectó
- Reinicia LocalTunnel y actualiza la URL en n8n

### Error 500 - Internal Server Error
- El workflow de n8n no está activo
- Falta el nodo "Respond to Webhook"
- Error en la configuración del workflow

### Timeout en Frontend
- Verifica que n8n esté procesando el mensaje
- Revisa los logs del backend
- Aumenta el timeout si es necesario

### No se recibe respuesta
- Verifica que el nodo HTTP Request esté configurado correctamente
- Confirma que la URL de LocalTunnel sea correcta
- Revisa que el sessionId coincida

## 📝 Notas Importantes

1. **URLs Temporales:** LocalTunnel genera URLs temporales que cambian al reiniciar
2. **Almacenamiento Temporal:** Las respuestas se almacenan en memoria (usar Redis en producción)
3. **Consumo Único:** Las respuestas se eliminan después de ser entregadas
4. **Timeouts:** El sistema tiene timeouts configurados para evitar esperas indefinidas
5. **Sesiones:** Cada chat tiene un sessionId único para identificar las respuestas

## 🔄 Flujo Completo de Ejemplo

1. Usuario escribe "Hola" en el chat
2. Frontend envía mensaje a n8n con sessionId único
3. n8n procesa con IA y responde "¡Hola! ¿En qué puedo ayudarte?"
4. n8n envía la respuesta al backend Go vía HTTP Request
5. Backend almacena la respuesta asociada al sessionId
6. Frontend hace polling y obtiene la respuesta
7. Usuario ve la respuesta en el chat

¡El sistema está listo para usar! 🎉