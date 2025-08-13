# Guía de Funciones JavaScript para n8n - Integración con Zoho Bigin

## 🚨 Solución al Error: "The response property should be a string, but it is undefined"

Este error ocurre cuando n8n espera que la propiedad `response` sea un string, pero recibe `undefined`. La versión corregida de las funciones en `zoho_n8n_functions.js` soluciona este problema.

## 📋 Funciones Disponibles

### 1. `validateResponse(data)`
**Función auxiliar que asegura que la propiedad `response` siempre sea un string válido.**

```javascript
// Uso interno - se llama automáticamente en todas las funciones
const result = validateResponse(data);
// Siempre retorna: { success: boolean, response: string, data: any }
```

### 2. `getAccessToken()`
**Obtiene un token de acceso renovado de Zoho.**

```javascript
const tokenResult = await getAccessToken();
// Retorna: { success: true/false, response: "mensaje", access_token?: "token" }
```

### 3. `createContact(contactData)`
**Crea un contacto en Zoho Bigin.**

```javascript
const contactData = {
  First_Name: "Juan",
  Last_Name: "Pérez",
  Email: "juan@example.com",
  Phone: "+1234567890",
  Mobile: "+0987654321",
  Account_Name: "Empresa ABC"
};

const result = await createContact(contactData);
// Retorna: { success: true/false, response: "mensaje", data?: { contact_id, contact_data } }
```

### 4. `createDeal(dealData)`
**Crea una oportunidad en Zoho Bigin.**

```javascript
const dealData = {
  Deal_Name: "Oportunidad de Venta",
  Stage: "Qualification",
  Amount: 5000,
  Closing_Date: "2024-12-31",
  Pipeline: "5725832000000006001",
  Account_Name: "Empresa ABC",
  Description: "Descripción de la oportunidad",
  Contact_Name: { id: "contact_id_aqui" }, // Opcional
  route: "empresas-productos" // Para lógica especial
};

const result = await createDeal(dealData);
// Retorna: { success: true/false, response: "mensaje", data?: { deal_id, deal_data } }
```

### 5. `createContactAndDeal(contactData, dealData)`
**Crea un contacto y luego una oportunidad asociada.**

```javascript
const contactData = {
  First_Name: "María",
  Last_Name: "García",
  Email: "maria@example.com"
};

const dealData = {
  Deal_Name: "Nueva Oportunidad",
  Amount: 10000
};

const result = await createContactAndDeal(contactData, dealData);
// Retorna: { success: true/false, response: "mensaje", data?: { contact_id, deal_id, ... } }
```

### 6. `processZohoRequest(inputData)`
**Función principal para usar en n8n que maneja diferentes acciones.**

```javascript
const inputData = {
  action: "createContactAndDeal", // o "createContact" o "createDeal"
  contactData: { /* datos del contacto */ },
  dealData: { /* datos de la oportunidad */ }
};

const result = await processZohoRequest(inputData);
```

## 🔧 Configuración en n8n

### Paso 1: Configurar el Nodo "Code"

1. Añade un nodo **"Code"** a tu workflow
2. Selecciona **"Run Once for All Items"**
3. Copia el contenido completo de `zoho_n8n_functions.js`
4. Añade tu lógica de procesamiento:

```javascript
// Ejemplo de código para el nodo Code en n8n
const inputData = {
  action: "createContactAndDeal",
  contactData: {
    First_Name: $input.first().json.firstName,
    Last_Name: $input.first().json.lastName,
    Email: $input.first().json.email
  },
  dealData: {
    Deal_Name: $input.first().json.dealName,
    Amount: $input.first().json.amount
  }
};

const result = await processZohoRequest(inputData);

// IMPORTANTE: Siempre retornar un objeto con la propiedad 'response' como string
return [{
  json: {
    success: result.success,
    response: result.response, // Esto siempre será un string
    data: result.data,
    timestamp: new Date().toISOString()
  }
}];
```

### Paso 2: Configurar el Nodo "Respond to Webhook"

```json
{
  "respondWith": "json",
  "responseCode": 200,
  "responseHeaders": {
    "Content-Type": "application/json"
  },
  "responseBody": {
    "success": "={{ $json.success }}",
    "message": "={{ $json.response }}",
    "data": "={{ $json.data }}",
    "timestamp": "={{ $json.timestamp }}"
  }
}
```

## 🐛 Solución de Problemas

### Error: "response property should be a string, but it is undefined"

**Causa:** La función no está retornando la propiedad `response` como string.

**Solución:** 
1. Usa las funciones corregidas de `zoho_n8n_functions.js`
2. Todas las funciones usan `validateResponse()` que garantiza que `response` sea siempre un string
3. Verifica que tu nodo "Code" retorne el resultado correctamente

### Error: "HTTP 400 Bad Request"

**Posibles causas:**
1. Datos de entrada inválidos
2. Token de acceso expirado
3. Campos obligatorios faltantes

**Solución:**
1. Verifica que `First_Name` y `Last_Name` estén presentes para contactos
2. Verifica que `Deal_Name` esté presente para oportunidades
3. Asegúrate de que el backend esté ejecutándose en `localhost:8001`

### Error: "Token de acceso no válido"

**Solución:**
1. Verifica que el backend de Go esté ejecutándose
2. Revisa la configuración del `.env` en el backend
3. Ejecuta manualmente la renovación del token

## 📝 Ejemplo Completo para n8n

```javascript
// Código completo para el nodo Code en n8n

// [Aquí va todo el contenido de zoho_n8n_functions.js]

// Lógica principal
const inputData = {
  action: "createContactAndDeal",
  contactData: {
    First_Name: $input.first().json.firstName || "Nombre",
    Last_Name: $input.first().json.lastName || "Apellido",
    Email: $input.first().json.email || "",
    Phone: $input.first().json.phone || ""
  },
  dealData: {
    Deal_Name: $input.first().json.dealName || "Nueva Oportunidad",
    Amount: $input.first().json.amount || 0,
    Stage: "Qualification",
    Closing_Date: new Date().toISOString().split('T')[0]
  }
};

try {
  const result = await processZohoRequest(inputData);
  
  return [{
    json: {
      success: result.success,
      response: result.response, // Siempre será un string
      data: result.data,
      input_received: $input.first().json,
      timestamp: new Date().toISOString()
    }
  }];
} catch (error) {
  return [{
    json: {
      success: false,
      response: `Error en el procesamiento: ${error.message}`,
      data: null,
      timestamp: new Date().toISOString()
    }
  }];
}
```

## ✅ Verificación

Para verificar que todo funciona correctamente:

1. **Test con datos mínimos:**
```bash
curl -X POST "tu-webhook-url" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "dealName": "Test Deal",
    "amount": 1000
  }'
```

2. **Respuesta esperada:**
```json
{
  "success": true,
  "message": "Contacto y oportunidad creados exitosamente...",
  "data": {
    "contact_id": "...",
    "deal_id": "..."
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

Si sigues teniendo problemas, revisa los logs de n8n y asegúrate de que el backend de Go esté ejecutándose correctamente.