# Guía de Diagnóstico y Configuración del Webhook N8N

## 🚨 Problema Actual
El webhook está devolviendo **Error 500** y los comandos de prueba se cuelgan, indicando problemas de conectividad o configuración.

## 📋 Lista de Verificación Paso a Paso

### 1. Verificar Conectividad del Servidor N8N

**Paso 1.1:** Accede a tu instancia de n8n en el navegador:
```
https://n8n.obertrack.com
```

**Paso 1.2:** Verifica que puedes hacer login y que la interfaz carga correctamente.

### 2. Verificar el Estado del Workflow

**Paso 2.1:** En n8n, busca el workflow que contiene el webhook con ID: `695cf0ce-bbbe-42f2-b8c9-472d7cc82b03`

**Paso 2.2:** Verifica que el workflow esté **ACTIVO** (toggle verde encendido)

**Paso 2.3:** Verifica que el workflow tenga estos nodos:
- ✅ **Webhook** (como trigger)
- ✅ **Respond to Webhook** (para enviar respuesta)

### 3. Configurar el Nodo Webhook (Trigger)

```
Webhook Settings:
- HTTP Method: POST
- Path: /webhook/695cf0ce-bbbe-42f2-b8c9-472d7cc82b03
- Response Mode: "Using 'Respond to Webhook' Node"
```

### 4. Configurar el Nodo "Respond to Webhook"

**Configuración EXACTA requerida:**

**Response Code:** `200`

**Response Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Response Body:**
```json
{
  "id": "{{ $json.messageId || $uuid() }}",
  "content": "Respuesta del agente: {{ $json.message }}",
  "response": "He procesado tu mensaje: {{ $json.message }}",
  "timestamp": "{{ $now }}",
  "success": true,
  "sessionId": "{{ $json.sessionId }}",
  "userId": "{{ $json.userId }}"
}
```

### 5. Estructura de Datos que Recibe el Webhook

El frontend envía estos datos:
```json
{
  "message": "Contenido del mensaje del usuario",
  "userId": "user-001",
  "sessionId": "session-abc123",
  "messageId": "msg-1735067890123-xyz",
  "timestamp": "2024-12-24T20:31:30.123Z"
}
```

### 6. Probar el Workflow Manualmente

**Paso 6.1:** En n8n, haz clic en "Execute Workflow" para probar manualmente

**Paso 6.2:** Verifica que no hay errores en ningún nodo

**Paso 6.3:** Revisa los logs de ejecución para identificar errores específicos

### 7. Probar el Webhook Externamente

**Opción A - Desde Postman:**
```
POST https://n8n.obertrack.com/webhook/695cf0ce-bbbe-42f2-b8c9-472d7cc82b03
Content-Type: application/json

Body:
{
  "message": "test",
  "userId": "test-user",
  "sessionId": "test-session",
  "messageId": "test-123",
  "timestamp": "2024-12-24T20:31:30.123Z"
}
```

**Opción B - Desde curl (si funciona):**
```bash
curl -X POST https://n8n.obertrack.com/webhook/695cf0ce-bbbe-42f2-b8c9-472d7cc82b03 \
  -H "Content-Type: application/json" \
  -d '{
    "message": "test",
    "userId": "test-user",
    "sessionId": "test-session",
    "messageId": "test-123",
    "timestamp": "2024-12-24T20:31:30.123Z"
  }'
```

## 🔍 Diagnóstico de Errores Comunes

### Error 500 + Respuesta HTML
**Causa:** El workflow tiene errores de configuración
**Solución:** 
1. Verificar que el workflow esté activo
2. Verificar configuración del nodo "Respond to Webhook"
3. Revisar logs de ejecución en n8n

### Timeout (Sin respuesta)
**Causa:** Problemas de conectividad o servidor no disponible
**Solución:**
1. Verificar que `https://n8n.obertrack.com` esté accesible
2. Verificar configuración de firewall/proxy
3. Contactar al administrador del servidor n8n

### Error de Parsing JSON
**Causa:** El nodo "Respond to Webhook" no está devolviendo JSON válido
**Solución:**
1. Verificar que Response Body tenga formato JSON correcto
2. Verificar que Content-Type sea "application/json"
3. Probar la sintaxis JSON en un validador

## 🛠️ Configuración Mínima de Prueba

Si nada funciona, crea un workflow simple de prueba:

1. **Nodo Webhook** → **Nodo Respond to Webhook**

2. **Respond to Webhook** con configuración mínima:
```json
{
  "message": "Webhook funcionando correctamente",
  "timestamp": "{{ $now }}",
  "success": true
}
```

## 🔗 Configuración del Nodo HTTP Request

Para enviar los datos de respuesta a nuestro backend, configura el nodo **HTTP Request** con:

**URL:** `https://tender-vans-fold.loca.lt/api/webhook/receive`
**Método:** `POST`
**Content-Type:** `application/json`

> **⚠️ IMPORTANTE:** Esta URL es temporal y cambia cada vez que reinicies LocalTunnel. 
> Si necesitas reiniciar el túnel, actualiza esta URL en n8n.

**Cuerpo de la solicitud:**
```json
{
  "response": "{{ $json.response }}",
  "messageId": "{{ $json.messageId }}",
  "sessionId": "{{ $json.sessionId }}",
  "userId": "{{ $json.userId }}",
  "timestamp": "{{ $now }}",
  "originalMessage": "{{ $json.message }}"
}
```

## 📞 Siguiente Paso

Si después de seguir todos estos pasos el problema persiste:

1. **Verifica los logs del servidor n8n** para errores específicos
2. **Contacta al administrador** de `n8n.obertrack.com`
3. **Considera usar un webhook de prueba** temporal para verificar conectividad

## ✅ Verificación Final

Una vez configurado correctamente, deberías recibir una respuesta JSON como esta:
```json
{
  "id": "msg-1735067890123-xyz",
  "content": "Respuesta del agente: test",
  "response": "He procesado tu mensaje: test",
  "timestamp": "2024-12-24T20:31:30.456Z",
  "success": true,
  "sessionId": "test-session",
  "userId": "test-user"
}
```