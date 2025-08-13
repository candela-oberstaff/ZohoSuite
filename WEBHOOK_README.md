# 📤 Webhook Integration para Zoho Billing Client

## 🎯 Descripción

El cliente de Zoho Billing ahora incluye funcionalidad de webhook que permite enviar automáticamente los datos de suscripciones a Zapier u otros servicios externos.

## 🔧 Configuración

### 1. Configurar Webhook en Zapier

1. Ve a [Zapier](https://zapier.com/app/zaps)
2. Crea un nuevo Zap
3. Selecciona **"Webhooks by Zapier"** como trigger
4. Elige **"Catch Hook"**
5. Copia la URL del webhook que te proporciona Zapier
6. Pega la URL en la variable `WEBHOOK_URL` del script

### 2. Configurar en el Script

```python
# En zoho_billing_client.py, línea ~520
WEBHOOK_URL = "https://hooks.zapier.com/hooks/catch/TU_ID_AQUI/TU_TOKEN_AQUI/"
```

## 📊 Estructura de Datos Enviados

El webhook envía un JSON con la siguiente estructura:

```json
{
  "timestamp": "2024-01-15T10:30:45.123456",
  "source": "zoho_billing_client",
  "data": {
    "subscription_summary": {
      "total_subscriptions": 308,
      "active_subscriptions": 176,
      "premium_subscriptions": 176,
      "regular_subscriptions": 0,
      "cancelled_subscriptions": 121,
      "expired_subscriptions": 0,
      "trial_subscriptions": 0,
      "unpaid_subscriptions": 1,
      "paused_subscriptions": 8,
      "past_due_subscriptions": 2,
      "non_renewing_subscriptions": 2,
      "other_status_subscriptions": 0
    },
    "past_due_details": [
      {
        "subscription_id": "sub_12345",
        "subscription_number": "SUB-001",
        "customer_name": "Juan Pérez",
        "customer_email": "juan@ejemplo.com",
        "plan_name": "Plan Premium",
        "amount": 29.99,
        "currency_code": "USD",
        "status": "past_due",
        "created_time": "2023-01-15T10:30:45",
        "last_billing_at": "2024-01-15T10:30:45",
        "next_billing_at": "2024-02-15T10:30:45",
        "trial_ends_at": null,
        "interval": 1,
        "interval_unit": "months"
      }
    ],
    "percentages": {
      "premium_percentage": 100.0,
      "regular_percentage": 0.0,
      "active_percentage": 57.14,
      "cancelled_percentage": 39.29,
      "past_due_percentage": 0.65
    },
    "organization_id": "799550320",
    "region": "com",
    "generated_at": "2024-01-15T10:30:45.123456"
  }
}
```

## 🔍 Campos Disponibles

### Resumen de Suscripciones (`subscription_summary`)
- `total_subscriptions`: Total de suscripciones
- `active_subscriptions`: Suscripciones activas (live)
- `premium_subscriptions`: Suscripciones premium (>$100)
- `regular_subscriptions`: Suscripciones regulares (≤$100)
- `cancelled_subscriptions`: Suscripciones canceladas
- `expired_subscriptions`: Suscripciones expiradas
- `trial_subscriptions`: Suscripciones en prueba
- `unpaid_subscriptions`: Suscripciones impagadas
- `paused_subscriptions`: Suscripciones pausadas
- `past_due_subscriptions`: Suscripciones con pago vencido
- `non_renewing_subscriptions`: Suscripciones no renovables
- `other_status_subscriptions`: Otros estados

### Detalles de Suscripciones Past Due (`past_due_details`)
Array con información detallada de cada suscripción con pago vencido:
- `subscription_id`: ID único de la suscripción
- `subscription_number`: Número de suscripción
- `customer_name`: Nombre del cliente
- `customer_email`: Email del cliente
- `plan_name`: Nombre del plan
- `amount`: Monto de la suscripción
- `currency_code`: Código de moneda
- `status`: Estado de la suscripción
- `created_time`: Fecha de creación
- `last_billing_at`: Última fecha de facturación
- `next_billing_at`: Próxima fecha de facturación
- `trial_ends_at`: Fecha de fin del período de prueba
- `interval`: Intervalo de facturación
- `interval_unit`: Unidad del intervalo (months, days, etc.)

### Porcentajes (`percentages`)
- `premium_percentage`: Porcentaje de suscripciones premium
- `regular_percentage`: Porcentaje de suscripciones regulares
- `active_percentage`: Porcentaje de suscripciones activas
- `cancelled_percentage`: Porcentaje de suscripciones canceladas
- `past_due_percentage`: Porcentaje de suscripciones con pago vencido

### Metadatos
- `organization_id`: ID de la organización de Zoho
- `region`: Región del datacenter
- `generated_at`: Timestamp de generación
- `timestamp`: Timestamp del envío
- `source`: Fuente de los datos

## 🚀 Uso

1. **Configura la URL del webhook** en el script
2. **Ejecuta el script** normalmente
3. **Los datos se enviarán automáticamente** después de obtener las estadísticas
4. **Verifica en Zapier** que los datos se recibieron correctamente

## 🔧 Automatización con Zapier

Puedes usar estos datos para:

- 📧 **Enviar emails** con reportes automáticos
- 📊 **Crear gráficos** en Google Sheets
- 💬 **Notificaciones en Slack** cuando cambien las métricas
- 📱 **Alertas en Discord** para el equipo
- 🗄️ **Guardar en bases de datos** para análisis histórico
- 📈 **Dashboards en tiempo real** en herramientas de BI

## ⚠️ Notas Importantes

- El webhook se ejecuta **después** de obtener todas las estadísticas
- Si no configuras `WEBHOOK_URL`, el script funcionará normalmente sin enviar datos
- El timeout del webhook es de **30 segundos**
- Los datos incluyen **timestamp** para tracking temporal
- Se incluye **manejo de errores** robusto

## 🔍 Troubleshooting

### Webhook no se envía
- Verifica que `WEBHOOK_URL` esté configurada
- Asegúrate de que la URL sea válida
- Revisa la conexión a internet

### Error 404 en webhook
- Verifica que la URL de Zapier sea correcta
- Asegúrate de que el Zap esté activado

### Timeout en webhook
- Verifica la conectividad de red
- El servicio de destino puede estar lento

## 📝 Ejemplo de Configuración Completa

```python
# Configuración en zoho_billing_client.py
WEBHOOK_URL = "https://hooks.zapier.com/hooks/catch/123456/abcdef/"
```

Con esta configuración, cada vez que ejecutes el script, los datos se enviarán automáticamente a Zapier para su procesamiento posterior.