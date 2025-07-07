import os
import time
from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, current_app
from dotenv import load_dotenv
import requests
from datetime import datetime, timezone
from functools import wraps
from email_service import send_welcome_email

# Configuración de la aplicación
load_dotenv()

# Crear la aplicación Flask
app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'dev-secret-key')

# Configuración de la aplicación
app.config['APP_NAME'] = 'CRM Zoho Billing'

# Configuración de email
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'mail.geekersteam.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 465))  # Puerto para SSL
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'False').lower() == 'true'
app.config['MAIL_USE_SSL'] = os.getenv('MAIL_USE_SSL', 'True').lower() == 'true'  # Habilitar SSL
app.config['MAIL_DEBUG'] = True  # Habilitar modo debug para ver la comunicación SMTP
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME', 'info@geekersteam.com')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD', '')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER', 'info@geekersteam.com')

# Configuración de Zoho
app.config['ZOHO_CLIENT_ID'] = os.getenv('ZOHO_CLIENT_ID')
app.config['ZOHO_CLIENT_SECRET'] = os.getenv('ZOHO_CLIENT_SECRET')
app.config['ZOHO_REDIRECT_URI'] = os.getenv('ZOHO_REDIRECT_URI')
app.config['ZOHO_ORGANIZATION_ID'] = os.getenv('ZOHO_ORGANIZATION_ID')
app.config['ZOHO_ACCESS_TOKEN'] = os.getenv('ZOHO_ACCESS_TOKEN')
app.config['ZOHO_REFRESH_TOKEN'] = os.getenv('ZOHO_REFRESH_TOKEN')

# Configuración adicional para el cliente SMTP
app.config['MAIL_SUPPRESS_SEND'] = False  # Asegurarse de que los correos se envíen realmente

# Importar e inicializar extensiones
from extensions import mail
mail.init_app(app)

# Filtro personalizado para obtener el año actual
@app.template_filter('current_year')
def current_year_filter(_):
    return datetime.now(timezone.utc).year

# Asegurarse de que el filtro esté disponible en todas las plantillas
@app.context_processor
def inject_utility_filters():
    return {
        'current_year': current_year_filter
    }

@app.template_filter('date_format')
def date_format_filter(dt, format_str='%Y-%m-%d'):
    """
    Filtro para formatear fechas en las plantillas.

    Args:
        dt: Fecha a formatear (puede ser string o objeto datetime)
        format_str: Formato de salida (por defecto: %Y-%m-%d)
    """
    if dt is None:
        return ""

    # Si es un string, intentar convertirlo a datetime
    if isinstance(dt, str):
        try:
            # Intentar con diferentes formatos de fecha
            from datetime import datetime

            # Lista de formatos de fecha a intentar
            date_formats = [
                '%Y-%m-%dT%H:%M:%S%z',  # Formato ISO con timezone
                '%Y-%m-%dT%H:%M:%S',     # Formato ISO sin timezone
                '%Y-%m-%d %H:%M:%S',     # Formato SQL
                '%Y-%m-%d',               # Solo fecha
                '%d/%m/%Y %H:%M:%S',      # Formato europeo con tiempo
                '%d/%m/%Y',               # Formato europeo solo fecha
                '%m/%d/%Y %H:%M:%S',      # Formato americano con tiempo
                '%m/%d/%Y'                # Formato americano solo fecha
            ]

            parsed_dt = None
            for fmt in date_formats:
                try:
                    parsed_dt = datetime.strptime(dt, fmt)
                    break
                except ValueError:
                    continue

            if parsed_dt is None:
                # Si no se pudo parsear, devolver el string original
                return dt

            dt = parsed_dt
        except Exception as e:
            # Si falla la conversión, devolver el string original
            current_app.logger.warning(f"No se pudo formatear la fecha '{dt}': {str(e)}")
            return dt

    # Si es un objeto datetime, formatearlo
    try:
        return dt.strftime(format_str)
    except Exception as e:
        current_app.logger.warning(f"Error al formatear fecha: {str(e)}")
        return str(dt)

@app.template_filter('datetimeformat')
def datetimeformat_filter(value, format='%Y-%m-%d %H:%M'):
    """
    Filtro para formatear fechas en las plantillas.

    Args:
        value: Fecha a formatear (puede ser string, datetime o date)
        format: Formato de salida (por defecto: %Y-%m-%d %H:%M)
    """
    if not value:
        return ""

    # Si es un string, intentar convertirlo a datetime
    if isinstance(value, str):
        try:
            from datetime import datetime
            # Intentar con diferentes formatos de fecha
            date_formats = [
                '%Y-%m-%dT%H:%M:%S%z',  # Formato ISO con timezone
                '%Y-%m-%dT%H:%M:%S',     # Formato ISO sin timezone
                '%Y-%m-%d %H:%M:%S',     # Formato SQL
                '%Y-%m-%d',              # Solo fecha
                '%d/%m/%Y %H:%M:%S',     # Formato europeo con tiempo
                '%d/%m/%Y',              # Formato europeo solo fecha
                '%m/%d/%Y %H:%M:%S',     # Formato americano con tiempo
                '%m/%d/%Y'               # Formato americano solo fecha
            ]

            parsed_dt = None
            for fmt in date_formats:
                try:
                    parsed_dt = datetime.strptime(value, fmt)
                    break
                except ValueError:
                    continue

            if parsed_dt is not None:
                value = parsed_dt
            else:
                return value  # Si no se puede parsear, devolver el valor original
        except Exception as e:
            current_app.logger.warning(f"Error al parsear fecha '{value}': {str(e)}")
            return value

    # Si es un objeto date o datetime, formatearlo
    try:
        return value.strftime(format)
    except Exception as e:
        current_app.logger.warning(f"Error al formatear fecha: {str(e)}")
        return str(value)

@app.template_filter('truncate')
def truncate_filter(s, length=255, killwords=False, end='...'):
    """
    Filtro para truncar cadenas de texto en las plantillas.

    Args:
        s: Cadena a truncar
        length: Longitud máxima de la cadena (incluyendo el sufijo)
        end: Sufijo a agregar si se trunca la cadena
    """
    if not s:
        return ""
    
    # Verificar que "end" sea una cadena, si no lo es, usar el valor por defecto
    if not isinstance(end, str):
        end = "..."
    
    s = str(s)
    if len(s) <= length:
        return s

    # killwords flag is ignorado; simplemente se trunca la cadena
    return s[:length - len(end)] + end

@app.template_filter('currency')
def currency_filter(amount, currency='USD', locale='en_US'):
    """
    Filtro para formatear valores monetarios en las plantillas.

    Args:
        amount: Cantidad a formatear
        currency: Código de moneda (por defecto: USD)
        locale: Configuración regional (por defecto: en_US)
    """
    if amount is None:
        return ""

    try:
        # Convertir a float si es un string
        amount = float(amount)

        # Formatear como moneda
        if locale == 'es_MX':
            # Para español de México
            return f"${amount:,.2f} {currency}"
        else:
            # Para otros locales, formato estándar
            return f"{currency} {amount:,.2f}"
    except (ValueError, TypeError):
        # Si no se puede convertir a número, devolver el valor original
        return str(amount)



# Contexto de aplicación disponible para todas las plantillas
@app.context_processor
def inject_now():
    return {'now': datetime.now(timezone.utc)}

# Configuración de Zoho
ZOHO_ACCOUNTS_URL = "https://accounts.zoho.com/oauth/v2/token"
ZOHO_BILLING_API_BASE_URL = "https://www.zohoapis.com/billing/v1"

# Obtener credenciales de las variables de entorno
CLIENT_ID = os.getenv('ZOHO_CLIENT_ID')
CLIENT_SECRET = os.getenv('ZOHO_CLIENT_SECRET')
REDIRECT_URI = os.getenv('ZOHO_REDIRECT_URI')
REFRESH_TOKEN = os.getenv('ZOHO_REFRESH_TOKEN')
ORGANIZATION_ID = os.getenv('ZOHO_ORGANIZATION_ID')

def get_access_token():
    """Obtiene un nuevo access_token usando el refresh_token."""
    # Verificar que todas las variables necesarias estén configuradas
    required_vars = {
        'ZOHO_CLIENT_ID': CLIENT_ID,
        'ZOHO_CLIENT_SECRET': CLIENT_SECRET,
        'ZOHO_REFRESH_TOKEN': REFRESH_TOKEN,
        'ZOHO_ORGANIZATION_ID': ORGANIZATION_ID
    }

    missing_vars = [name for name, value in required_vars.items() if not value]
    if missing_vars:
        print(f"Error: Las siguientes variables de entorno no están configuradas: {', '.join(missing_vars)}")
        return None

    payload = {
        'grant_type': 'refresh_token',
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'refresh_token': REFRESH_TOKEN
    }

    # Solo incluir redirect_uri si está configurado
    if REDIRECT_URI:
        payload['redirect_uri'] = REDIRECT_URI

    try:
        print(f"[DEBUG] Solicitando nuevo token de acceso a: {ZOHO_ACCOUNTS_URL}")
        response = requests.post(ZOHO_ACCOUNTS_URL, data=payload, timeout=10)

        # Mostrar más detalles en caso de error
        if not response.ok:
            print(f"[ERROR] Error en la respuesta de Zoho: {response.status_code}")
            print(f"[ERROR] Respuesta: {response.text}")
            response.raise_for_status()

        data = response.json()
        if 'access_token' not in data:
            print(f"[ERROR] No se encontró access_token en la respuesta: {data}")
            return None

        print("[DEBUG] Token de acceso obtenido exitosamente")
        # Devolver un diccionario con el token de acceso
        return {'access_token': data['access_token']}

    except requests.exceptions.RequestException as e:
        print(f"[ERROR] Error en la petición para obtener token: {str(e)}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"[ERROR] Respuesta del servidor: {e.response.status_code} - {e.response.text}")
    except Exception as e:
        print(f"[ERROR] Error inesperado al obtener token: {str(e)}")

    return None

# Variable global para almacenar el token en memoria
cached_token = None

# Decorador para verificar la autenticación de Zoho
def require_zoho_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not app.config.get('ZOHO_ACCESS_TOKEN'):
            return jsonify({
                'status': 'error',
                'message': 'Zoho access token is not configured. Please set ZOHO_ACCESS_TOKEN in your environment variables.'
            }), 401
        return f(*args, **kwargs)
    return decorated_function

def make_zoho_request(method, endpoint, data=None, max_retries=2):
    """
    Función genérica para hacer peticiones a la API de Zoho con manejo de reintentos.

    Args:
        method (str): Método HTTP (GET, POST, PUT, etc.)
        endpoint (str): Endpoint de la API de Zoho
        data (dict, optional): Datos a enviar en la petición.
        max_retries (int): Número máximo de reintentos ante errores de autenticación.

    Returns:
        dict or None: Respuesta de la API o None en caso de error
    """
    global cached_token

    # Obtener el token de acceso (usar caché si está disponible)
    token_info = cached_token or get_access_token()
    if not token_info or 'access_token' not in token_info:
        print("[ERROR] No se pudo obtener el token de acceso")
        return None

    # Configurar headers con el token
    headers = {
        'Authorization': f'Zoho-oauthtoken {token_info["access_token"]}',
        'X-com-zoho-subscriptions-organizationid': ORGANIZATION_ID,
        'Content-Type': 'application/json'
    }

    # Limpiar el endpoint por si tiene parámetros de consulta
    base_url = f"{ZOHO_BILLING_API_BASE_URL}/{endpoint.split('?')[0]}"

    # Manejar parámetros de consulta
    if '?' in endpoint:
        query_params = endpoint.split('?', 1)[1]
        url = f"{base_url}?{query_params}"
    else:
        url = base_url

    for attempt in range(max_retries + 1):
        try:
            print(f"[DEBUG] Intento {attempt + 1} - {method} {base_url}")

            # Realizar la petición
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, headers=headers, json=data, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, headers=headers, json=data, timeout=30)
            else:
                print(f"[ERROR] Método HTTP no soportado: {method}")
                return None

            print(f"[DEBUG] Respuesta: {response.status_code} - {response.reason}")

            # Si el token expiró, intentar refrescarlo una vez
            if response.status_code == 401 and attempt == 0:
                print("[INFO] Token expirado, intentando refrescar...")
                token_info = get_access_token()  # Forzar refresco del token
                if token_info and 'access_token' in token_info:
                    cached_token = token_info
                    headers['Authorization'] = f'Zoho-oauthtoken {token_info["access_token"]}'
                    continue

            # Si hay error, mostrarlo
            if not response.ok:
                error_msg = response.text[:500] + ("..." if len(response.text) > 500 else "")
                print(f"[ERROR] Error en la respuesta: {response.status_code} - {error_msg}")
                response.raise_for_status()

            # Si llegamos aquí, la petición fue exitosa
            try:
                return response.json() if response.content else {}
            except ValueError as e:
                print(f"[ERROR] No se pudo parsear la respuesta JSON: {e}")
                return None

        except requests.exceptions.HTTPError as http_err:
            if hasattr(http_err, 'response') and http_err.response is not None:
                status_code = http_err.response.status_code
                error_msg = http_err.response.text[:500] + ("..." if len(http_err.response.text) > 500 else "")
                print(f"[ERROR] Error HTTP {status_code}: {error_msg}")

                # Si es error de autenticación y no hemos agotado los reintentos
                if status_code == 401 and attempt < max_retries:
                    print("[INFO] Reintentando con nuevo token...")
                    cached_token = get_access_token()
                    if cached_token:
                        headers['Authorization'] = f'Zoho-oauthtoken {cached_token}'
                        continue
            else:
                print(f"[ERROR] Error HTTP sin respuesta: {http_err}")

        except requests.exceptions.RequestException as req_err:
            print(f"[ERROR] Error en la petición: {req_err}")
            if attempt == max_retries:
                break
            time.sleep(1)  # Pequeña pausa antes de reintentar
            continue

        except Exception as e:
            print(f"[ERROR] Error inesperado: {str(e)}")
            if attempt == max_retries:
                break
            time.sleep(1)
            continue

    print("[ERROR] Se agotaron los intentos de conexión")
    return None

# Rutas de la aplicación
@app.route('/')
def index():
    return redirect(url_for('list_customers'))

@app.route('/debug/config')
def debug_config():
    """Ruta de diagnóstico para verificar la configuración."""
    config_status = {
        'ZOHO_CLIENT_ID': '✅ Configurado' if current_app.config.get('ZOHO_CLIENT_ID') else '❌ No configurado',
        'ZOHO_CLIENT_SECRET': '✅ Configurado' if current_app.config.get('ZOHO_CLIENT_SECRET') else '❌ No configurado',
        'ZOHO_ORGANIZATION_ID': '✅ Configurado' if current_app.config.get('ZOHO_ORGANIZATION_ID') else '❌ No configurado',
        'ZOHO_ACCESS_TOKEN': '✅ Configurado' if current_app.config.get('ZOHO_ACCESS_TOKEN') else '❌ No configurado',
        'ZOHO_REFRESH_TOKEN': '✅ Configurado' if current_app.config.get('ZOHO_REFRESH_TOKEN') else '❌ No configurado',
    }

    # Verificar si podemos obtener un token
    token_test = '❌ Error'
    try:
        token_info = get_access_token()
        if token_info and 'access_token' in token_info:
            token_test = '✅ Token obtenido correctamente'
        else:
            token_test = '❌ No se pudo obtener token'
    except Exception as e:
        token_test = f'❌ Error: {str(e)}'

    config_status['Token Test'] = token_test

    return jsonify(config_status)

@app.route('/debug/hosted-pages-raw')
def debug_hosted_pages_raw():
    """Ruta de diagnóstico para probar la API de hosted pages directamente."""
    try:
        # Obtener token
        token_info = get_access_token()
        if not token_info or 'access_token' not in token_info:
            return jsonify({'error': 'No se pudo obtener token'})

        access_token = token_info['access_token']
        organization_id = current_app.config.get('ZOHO_ORGANIZATION_ID')

        # Hacer petición directa a la API
        url = "https://www.zohoapis.com/billing/v1/hostedpages"
        headers = {
            'Authorization': f'Zoho-oauthtoken {access_token}',
            'X-com-zoho-subscriptions-organizationid': organization_id,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }

        response = requests.get(url, headers=headers, timeout=30)

        result = {
            'status_code': response.status_code,
            'headers': dict(response.headers),
            'raw_response': response.text,
        }

        if response.status_code == 200:
            try:
                json_data = response.json()
                result['json_data'] = json_data
                if 'hosted_pages' in json_data:
                    result['hosted_pages_count'] = len(json_data['hosted_pages'])
                    result['first_page'] = json_data['hosted_pages'][0] if json_data['hosted_pages'] else None
            except:
                result['json_error'] = 'No se pudo parsear JSON'

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/customers')
def list_customers():
    page = request.args.get('page', 1, type=int)
    per_page = 10  # Número de clientes por página

    # Calcular el rango de la paginación
    start = (page - 1) * per_page

    # Obtener todos los clientes (podrías optimizar esto con paginación del lado de la API si está disponible)
    response = make_zoho_request('GET', 'customers?sort_column=created_time&sort_order=D')
    if not response:
        flash('Error al cargar la lista de clientes', 'error')
        return render_template('customers/list.html', customers=[], pagination=None)

    all_customers = response.get('customers', [])
    total_customers = len(all_customers)

    # Aplicar paginación manual
    paginated_customers = all_customers[start:start + per_page]

    # Crear objeto de paginación
    pagination = {
        'page': page,
        'per_page': per_page,
        'total': total_customers,
        'pages': (total_customers + per_page - 1) // per_page
    }

    return render_template('customers/list.html',
                         customers=paginated_customers,
                         pagination=pagination)

@app.route('/customers/<string:customer_id>')
def view_customer(customer_id):
    # Obtener los detalles del cliente
    response = make_zoho_request('GET', f'customers/{customer_id}')
    if not response or 'code' not in response or response['code'] != 0:
        flash('No se pudo cargar la información del cliente', 'error')
        return redirect(url_for('list_customers'))

    customer = response.get('customer', {})

    # Obtener transacciones del cliente si es necesario
    transactions = []
    transactions_response = make_zoho_request('GET', f'transactions?customer_id={customer_id}')
    if transactions_response and 'transactions' in transactions_response:
        transactions = transactions_response['transactions']

    return render_template('customers/view.html',
                         customer=customer,
                         transactions=transactions)

@app.route('/customers/<string:customer_id>/edit', methods=['GET', 'POST'])
def edit_customer(customer_id):
    if request.method == 'POST':
        customer_data = {
            'display_name': request.form.get('display_name'),
            'first_name': request.form.get('first_name'),
            'last_name': request.form.get('last_name'),
            'email': request.form.get('email'),
            'company_name': request.form.get('company_name'),
            'phone': request.form.get('phone'),
            'mobile': request.form.get('mobile'),
            'website': request.form.get('website'),
            'billing_address': {
                'attention': request.form.get('billing_attention', ''),
                'address': request.form.get('billing_address', ''),
                'street2': request.form.get('billing_street2', ''),
                'city': request.form.get('billing_city', ''),
                'state': request.form.get('billing_state', ''),
                'zip': request.form.get('billing_zip', ''),
                'country': request.form.get('billing_country', '')
            }
        }

        response = make_zoho_request('PUT', f'customers/{customer_id}', {'customer': customer_data})
        if response and 'customer' in response:
            flash('Cliente actualizado exitosamente!', 'success')
            return redirect(url_for('list_customers'))
        else:
            flash('Error al actualizar el cliente', 'error')

    # Obtener los datos actuales del cliente
    response = make_zoho_request('GET', f'customers/{customer_id}')
    if not response or 'customer' not in response:
        flash('Cliente no encontrado', 'error')
        return redirect(url_for('list_customers'))

    return render_template('customers/form.html', customer=response['customer'])

def truncate_string(value, max_length=100):
    """Trunca una cadena a la longitud máxima especificada."""
    if not value:
        return value
    return str(value)[:max_length]

@app.route('/customers/new', methods=['GET', 'POST'])
def new_customer():
    if request.method == 'POST':
        # Validar campos requeridos
        required_fields = ['display_name', 'email']
        for field in required_fields:
            if not request.form.get(field):
                flash(f'El campo {field} es requerido', 'error')
                return render_template('customers/form.html', customer=request.form)

        # Crear diccionario con los datos del cliente, truncando los campos según sea necesario
        billing_address = {
            'attention': truncate_string(request.form.get('billing_attention', ''), 50),
            'street': truncate_string(request.form.get('billing_address', ''), 250),
            'city': truncate_string(request.form.get('billing_city', ''), 50),
            'state': truncate_string(request.form.get('billing_state', ''), 50),
            'zip': truncate_string(request.form.get('billing_zip', ''), 20),
            'country': truncate_string(request.form.get('billing_country', ''), 50)
        }

        # Eliminar campos vacíos de la dirección de facturación
        billing_address = {k: v for k, v in billing_address.items() if v}

        # Crear el objeto de datos del cliente según el formato requerido por Zoho
        customer_data = {
            'display_name': truncate_string(request.form.get('display_name'), 100),
            'first_name': truncate_string(request.form.get('first_name'), 50),
            'last_name': truncate_string(request.form.get('last_name'), 50),
            'email': truncate_string(request.form.get('email'), 100),
            'company_name': truncate_string(request.form.get('company_name'), 100),
            'phone': truncate_string(request.form.get('phone'), 50) or None,
            'mobile': truncate_string(request.form.get('mobile'), 50) or None,
            'website': truncate_string(request.form.get('website'), 200) or None,
            'billing_address': billing_address,
            'shipping_address': billing_address  # Usar la misma dirección para envío por defecto
        }

        # Eliminar campos vacíos del cliente
        customer_data = {k: v for k, v in customer_data.items() if v is not None}

        print("Datos del cliente a enviar:", customer_data)  # Para depuración

        # Enviar los datos a Zoho
        response = make_zoho_request('POST', 'customers', customer_data)

        if response and 'code' in response and response['code'] == 0:
            flash('¡Cliente creado exitosamente!', 'success')
            return redirect(url_for('list_customers'))
        else:
            error_msg = response.get('message', 'Error desconocido al crear el cliente') if response else 'Error al conectar con Zoho'
            flash(f'Error al crear el cliente: {error_msg}', 'error')

    return render_template('customers/form.html')


@app.route('/test-email')
def test_email():
    """Ruta de prueba para enviar un correo electrónico."""
    # Datos de ejemplo para el usuario
    class User:
        def __init__(self, **kwargs):
            self.__dict__.update(kwargs)

    # Usar siempre hector@oberstaff.com para pruebas
    test_email = "hector@oberstaff.com"
    print(f"\n[TEST] Enviando correo de prueba a: {test_email}")

    # Crear un usuario de ejemplo
    test_user = User(
        first_name="Héctor",
        last_name="Prueba",
        email=test_email,
        temporary_password="T3mpP@ssw0rd"
    )

    try:
        # Mostrar información de depuración
        print(f"[TEST] Usuario creado con email: {test_user.email}")
        print(f"[TEST] Remitente configurado: {current_app.config.get('MAIL_DEFAULT_SENDER', 'No configurado')}")
        print(f"[TEST] Servidor SMTP: {current_app.config.get('MAIL_SERVER')}:{current_app.config.get('MAIL_PORT')}")

        # Enviar correo de bienvenida
        result = send_welcome_email(test_user)
        if result:
            flash(f'¡Correo de prueba enviado correctamente a {test_user.email}!', 'success')
            print(f"[TEST] Correo enviado exitosamente a {test_user.email}")
        else:
            flash('Error al enviar el correo (ver logs para más detalles)', 'error')
            print("[TEST] Error al enviar el correo")
    except Exception as e:
        error_msg = f'Error al enviar el correo: {str(e)}'
        flash(error_msg, 'error')
        print(f"[ERROR] {error_msg}")
        import traceback
        traceback.print_exc()  # Imprimir el traceback completo

    return redirect(url_for('index'))

from zoho_billing import ZohoBillingAPI


@app.route('/hosted-pages')
def list_hosted_pages():
    """Lista todas las páginas alojadas en Zoho Billing."""
    try:
        # Obtener el token de acceso y el ID de la organización de la configuración de la aplicación
        access_token = current_app.config.get('ZOHO_ACCESS_TOKEN')
        organization_id = current_app.config.get('ZOHO_ORGANIZATION_ID')

        # Si no hay token configurado, intentar obtener uno nuevo
        if not access_token:
            token_info = get_access_token()
            if token_info and 'access_token' in token_info:
                access_token = token_info['access_token']
            else:
                flash('No se pudo obtener el token de acceso de Zoho. Verifica la configuración.', 'danger')
                return redirect(url_for('index'))

        # Verificar que el ID de organización esté configurado
        if not organization_id:
            flash('Error de configuración: Falta ZOHO_ORGANIZATION_ID en las variables de entorno.', 'danger')
            return redirect(url_for('index'))

        current_app.logger.info(f"Inicializando ZohoBillingAPI con organization_id: {organization_id}")

        # Inicializar la API de Zoho Billing
        zoho_billing = ZohoBillingAPI(
            access_token=access_token,
            organization_id=organization_id
        )

        # Configurar el logger
        import logging
        from flask.logging import default_handler

        if not hasattr(zoho_billing, 'logger') or not zoho_billing.logger.handlers:
            zoho_billing.logger = logging.getLogger('zoho_billing')
            zoho_billing.logger.addHandler(default_handler)

        # Establecer nivel de log a DEBUG para ver toda la información
        zoho_billing.logger.setLevel(logging.DEBUG)

        current_app.logger.info("Obteniendo lista de páginas alojadas...")

        # Obtener la lista de páginas alojadas
        hosted_pages = zoho_billing.list_hosted_pages()

        current_app.logger.info(f"[DEBUG] Respuesta directa de zoho_billing.list_hosted_pages(): {hosted_pages}")
        current_app.logger.info(f"[DEBUG] Tipo de respuesta: {type(hosted_pages)}")

        if hosted_pages is None:
            error_msg = 'La respuesta de la API de Zoho fue None. Verifica los logs para más detalles.'
            current_app.logger.error(error_msg)
            flash('No se pudieron obtener las páginas alojadas. Verifica los logs para más detalles.', 'danger')
            return redirect(url_for('index'))

        # Si es una lista vacía, mostrar mensaje informativo
        if isinstance(hosted_pages, list) and len(hosted_pages) == 0:
            current_app.logger.info("La lista de hosted pages está vacía")
            flash('No hay páginas alojadas disponibles.', 'info')

        # Si es una lista con elementos, mostrar cuántos
        if isinstance(hosted_pages, list) and len(hosted_pages) > 0:
            current_app.logger.info(f"Se encontraron {len(hosted_pages)} páginas alojadas")
            # Mostrar los primeros elementos para debug
            for i, page in enumerate(hosted_pages[:3]):
                current_app.logger.info(f"[DEBUG] Página {i+1}: {page}")

        # No procesar más la respuesta, usar directamente lo que devuelve zoho_billing
        current_app.logger.info(f"Enviando {len(hosted_pages) if isinstance(hosted_pages, list) else 'N/A'} páginas al template")
        return render_template('hosted_pages.html', hosted_pages=hosted_pages)

    except Exception as e:
        error_msg = f'Error inesperado al obtener las páginas alojadas: {str(e)}'
        current_app.logger.error(error_msg, exc_info=True)
        flash('Ocurrió un error inesperado. Por favor, inténtalo de nuevo más tarde.', 'danger')
        return redirect(url_for('index'))


@app.route('/hosted-pages/<hostedpage_id>')
def view_hosted_page(hostedpage_id):
    """Muestra los detalles de una página alojada específica."""
    # Inicializar la API de Zoho Billing
    zoho_billing = ZohoBillingAPI(
        access_token=current_app.config.get('ZOHO_ACCESS_TOKEN'),
        organization_id=current_app.config.get('ZOHO_ORGANIZATION_ID')
    )

    # Obtener los detalles de la página alojada
    page = zoho_billing.get_hosted_page(hostedpage_id)

    if page is None:
        flash(f'No se pudo obtener la página alojada con ID: {hostedpage_id}', 'danger')
        return redirect(url_for('list_hosted_pages'))

    return render_template('view_hosted_page.html', page=page)


if __name__ == '__main__':
    # Crear carpetas necesarias
    os.makedirs('templates/customers', exist_ok=True)
    os.makedirs('templates/emails', exist_ok=True)

    # Iniciar la aplicación
    app.run(debug=True)
    os.makedirs('static/css', exist_ok=True)
    os.makedirs('static/js', exist_ok=True)
