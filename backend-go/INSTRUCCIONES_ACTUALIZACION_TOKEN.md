# Instrucciones para Actualizar el Token de Zoho Bigin

## Problema Identificado

Se ha detectado un error `OAUTH_SCOPE_MISMATCH` al intentar acceder al endpoint `settings/pipelines` de la API de Zoho Bigin. Este error indica que el token actual no tiene los permisos (scopes) necesarios para acceder a este recurso.

## Solución

Es necesario generar un nuevo token de acceso con los scopes adecuados para acceder a la configuración de pipelines.

### Scopes Requeridos

Para acceder al endpoint `settings/pipelines`, se necesita al menos uno de los siguientes scopes:

- `ZohoBigin.settings.ALL` (acceso completo a todas las configuraciones)
- `ZohoBigin.settings.modules.ALL` (acceso completo a la configuración de módulos)
- `ZohoBigin.settings.modules.READ` (acceso de lectura a la configuración de módulos)

### Pasos para Generar un Nuevo Token

1. **Acceder a la Consola de Desarrolladores de Zoho**:
   - Inicia sesión en [Zoho Developer Console](https://api-console.zoho.com/)
   - Selecciona la aplicación que estás utilizando para acceder a Bigin

2. **Generar un Nuevo Código de Autorización**:
   - En la sección "Client Secret", haz clic en "Generate Code"
   - Asegúrate de incluir los scopes necesarios:
     ```
     ZohoBigin.settings.modules.READ ZohoBigin.modules.ALL
     ```
   - Establece `access_type=offline` para obtener un refresh token
   - Utiliza la URL de redirección registrada en tu aplicación

3. **Intercambiar el Código por Tokens**:
   - Realiza una solicitud POST a la URL de tokens de Zoho:
     ```
     https://accounts.zoho.com/oauth/v2/token
     ```
   - Incluye los siguientes parámetros:
     ```
     code=<código_de_autorización>
     client_id=<tu_client_id>
     client_secret=<tu_client_secret>
     redirect_uri=<tu_redirect_uri>
     grant_type=authorization_code
     ```

4. **Actualizar el Archivo .env**:
   - Reemplaza el valor actual de `ZOHO_REFRESH_TOKEN` con el nuevo refresh token obtenido

5. **Reiniciar la Aplicación**:
   - Reinicia el servidor para que los cambios surtan efecto

## Ejemplo de Solicitud para Generar un Código de Autorización

```
https://accounts.zoho.com/oauth/v2/auth?response_type=code&client_id=<tu_client_id>&scope=ZohoBigin.settings.modules.READ ZohoBigin.modules.ALL&access_type=offline&redirect_uri=<tu_redirect_uri>
```

## Ejemplo de Solicitud para Obtener Tokens

```
curl -X POST "https://accounts.zoho.com/oauth/v2/token" \
-d "code=<código_de_autorización>" \
-d "client_id=<tu_client_id>" \
-d "client_secret=<tu_client_secret>" \
-d "redirect_uri=<tu_redirect_uri>" \
-d "grant_type=authorization_code"
```

## Notas Importantes

- El código de autorización es válido solo por un minuto
- El refresh token no expira a menos que sea revocado
- El access token expira después de una hora
- La aplicación utiliza el refresh token para generar nuevos access tokens automáticamente