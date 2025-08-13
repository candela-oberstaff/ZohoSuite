# 🌐 Configuración de LocalTunnel para n8n Webhook

## 📋 Resumen
LocalTunnel permite exponer tu backend local (puerto 8000) a internet para que n8n en producción pueda enviar datos.

## 🚀 Comandos Principales

### Iniciar el túnel
```bash
lt --port 8000
```

### URL Actual Activa
```
https://four-clouds-try.loca.lt/api/webhook/receive
```

## ⚠️ Consideraciones Importantes

### 1. URL Temporal
- La URL cambia cada vez que reinicies LocalTunnel
- Debes actualizar la configuración en n8n cuando esto ocurra

### 2. Mantener el Túnel Activo
- El comando debe permanecer ejecutándose
- Si cierras la terminal, el túnel se desconecta
- Para uso prolongado, considera usar `screen` o `tmux`

### 3. Verificar Conectividad
```bash
# Probar el endpoint desde fuera
curl -X POST https://four-clouds-try.loca.lt/api/webhook/receive \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## 🔧 Configuración en n8n

### Nodo HTTP Request
- **URL:** `https://four-clouds-try.loca.lt/api/webhook/receive`
- **Método:** `POST`
- **Content-Type:** `application/json`
- **Cuerpo:**
```json
{
  "message": "{{ $json.message }}",
  "timestamp": "{{ $json.timestamp }}",
  "user_input": "{{ $json.user_input }}",
  "response": "{{ $json.response }}"
}
```

## 🔄 Si la URL Cambia

1. **Detener LocalTunnel:** `Ctrl+C`
2. **Reiniciar:** `lt --port 8000`
3. **Copiar nueva URL**
4. **Actualizar en n8n:** Cambiar la URL en el nodo HTTP Request
5. **Actualizar documentación:** Modificar este archivo con la nueva URL

## 🐛 Solución de Problemas

### Error de Conexión
- Verificar que el backend Go esté ejecutándose: `netstat -ano | findstr :8000`
- Reiniciar el backend si es necesario

### Túnel No Responde
- Reiniciar LocalTunnel
- Verificar firewall/antivirus
- Probar con otra herramienta como ngrok

## 🔐 Alternativas para Producción

### Para desarrollo prolongado:
- **ngrok** (requiere cuenta gratuita)
- **Cloudflare Tunnel**
- **serveo.net**

### Para producción real:
- Desplegar backend en servidor (Heroku, DigitalOcean, AWS)
- Usar dominio propio
- Configurar HTTPS con certificado SSL

## 📝 Notas
- LocalTunnel es ideal para desarrollo y pruebas
- No recomendado para producción por la naturaleza temporal de las URLs
- Mantén este archivo actualizado con la URL actual