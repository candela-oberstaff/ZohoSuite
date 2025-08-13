# Cómo Verificar si los Datos del Webhook Están Llegando

## 1. Verificar que el Servidor Go Esté Ejecutándose

Primero, asegúrate de que el servidor Go esté ejecutándose:

```bash
cd backend-go
go run main.go
```

Deberías ver un mensaje como:
```
Servidor iniciado en puerto 8000
```

## 2. Verificar que LocalTunnel Esté Activo

En otra terminal, verifica que LocalTunnel esté ejecutándose:

```bash
lt --port 8000
```

URL actual activa: `https://four-clouds-try.loca.lt/api/webhook/receive`

## 3. Monitorear los Logs del Servidor

Cuando envíes datos desde n8n, el servidor Go registrará automáticamente:

### Logs que Verás Cuando Lleguen Datos:

```
Recibiendo datos del webhook de n8n
Datos recibidos del webhook: {"campo1":"valor1","campo2":"valor2"}
Datos procesados exitosamente: map[campo1:valor1 campo2:valor2]
```

### Si Hay Errores:

```
Error al leer el cuerpo de la solicitud: [error]
Error al parsear JSON: [error]
```

## 4. Probar el Endpoint Manualmente

Puedes probar si el endpoint está funcionando enviando una petición de prueba:

### Usando PowerShell:

```powershell
Invoke-WebRequest -Uri "https://four-clouds-try.loca.lt/api/webhook/receive" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"test": "data", "timestamp": "2024-01-01T12:00:00Z"}'
```

### Respuesta Esperada:

```json
{
  "success": true,
  "message": "Datos recibidos y procesados exitosamente",
  "data": {
    "test": "data",
    "timestamp": "2024-01-01T12:00:00Z"
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## 5. Verificar en n8n

### En el Nodo HTTP Request:

1. **Configuración correcta:**
   - URL: `https://four-clouds-try.loca.lt/api/webhook/receive`
   - Método: `POST`
   - Content-Type: `application/json`

2. **Datos de salida esperados:**
   - Status Code: `200`
   - Response Body: JSON con `success: true`

### Si el Nodo Falla:

- **Error 503 - Service Unavailable:** LocalTunnel se desconectó, reinicia con `lt --port 8000`
- **Error de conexión:** Verifica que el servidor Go esté ejecutándose
- **Error 400:** Los datos JSON no son válidos

## 6. Solución de Problemas Comunes

### LocalTunnel se Desconecta Frecuentemente:

```bash
# Reiniciar LocalTunnel
lt --port 8000
```

Luego actualiza la URL en n8n con la nueva URL generada.

### El Servidor Go No Responde:

1. Verifica que esté ejecutándose en el puerto 8000
2. Revisa los logs para errores
3. Reinicia el servidor si es necesario

### No Ves Logs en el Servidor:

- Asegúrate de estar viendo la terminal correcta donde ejecutaste `go run main.go`
- Verifica que la URL en n8n sea exactamente la misma que muestra LocalTunnel

## 7. Ejemplo de Flujo Completo

1. **Ejecutar servidor Go:**
   ```bash
   cd backend-go
   go run main.go
   ```

2. **Ejecutar LocalTunnel:**
   ```bash
   lt --port 8000
   ```

3. **Configurar n8n con la URL generada**

4. **Ejecutar el workflow en n8n**

5. **Verificar logs en la terminal del servidor Go:**
   ```
   Recibiendo datos del webhook de n8n
   Datos recibidos del webhook: {...}
   Datos procesados exitosamente: {...}
   ```

## 8. Datos que Deberías Ver

Cuando n8n envíe datos correctamente, verás en los logs:

- **Timestamp de recepción**
- **Datos JSON completos recibidos**
- **Confirmación de procesamiento exitoso**
- **Respuesta enviada de vuelta a n8n**

Si no ves estos logs, significa que los datos no están llegando al servidor Go.