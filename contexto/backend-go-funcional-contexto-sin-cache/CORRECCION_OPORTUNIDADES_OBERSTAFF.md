# Corrección de Creación de Oportunidades - Pipeline Oberstaff

## Problemas Identificados y Solucionados

### 1. Error de OAuth Scope (OAUTH_SCOPE_MISMATCH)

**Problema**: El token actual no tiene los permisos necesarios para acceder al endpoint `settings/pipelines`.

**Solución Implementada**:
- Se agregó manejo de errores específico para `OAUTH_SCOPE_MISMATCH`
- Se implementó un fallback que permite continuar la creación de oportunidades sin acceso a settings
- Se agregó logging detallado para identificar cuándo ocurre este error

### 2. Campo Sub_Pipeline Obligatorio

**Problema**: Según la documentación oficial de Bigin, el campo `Sub_Pipeline` es obligatorio para crear oportunidades, pero no se estaba enviando correctamente.

**Solución Implementada**:
- Se agregó el campo `SubPipeline` al modelo `OpportunityCreate`
- Se modificó la lógica para usar `Sub_Pipeline` en lugar de `Pipeline` en la creación
- Se mantiene compatibilidad con el campo `Pipeline` existente

### 3. Campo Stage Obligatorio

**Problema**: El campo `Stage` es obligatorio según la documentación, pero no se estaba configurando un valor por defecto.

**Solución Implementada**:
- Se agregó lógica para usar un stage por defecto ("Qualification") si no se especifica
- Se agregó logging para mostrar qué stage se está usando

## Cambios Realizados

### Archivo: `models.go`
- Agregado campo `SubPipeline` al struct `OpportunityCreate`
- Agregada documentación sobre campos obligatorios

### Archivo: `handlers.go`
- Función `createOpportunity`:
  - Manejo mejorado de errores de OAuth scope
  - Configuración correcta del campo `Sub_Pipeline`
  - Configuración de stage por defecto
  - Logging mejorado para debugging

## Configuración Recomendada

### Para Resolver Completamente el Error de OAuth:

1. **Generar nuevo token con scopes correctos**:
   ```
   ZohoBigin.settings.modules.READ ZohoBigin.modules.ALL
   ```

2. **URL de autorización ejemplo**:
   ```
   https://accounts.zoho.com/oauth/v2/auth?response_type=code&client_id=TU_CLIENT_ID&scope=ZohoBigin.settings.modules.READ%20ZohoBigin.modules.ALL&access_type=offline&redirect_uri=TU_REDIRECT_URI
   ```

### Para Configurar Pipeline Oberstaff:

1. **Obtener ID del Pipeline Oberstaff**:
   - Acceder a Bigin UI
   - Ir a Settings > Pipelines
   - Encontrar el pipeline "Oberstaff"
   - Anotar el ID del pipeline

2. **Configurar Stages del Pipeline**:
   - Verificar los stages disponibles en el pipeline Oberstaff
   - Actualizar el stage por defecto en el código si es necesario

## Uso de la API Corregida

### Ejemplo de Payload para Crear Oportunidad:

```json
{
  "Deal_Name": "Oportunidad Test Oberstaff",
  "Sub_Pipeline": "ID_DEL_PIPELINE_OBERSTAFF",
  "Stage": "Qualification",
  "Amount": 5000,
  "Account_Name": "Empresa Test",
  "Contact_Name": "Contacto Test",
  "Contact_Email": "test@ejemplo.com",
  "Closing_Date": "2025-07-01"
}
```

### Campos Obligatorios según Bigin:
- `Deal_Name`: Nombre de la oportunidad
- `Sub_Pipeline`: ID del pipeline/sub-pipeline
- `Stage`: Etapa inicial de la oportunidad

## Logging y Debugging

El código ahora incluye logging detallado que ayuda a identificar:
- Cuándo se produce el error de OAuth scope
- Qué pipeline se está usando
- Qué stage se está asignando
- Si hay problemas con la configuración

## Próximos Pasos

1. **Actualizar token OAuth** con los scopes correctos
2. **Configurar IDs específicos** del pipeline Oberstaff en tu instancia
3. **Verificar stages disponibles** en el pipeline Oberstaff
4. **Probar la creación** de oportunidades con los nuevos cambios

## Referencias

- [Documentación oficial de Bigin - Insert Records](https://www.bigin.com/developer/docs/apis/v2/insert-records.html)
- [Campos obligatorios para módulo Pipelines](https://www.bigin.com/developer/docs/apis/v2/insert-records.html#pipelines)