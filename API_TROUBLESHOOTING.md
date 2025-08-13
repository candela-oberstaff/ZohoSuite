# 🔧 Solución de Problemas de Autenticación - Intelliscreen Monitor

## ❌ Problema Actual
El monitor está recibiendo un error **404** al intentar conectarse con la API de Intelliscreen, lo que indica un problema de autenticación o configuración.

## 📋 Diagnóstico

### Error Detectado:
```
ERROR - ❌ Error de autenticación: 404
```

### Posibles Causas:
1. **API Key inválida o expirada**
2. **URL de la API incorrecta**
3. **Cuenta de Intelliscreen sin acceso a la API**
4. **Endpoint de la API cambiado**

## 🔧 Solución Paso a Paso

### 1. Verificar API Key

**Opción A: Verificar en el archivo .env**
```bash
# Abrir el archivo .env y verificar la API key
notepad .env
```

**Opción B: Actualizar API Key**
1. Inicia sesión en tu cuenta de Intelliscreen
2. Ve a: **Configuración > API > API Keys**
3. Genera una nueva API key o copia la existente
4. Actualiza el archivo `.env`:
```env
INTELLISCREEN_API_KEY=tu-nueva-api-key-aqui
```

### 2. Verificar URL de la API

**URL Actual (por defecto):**
```
https://api.intelliscreen.io/api/v1
```

**Para verificar la URL correcta:**
1. Consulta la documentación oficial de Intelliscreen API
2. O contacta al soporte de Intelliscreen
3. Si la URL es diferente, actualiza en `.env`:
```env
INTELLISCREEN_BASE_URL=https://api-correcta.intelliscreen.com/api/v1
```

### 3. Verificar Permisos de Cuenta

**Verifica que tu cuenta tenga acceso a la API:**
1. Inicia sesión en Intelliscreen
2. Ve a **Configuración > Permisos > API Access**
3. Asegúrate de que esté habilitado

### 4. Probar Manualmente

**Prueba directa con curl:**
```bash
curl -X GET "https://api.intelliscreen.io/api/v1/positions?limit=1" \
  -H "Authorization: Bearer TU_API_KEY_AQUI" \
  -H "Content-Type: application/json"
```

## 🚀 Comandos para Verificar

### Test de Conexión
```bash
python intelliscreen_monitor.py --test
```

### Verificar configuración actual
```bash
python -c "
import os
from dotenv import load_dotenv
load_dotenv()
print('API Key:', os.getenv('INTELLISCREEN_API_KEY', 'No configurada'))
print('Base URL:', os.getenv('INTELLISCREEN_BASE_URL', 'No configurada'))
"
```

## 📞 Contacto de Soporte

**Si el problema persiste:**
- **Soporte Intelliscreen:** support@intelliscreen.io
- **Documentación API:** https://docs.intelliscreen.io/api
- **Verificar estado del servicio:** https://status.intelliscreen.io

## ✅ Checklist de Verificación

- [ ] API Key es válida y activa
- [ ] URL de la API es correcta
- [ ] Cuenta tiene permisos de API
- [ ] Archivo `.env` está configurado correctamente
- [ ] Test de conexión exitoso

## 📝 Notas Importantes

1. **API Key Segura:** Nunca compartas tu API key en repositorios públicos
2. **Rotación:** Considera rotar tu API key regularmente
3. **Limites:** Verifica los límites de uso de la API
4. **Logs:** Revisa los logs para más detalles sobre errores

## 🔄 Próximos Pasos

1. Actualiza tu `.env` con credenciales válidas
2. Ejecuta el test de conexión
3. Si aún hay errores, contacta al soporte de Intelliscreen
4. Una vez resuelto, el monitor funcionará correctamente