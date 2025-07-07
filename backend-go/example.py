import requests
import json

# --- Configuración (¡ACTUALIZA ESTOS VALORES CON TUS CREDENCIALES!) ---

# Estas credenciales son para Zoho Accounts y Bigin.
# CLIENT_ID y CLIENT_SECRET pueden ser los mismos si tu aplicación es multi-servicio.
# REFRESH_TOKEN_ALMACENADO debe tener los SCOPES adecuados para Zoho Subscriptions (ej. ZohoSubscriptions.hostedpages.CREATE)
# Si tu refresh token actual NO tiene los scopes de Zoho Subscriptions, necesitarás generar uno nuevo.
CLIENT_ID = "TU_CLIENT_ID"  # <-- ¡ACTUALIZA CON TU CLIENT ID!
CLIENT_SECRET = "TU_CLIENT_SECRET" # <-- ¡ACTUALIZA CON TU CLIENT SECRET!
REFRESH_TOKEN_ALMACENADO = "TU_REFRESH_TOKEN" # <-- ¡ACTUALIZA CON TU REFRESH TOKEN!

ZOHO_ACCOUNTS_URL = "https://accounts.zoho.com" # Ajusta si tu centro de datos es diferente (ej. .eu, .in)

# --- Nuevas configuraciones para Zoho Subscriptions ---
# TU ID DE ORGANIZACIÓN DE ZOHO BILLING (¡ESTE ES CRUCIAL PARA SUBSCRIPTIONS!)
# Lo encuentras en Zoho Billing: Configuración (Settings) > Organización (Organization Profile)
ZOHO_ORGANIZATION_ID = "TU_ID_DE_ORGANIZACION" # <-- ¡ACTUALIZA ESTO!

# URL base para la API de Zoho Subscriptions. Ajusta según tu centro de datos (DC):
# Ej: https://subscriptions.zoho.eu/api/v1, https://subscriptions.zoho.in/api/v1
ZOHO_SUBSCRIPTIONS_API_URL = "https://www.zohoapis.com/billing/v1" # Ajusta si tu DC es diferente

# --- Datos para la Hosted Page de añadir método de pago ---
# ID del cliente existente al que quieres añadir un método de pago.
# Este cliente debe existir en tu cuenta de Zoho Subscriptions/Billing.
CUSTOMER_TO_ADD_PAYMENT_METHOD_ID = "ID_DEL_CLIENTE_EXISTENTE" # <-- ¡ACTUALIZA ESTO!

# URL a la que el cliente será redirigido después de añadir el método de pago
REDIRECT_URL_AFTER_ADD_PAYMENT = "https://tudominio.com/pagina-de-gracias" # <-- ¡ACTUALIZA ESTO!

# Opcional: Especifica los gateways de pago si solo quieres que se muestren algunos.
# Si lo dejas vacío, se mostrarán todos los configurados en Zoho Billing.
PAYMENT_GATEWAYS_ALLOWED = [{"payment_gateway": "stripe"}] # Ejemplo: [{"payment_gateway": "stripe"}]


# --- Función para Usar el Refresh Token y Obtener un Nuevo Access Token ---
def refrescar_access_token(refresh_token, client_id, client_secret, zoho_accounts_url):
    """
    Utiliza el refresh token para obtener un nuevo access token.
    Este access token debe tener los scopes necesarios para Zoho Subscriptions (ej. ZohoSubscriptions.hostedpages.CREATE).
    """
    token_url = f"{zoho_accounts_url}/oauth/v2/token"
    payload = {
        "refresh_token": refresh_token,
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "refresh_token",
    }

    print("\n--- Intentando refrescar Access Token ---")
    try:
        response = requests.post(token_url, data=payload)
        response_data = response.json()
        response.raise_for_status()

        if response.status_code == 200:
            print("¡Access Token refrescado exitosamente!")
            print(f"Nuevo Access Token: {response_data.get('access_token')[:20]}...")
            print(f"Expira en: {response_data.get('expires_in')} segundos")
            return response_data.get('access_token')
        else:
            print(f"\nError inesperado al refrescar Access Token: {response.status_code}")
            print("Respuesta de Zoho:", json.dumps(response_data, indent=4))
            return None
    except requests.exceptions.HTTPError as e:
        print(f"\nError HTTP al refrescar token ({e.response.status_code}): {e}")
        try:
            error_details = e.response.json()
            print("Detalles del error de Zoho:", json.dumps(error_details, indent=4))
        except json.JSONDecodeError:
            print("Cuerpo de la respuesta de error no JSON:", e.response.text)
        return None
    except requests.exceptions.RequestException as e:
        print(f"\nError de conexión al refrescar token: {e}")
        return None

# --- Función para generar la Hosted Page para añadir un método de pago ---
def generar_hosted_page_add_payment_method(access_token, org_id, customer_id, redirect_url, payment_gateways=None):
    """
    Genera una Hosted Page de Zoho Subscriptions para que un cliente pueda añadir un método de pago a su perfil.
    """
    endpoint = f"{ZOHO_SUBSCRIPTIONS_API_URL}/hostedpages/addpaymentmethod"

    payload = {
        "customer_id": customer_id,
        "redirect_url": redirect_url
    }
    if payment_gateways:
        payload["payment_gateways"] = payment_gateways

    headers = {
        "X-com-zoho-subscriptions-organizationid": org_id,
        "Authorization": f"Zoho-oauthtoken {access_token}",
        "Content-Type": "application/json"
    }

    print(f"\n--- Intentando generar Hosted Page para añadir método de pago para el cliente {customer_id} ---")
    print(f"URL de la API: {endpoint}")
    print(f"Payload enviado: {json.dumps(payload, indent=4)}")

    try:
        response = requests.post(endpoint, headers=headers, data=json.dumps(payload))
        response_data = response.json()
        response.raise_for_status()

        if response.status_code == 200 and response_data.get('code') == 0:
            hosted_page_info = response_data.get('hostedpage', {})
            hosted_page_url = hosted_page_info.get('url')

            print("\n¡Hosted Page para añadir método de pago generada exitosamente!")
            print(f"ID de Hosted Page: {hosted_page_info.get('hostedpage_id')}")
            print(f"URL de la página para el cliente: {hosted_page_url}")
            print(f"Expira en: {hosted_page_info.get('expiring_time')}")
            print("\n--- Respuesta completa de la API ---")
            print(json.dumps(response_data, indent=4))
            return hosted_page_url
        else:
            print(f"\nError al generar Hosted Page: {response.status_code}")
            print(f"Mensaje de Zoho: {response_data.get('message', 'No message provided')}")
            print("Respuesta de Zoho:", json.dumps(response_data, indent=4))
            return None
    except requests.exceptions.HTTPError as e:
        print(f"\nError HTTP al generar Hosted Page ({e.response.status_code}): {e}")
        try:
            error_details = e.response.json()
            print("Detalles del error de Zoho:", json.dumps(error_details, indent=4))
        except json.JSONDecodeError:
            print("Cuerpo de la respuesta de error no JSON:", e.response.text)
        return None
    except requests.exceptions.RequestException as e:
        print(f"\nError de conexión al generar Hosted Page: {e}")
        return None

# --- Flujo de Ejecución Principal ---
if __name__ == "__main__":
    print("--- Generador de Hosted Page para Añadir Método de Pago en Zoho Subscriptions ---")

    # --- ¡IMPORTANTE! Actualiza estas variables antes de ejecutar ---
    if ZOHO_ORGANIZATION_ID == "TU_ID_DE_ORGANIZACION" or \
       CUSTOMER_TO_ADD_PAYMENT_METHOD_ID == "ID_DEL_CLIENTE_EXISTENTE" or \
       CLIENT_ID == "TU_CLIENT_ID" or CLIENT_SECRET == "TU_CLIENT_SECRET" or \
       REFRESH_TOKEN_ALMACENADO == "TU_REFRESH_TOKEN":
        print("\n¡ADVERTENCIA: Por favor, actualiza las variables CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN_ALMACENADO, ZOHO_ORGANIZATION_ID y CUSTOMER_TO_ADD_PAYMENT_METHOD_ID con tus propios valores!")
        print("Asegúrate también de que tu REFRESH_TOKEN_ALMACENADO tiene los scopes para Zoho Subscriptions (ej. ZohoSubscriptions.hostedpages.CREATE).")
        exit()
    # --- Fin de la sección de actualización ---

    # Paso 1: Usar el Refresh Token para obtener un Access Token fresco
    # Este access token DEBE SER VÁLIDO para Zoho Subscriptions.
    current_access_token = refrescar_access_token(
        REFRESH_TOKEN_ALMACENADO, CLIENT_ID, CLIENT_SECRET, ZOHO_ACCOUNTS_URL
    )

    if current_access_token:
        print("\n¡Access Token obtenido correctamente, procediendo a generar la Hosted Page!")

        # Paso 2: Generar la Hosted Page para añadir un método de pago
        hosted_page_url = generar_hosted_page_add_payment_method(
            current_access_token,
            ZOHO_ORGANIZATION_ID,
            CUSTOMER_TO_ADD_PAYMENT_METHOD_ID,
            REDIRECT_URL_AFTER_ADD_PAYMENT,
            PAYMENT_GATEWAYS_ALLOWED
        )

        if hosted_page_url:
            print(f"\n¡Listo! Envía esta URL a tu cliente para que añada su método de pago: {hosted_page_url}")
            print("\nNOTA: Esta Hosted Page expirará en 1 hora. Asegúrate de que el cliente la usa a tiempo.")
        else:
            print("\nNo se pudo generar la Hosted Page para añadir el método de pago.")
    else:
        print("\nNo se pudo obtener un Access Token válido. No se puede proceder con la llamada a la API.")