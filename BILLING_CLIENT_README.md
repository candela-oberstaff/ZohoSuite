# Cliente Python para Zoho Billing API

Este script te permite obtener y mostrar información de suscripciones, clientes y estados desde la API de Zoho Billing.

## 🚀 Instalación y Configuración

### 1. Instalar dependencias
```bash
pip install -r requirements_billing.txt
```

### 2. Configurar credenciales

Tienes dos opciones para configurar tus credenciales:

#### Opción A: Variables de entorno (Recomendado)
```bash
# En Windows (PowerShell)
$env:ZOHO_ACCESS_TOKEN="tu_access_token_aqui"
$env:ZOHO_ORG_ID="tu_organization_id_aqui"
$env:ZOHO_REGION="com"  # opcional, por defecto es 'com'

# En Linux/Mac
export ZOHO_ACCESS_TOKEN="tu_access_token_aqui"
export ZOHO_ORG_ID="tu_organization_id_aqui"
export ZOHO_REGION="com"  # opcional
```

#### Opción B: Editar el script directamente
Abre `zoho_billing_client.py` y modifica estas líneas:
```python
ACCESS_TOKEN = 'tu_access_token_real_aqui'
ORGANIZATION_ID = 'tu_organization_id_real_aqui'
REGION = 'com'  # o 'eu', 'in', etc. según tu región
```

### 3. Obtener credenciales de Zoho

#### Access Token:
1. Ve a [Zoho API Console](https://api-console.zoho.com/)
2. Crea una aplicación o usa una existente
3. Genera un token de acceso con permisos para Zoho Billing

#### Organization ID:
1. Inicia sesión en [Zoho Billing](https://billing.zoho.com/)
2. Ve a Configuración → Organización
3. Copia el Organization ID

## 🏃‍♂️ Ejecución

```bash
python zoho_billing_client.py
```

## 📊 Qué muestra el script

### 1. Resumen de suscripciones por estado
- Total de suscripciones
- Desglose por estado (activas, canceladas, expiradas, etc.)
- Clasificación de suscripciones premium (>$100)
- Porcentajes y estadísticas

### 2. Detalles de suscripciones
- ID de suscripción
- Nombre del cliente
- Plan contratado
- Monto
- Estado actual
- Fechas importantes

### 3. Resumen de clientes
- ID del cliente
- Nombre y email
- Estado
- Fecha de creación

## 🔧 Personalización

Puedes modificar el script para:

### Cambiar límites de visualización
```python
# En la función main(), modifica estos valores:
print_subscriptions_details(client, limit=10)  # Mostrar más suscripciones
print_customers_summary(client, limit=10)      # Mostrar más clientes
```

### Filtrar por estado específico
```python
# Obtener solo suscripciones activas
response = client.get_all_subscriptions(status='live')

# Obtener solo suscripciones canceladas
response = client.get_all_subscriptions(status='cancelled')
```

### Obtener suscripción específica
```python
subscription = client.get_subscription_by_id('subscription_id_aqui')
print(json.dumps(subscription, indent=2))
```

## 🌍 Regiones soportadas

- `com` - Estados Unidos (por defecto)
- `eu` - Europa
- `in` - India
- `com.au` - Australia
- `jp` - Japón

## 📝 Estados de suscripción

El script reconoce estos estados:
- `live` - Activas
- `non_renewing` - No renovables
- `cancelled` - Canceladas
- `expired` - Expiradas
- `trial` - En período de prueba
- `unpaid` - Con pagos pendientes
- `paused` - Pausadas
- `past_due` - Con pagos vencidos

## 🚨 Solución de problemas

### Error de autenticación
- Verifica que tu access token sea válido y no haya expirado
- Confirma que el organization_id sea correcto
- Asegúrate de tener permisos para Zoho Billing

### Error de conexión
- Verifica tu conexión a internet
- Confirma que la región sea correcta
- Revisa si hay firewalls bloqueando la conexión

### Error de límites de API
- El script respeta los límites de la API (200 elementos por página)
- Si tienes muchas suscripciones, el proceso puede tomar tiempo

## 📚 Documentación adicional

- [Zoho Billing API Documentation](https://www.zoho.com/billing/api/v1/)
- [Zoho API Console](https://api-console.zoho.com/)
- [Zoho Billing Help](https://help.zoho.com/portal/en/community/topic/billing)