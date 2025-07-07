
# OBTENER CONTACTOS DE BIGIN
# import requests
# import json
#
# # --- Configuración (¡ACTUALIZA ESTOS VALORES CON TUS CREDENCIALES Y EL REFRESH TOKEN!) ---
# CLIENT_ID = "1000.GQTMVWKPS7HAJ5XRGB3HKZMB0W0IOC"
# CLIENT_SECRET = "5b16c9a69e2f96d0224be556b377f9afc4dddf75a7"
#
# # ¡ESTE ES EL REFRESH TOKEN QUE DEBES HABER OBTENIDO EN EL PASO ANTERIOR!
# REFRESH_TOKEN_ALMACENADO = "1000.d36ec67a1c828d1ff3b87ee15ef977eb.0943c9b523718dbd992506416a1c013f"
#
# # URL base para el proceso de OAuth de Zoho. Ajusta según tu centro de datos (DC):
# # Por ejemplo: https://accounts.zoho.eu, https://accounts.zoho.in, etc.
# ZOHO_ACCOUNTS_URL = "https://accounts.zoho.com"
#
# # URL base para la API de Bigin. Ajusta según tu centro de datos (DC):
# # Por ejemplo: https://www.zohoapis.eu/bigin/v2, https://www.zohoapis.in/bigin/v2, etc.
# BIGIN_API_URL = "https://www.zohoapis.com/bigin/v2"
#
#
# # --- Función para Usar el Refresh Token y Obtener un Nuevo Access Token ---
# def refrescar_access_token(refresh_token, client_id, client_secret, zoho_accounts_url):
#     """
#     Utiliza el refresh token para obtener un nuevo access token.
#     """
#     token_url = f"{zoho_accounts_url}/oauth/v2/token"
#     payload = {
#         "refresh_token": refresh_token,
#         "client_id": client_id,
#         "client_secret": client_secret,
#         "grant_type": "refresh_token",
#     }
#
#     print("\n--- Intentando refrescar Access Token ---")
#     print(f"Request URL: {token_url}")  # Para depuración
#     try:
#         response = requests.post(token_url, data=payload)
#         response_data = response.json()  # Siempre intenta parsear JSON para ver errores detallados
#         response.raise_for_status()  # Lanza una excepción para errores HTTP (4xx o 5xx)
#
#         if response.status_code == 200:
#             print("¡Access Token refrescado exitosamente!")
#             print(f"Nuevo Access Token: {response_data.get('access_token')[:20]}...")
#             print(f"Expira en: {response_data.get('expires_in')} segundos")
#             return response_data.get('access_token')
#         else:  # Esto no debería ejecutarse si raise_for_status() funciona, pero es una buena salvaguarda
#             print(f"\nError inesperado al refrescar Access Token: {response.status_code}")
#             print("Respuesta de Zoho:", json.dumps(response_data, indent=4))
#             return None
#     except requests.exceptions.HTTPError as e:
#         print(f"\nError HTTP al refrescar token ({e.response.status_code}): {e}")
#         # Intenta imprimir el cuerpo de la respuesta de error si está disponible
#         try:
#             error_details = e.response.json()
#             print("Detalles del error de Zoho:", json.dumps(error_details, indent=4))
#         except json.JSONDecodeError:
#             print("Cuerpo de la respuesta de error no JSON:", e.response.text)
#         return None
#     except requests.exceptions.RequestException as e:
#         print(f"\nError de conexión al refrescar token: {e}")
#         return None
#
#
# # --- Función para Obtener Datos de la API de Módulos de Bigin ---
# def obtener_modulos_bigin(access_token, bigin_api_url):
#     """
#     Recupera la lista de módulos de Bigin utilizando el access token.
#     """
#     modulos_api_url = f"{bigin_api_url}/settings/modules"
#     headers = {
#         "Authorization": f"Zoho-oauthtoken {access_token}"
#     }
#
#     print(f"\n--- Intentando obtener módulos de Bigin de {modulos_api_url} ---")
#     print(f"Usando Access Token: {access_token[:20]}...")  # Para depuración
#     try:
#         response = requests.get(modulos_api_url, headers=headers)
#         response_data = response.json()
#         response.raise_for_status()
#
#         if response.status_code == 200:
#             print("\n¡Módulos de Bigin obtenidos exitosamente!")
#             print("Respuesta completa de módulos:\n", json.dumps(response_data, indent=4))
#
#             if 'modules' in response_data and isinstance(response_data['modules'], list):
#                 print(f"\nTotal de módulos encontrados: {len(response_data['modules'])}")
#                 for module in response_data['modules']:
#                     print(
#                         f"- Nombre: {module.get('module_name')}, API Name: {module.get('api_name')}, ID: {module.get('id')}")
#             else:
#                 print("\nLa respuesta no contiene la lista 'modules' o no es un formato esperado.")
#             return response_data
#         else:
#             print(f"\nError inesperado al recuperar módulos de Bigin: {response.status_code}")
#             print("Respuesta de Bigin:", json.dumps(response_data, indent=4))
#             return None
#     except requests.exceptions.HTTPError as e:
#         print(f"\nError HTTP al obtener módulos ({e.response.status_code}): {e}")
#         try:
#             error_details = e.response.json()
#             print("Detalles del error de Bigin:", json.dumps(error_details, indent=4))
#         except json.JSONDecodeError:
#             print("Cuerpo de la respuesta de error no JSON:", e.response.text)
#         return None
#     except requests.exceptions.RequestException as e:
#         print(f"\nError de conexión al obtener módulos: {e}")
#         return None
#
#
# # --- Función para Obtener Contactos de Bigin ---
# def obtener_contactos_bigin(access_token, bigin_api_url):
#     """
#     Recupera la lista de contactos de Bigin utilizando el access token.
#     """
#     contacts_api_url = f"{bigin_api_url}/Contacts"  # Endpoint para contactos
#     headers = {
#         "Authorization": f"Zoho-oauthtoken {access_token}"
#     }
#
#     # *** ESTO ES LO QUE HAY QUE AGREGAR/MODIFICAR ***
#     params = {
#         "per_page": 200,  # La cantidad máxima de registros por página permitida por Bigin es 200
#         "page": 1,  # La primera página
#         "fields": "Full_Name,Email,Phone,Mobile,Last_Name,First_Name"  # Campos específicos a recuperar
#     }
#
#     print(f"\n--- Intentando obtener contactos de Bigin de {contacts_api_url} ---")
#     print(f"Usando Access Token: {access_token[:20]}...")
#     print(f"Parámetros de solicitud: {params}")  # Imprime los parámetros que se enviarán
#     try:
#         response = requests.get(contacts_api_url, headers=headers,
#                                 params=params)  # <--- ¡AHORA SE PASAN LOS PARÁMETROS!
#         response_data = response.json()
#         response.raise_for_status()
#
#         if response.status_code == 200:
#             print("\n¡Contactos de Bigin obtenidos exitosamente!")
#             print("Respuesta completa de contactos:\n", json.dumps(response_data, indent=4))
#
#             if 'data' in response_data and isinstance(response_data['data'], list):
#                 print(f"\nTotal de contactos encontrados en esta página: {len(response_data['data'])}")
#                 for contact in response_data['data']:
#                     # Personaliza qué información del contacto imprimir
#                     print(
#                         f"- Nombre: {contact.get('Full_Name')}, Email: {contact.get('Email')}, Teléfono: {contact.get('Phone')}")
#                 # Verifica si hay más registros para paginación
#                 if response_data.get('info', {}).get('more_records'):
#                     print("\n¡ATENCIÓN! Hay más registros. Deberías implementar un bucle para paginar.")
#             else:
#                 print("\nLa respuesta no contiene la lista 'data' o no es un formato esperado para contactos.")
#             return response_data
#         else:
#             print(f"\nError inesperado al recuperar contactos de Bigin: {response.status_code}")
#             print("Respuesta de Bigin:", json.dumps(response_data, indent=4))
#             return None
#     except requests.exceptions.HTTPError as e:
#         print(f"\nError HTTP al obtener contactos ({e.response.status_code}): {e}")
#         # Imprime más detalles del error de Zoho
#         try:
#             error_details = e.response.json()
#             print("Detalles del error de Bigin:", json.dumps(error_details, indent=4))
#         except json.JSONDecodeError:
#             print("Cuerpo de la respuesta de error no JSON:", e.response.text)
#         return None
#     except requests.exceptions.RequestException as e:
#         print(f"\nError de conexión al obtener contactos: {e}")
#         return None
#
#
# # --- Flujo de Ejecución Principal ---
# if __name__ == "__main__":
#     print("--- Prueba de Integración con la API de Zoho Bigin ---")
#
#     # Paso 1: Usar el Refresh Token para obtener un Access Token fresco
#     current_access_token = refrescar_access_token(
#         REFRESH_TOKEN_ALMACENADO, CLIENT_ID, CLIENT_SECRET, ZOHO_ACCOUNTS_URL
#     )
#
#     if current_access_token:
#         print("\n¡Access Token obtenido correctamente, procediendo a llamar las APIs de Bigin!")
#
#         # Paso 2: Usar el Access Token para obtener los módulos de Bigin (y ver su respuesta completa)
#         print("\n--- Obteniendo la lista y detalles de los módulos ---")
#         obtener_modulos_bigin(current_access_token, BIGIN_API_URL)
#
#         # ---
#         print("\n--- Intentando obtener los contactos del módulo 'Contacts' ---")
#         # Paso 3: Usar el Access Token para obtener los contactos de Bigin (y ver su respuesta completa)
#         obtener_contactos_bigin(current_access_token, BIGIN_API_URL)
#     else:
#         print("\nNo se pudo obtener un Access Token válido. No se puede proceder con las llamadas a la API.")



# RECORDS  PIPELINES y productos DE BIGIN
# import requests
# import json
#
# # --- Configuración (¡ACTUALIZA ESTOS VALORES CON TUS CREDENCIALES Y EL REFRESH TOKEN!) ---
# CLIENT_ID = "1000.GQTMVWKPS7HAJ5XRGB3HKZMB0W0IOC"
# CLIENT_SECRET = "5b16c9a69e2f96d0224be556b377f9afc4dddf75a7"
#
# # ¡ESTE ES EL REFRESH TOKEN QUE DEBES HABER OBTENIDO EN EL PASO ANTERIOR!
# REFRESH_TOKEN_ALMACENADO = "1000.d36ec67a1c828d1ff3b87ee15ef977eb.0943c9b523718dbd992506416a1c013f"
#
# # URL base para el proceso de OAuth de Zoho. Ajusta según tu centro de datos (DC):
# # Por ejemplo: https://accounts.zoho.eu, https://accounts.zoho.in, etc.
# ZOHO_ACCOUNTS_URL = "https://accounts.zoho.com"
#
# # URL base para la API de Bigin. Ajusta según tu centro de datos (DC):
# # Por ejemplo: https://www.zohoapis.eu/bigin/v2, https://www.zohoapis.in/bigin/v2, etc.
# BIGIN_API_URL = "https://www.zohoapis.com/bigin/v2"
#
#
# # --- Función para Usar el Refresh Token y Obtener un Nuevo Access Token ---
# def refrescar_access_token(refresh_token, client_id, client_secret, zoho_accounts_url):
#     """
#     Utiliza el refresh token para obtener un nuevo access token.
#     """
#     token_url = f"{zoho_accounts_url}/oauth/v2/token"
#     payload = {
#         "refresh_token": refresh_token,
#         "client_id": client_id,
#         "client_secret": client_secret,
#         "grant_type": "refresh_token",
#     }
#
#     print("\n--- Intentando refrescar Access Token ---")
#     print(f"Request URL: {token_url}")
#     try:
#         response = requests.post(token_url, data=payload)
#         response_data = response.json()
#         response.raise_for_status()
#
#         if response.status_code == 200:
#             print("¡Access Token refrescado exitosamente!")
#             print(f"Nuevo Access Token: {response_data.get('access_token')[:20]}...")
#             print(f"Expira en: {response_data.get('expires_in')} segundos")
#             return response_data.get('access_token')
#         else:
#             print(f"\nError inesperado al refrescar Access Token: {response.status_code}")
#             print("Respuesta de Zoho:", json.dumps(response_data, indent=4))
#             return None
#     except requests.exceptions.HTTPError as e:
#         print(f"\nError HTTP al refrescar token ({e.response.status_code}): {e}")
#         try:
#             error_details = e.response.json()
#             print("Detalles del error de Zoho:", json.dumps(error_details, indent=4))
#         except json.JSONDecodeError:
#             print("Cuerpo de la respuesta de error no JSON:", e.response.text)
#         return None
#     except requests.exceptions.RequestException as e:
#         print(f"\nError de conexión al refrescar token: {e}")
#         return None
#
#
# # --- Función para Obtener Registros de Cualquier Módulo (para encontrar IDs) ---
# def obtener_records_modulo_bigin(access_token, bigin_api_url, module_api_name, fields="", per_page=1, max_pages=1):
#     """
#     Recupera registros de un módulo específico de Bigin.
#     Diseñada para encontrar IDs. No se paginará más allá de max_pages.
#
#     Args:
#         access_token (str): El token de acceso OAuth.
#         bigin_api_url (str): La URL base de la API de Bigin.
#         module_api_name (str): El nombre API del módulo (ej. "Pipelines", "Products", etc.).
#         fields (str, optional): Una cadena de campos separados por comas para recuperar. Ej. "Deal_Name,id".
#                                  **Se recomienda siempre incluir 'id' y un campo descriptivo.**
#         per_page (int, optional): Número de registros por página (máx. 200). Predeterminado a 1.
#         max_pages (int, optional): Número máximo de páginas a intentar recuperar. Predeterminado a 1.
#     Returns:
#         list: Una lista de diccionarios, donde cada diccionario es un registro del módulo, o None en caso de error.
#     """
#     records_api_url = f"{bigin_api_url}/{module_api_name}"
#     headers = {
#         "Authorization": f"Zoho-oauthtoken {access_token}"
#     }
#
#     all_records = []
#     current_page = 1
#     more_records = True
#
#     print(f"\n--- Intentando obtener {per_page * max_pages} registros de '{module_api_name}' para encontrar un ID ---")
#     print(f"Solicitando URL: {records_api_url}")
#
#     while more_records and current_page <= max_pages:
#         params = {
#             "per_page": per_page,
#             "page": current_page,
#         }
#         if fields:
#             params["fields"] = fields
#
#         print(f"  > Petición para la página {current_page} con parámetros: {params}")
#
#         try:
#             response = requests.get(records_api_url, headers=headers, params=params)
#             response_data = response.json()
#             response.raise_for_status()
#
#             if response.status_code == 200:
#                 if 'data' in response_data and isinstance(response_data['data'], list):
#                     records_on_page = response_data['data']
#                     all_records.extend(records_on_page)
#                     print(f"  > Página {current_page} recuperada. Registros encontrados: {len(records_on_page)}")
#
#                     info = response_data.get('info', {})
#                     more_records = info.get('more_records', False)
#                     current_page += 1
#                 else:
#                     print(f"\nLa respuesta para el módulo '{module_api_name}' no contiene la lista 'data' o no es un formato esperado.")
#                     print("Respuesta de Bigin:", json.dumps(response_data, indent=4))
#                     return None
#             else:
#                 print(f"\nError inesperado al recuperar registros del módulo '{module_api_name}': {response.status_code}")
#                 print("Respuesta de Bigin:", json.dumps(response_data, indent=4))
#                 return None
#         except requests.exceptions.HTTPError as e:
#             print(f"\nError HTTP al obtener registros del módulo '{module_api_name}' ({e.response.status_code}): {e}")
#             try:
#                 error_details = e.response.json()
#                 print("Detalles del error de Bigin (JSON):", json.dumps(error_details, indent=4))
#             except json.JSONDecodeError:
#                 print("Cuerpo de la respuesta de error no JSON (Error HTTP):", e.response.text)
#             return None
#         except requests.exceptions.RequestException as e:
#             print(f"\nError de conexión al obtener registros del módulo '{module_api_name}': {e}")
#             return None
#
#     print(f"\nTotal de registros encontrados en la búsqueda para '{module_api_name}': {len(all_records)}.")
#     return all_records
#
#
# # --- Función para Obtener un Record Individual por ID ---
# def obtener_record_individual_bigin(access_token, bigin_api_url, module_api_name, record_id):
#     """
#     Recupera los detalles de un registro específico de un módulo en Bigin utilizando su ID.
#
#     Args:
#         access_token (str): El token de acceso OAuth.
#         bigin_api_url (str): La URL base de la API de Bigin.
#         module_api_name (str): El nombre API del módulo (ej. "Pipelines", "Products", "Contacts", "Accounts", etc.).
#         record_id (str): El ID único del registro a recuperar.
#
#     Returns:
#         dict: Un diccionario con los detalles del registro, o None en caso de error.
#     """
#     record_api_url = f"{bigin_api_url}/{module_api_name}/{record_id}"
#     headers = {
#         "Authorization": f"Zoho-oauthtoken {access_token}"
#     }
#
#     print(f"\n--- Intentando obtener detalles completos del registro '{record_id}' del módulo '{module_api_name}' ---")
#     print(f"Solicitando URL: {record_api_url}")
#
#     try:
#         response = requests.get(record_api_url, headers=headers)
#
#         # Punto de depuración: Imprime la respuesta RAW si no es JSON
#         if not response.headers.get('Content-Type', '').startswith('application/json'):
#              print(f"\nAdvertencia: La respuesta no es JSON. Contenido RAW (primeros 500 chars):\n{response.text[:500]}...")
#
#         response_data = response.json()
#         response.raise_for_status()
#
#         if response.status_code == 200:
#             if 'data' in response_data and isinstance(response_data['data'], list) and len(response_data['data']) > 0:
#                 record_details = response_data['data'][0]
#                 print("\n¡Detalles del registro obtenidos exitosamente!")
#                 print("Respuesta completa:\n", json.dumps(record_details, indent=4))
#                 return record_details
#             else:
#                 print(f"\nLa respuesta para el registro '{record_id}' del módulo '{module_api_name}' no contiene datos esperados.")
#                 print("Respuesta de Bigin:", json.dumps(response_data, indent=4))
#                 return None
#         else:
#             print(f"\nError inesperado al recuperar el registro '{record_id}': {response.status_code}")
#             print("Respuesta de Bigin:", json.dumps(response_data, indent=4))
#             return None
#     except requests.exceptions.HTTPError as e:
#         print(f"\nError HTTP al obtener el registro individual ({e.response.status_code}): {e}")
#         try:
#             error_details = e.response.json()
#             print("Detalles del error de Bigin (JSON):", json.dumps(error_details, indent=4))
#         except json.JSONDecodeError:
#             print("Cuerpo de la respuesta de error no JSON (Error HTTP):", e.response.text)
#         return None
#     except json.JSONDecodeError as e:
#         print(f"\nError de decodificación JSON al obtener el registro individual: {e}")
#         print(f"El servidor NO devolvió una respuesta JSON válida para la URL: {record_api_url}")
#         print(f"Contenido RAW de la respuesta: {response.text[:500]}...")
#         return None
#     except requests.exceptions.RequestException as e:
#         print(f"\nError de conexión al obtener el registro individual: {e}")
#         return None
#
#
# # --- Flujo de Ejecución Principal ---
# if __name__ == "__main__":
#     print("--- Prueba para Obtener Detalles de Registros Individuales de Bigin (con búsqueda previa de ID) ---")
#
#     # Paso 1: Usar el Refresh Token para obtener un Access Token fresco
#     current_access_token = refrescar_access_token(
#         REFRESH_TOKEN_ALMACENADO, CLIENT_ID, CLIENT_SECRET, ZOHO_ACCOUNTS_URL
#     )
#
#     if current_access_token:
#         print("\n¡Access Token obtenido correctamente, procediendo a obtener detalles de registros!")
#
#         # --- Ejemplo 1: Obtener detalles de UNA Pipeline (Oportunidad) ---
#         MODULE_PIPELINES = "Pipelines" # Nombre API para Oportunidades
#         PIPELINE_FIELDS_TO_FIND_ID = "Deal_Name,Stage,id" # Campos para la búsqueda inicial
#
#         print(f"\n--- PASO 1: Buscando un ID de Pipeline en el módulo '{MODULE_PIPELINES}' ---")
#         # Obtenemos solo el primer registro para conseguir un ID
#         pipelines_list = obtener_records_modulo_bigin(
#             current_access_token,
#             BIGIN_API_URL,
#             MODULE_PIPELINES,
#             fields=PIPELINE_FIELDS_TO_FIND_ID,
#             per_page=1, # Solo necesitamos uno
#             max_pages=1 # Solo la primera página
#         )
#
#         if pipelines_list and len(pipelines_list) > 0:
#             first_pipeline = pipelines_list[0]
#             pipeline_id_found = first_pipeline.get('id')
#             pipeline_name_found = first_pipeline.get('Deal_Name')
#             print(f"\n¡ID de Pipeline encontrado!: '{pipeline_name_found}' con ID: {pipeline_id_found}")
#
#             print(f"\n--- PASO 2: Obteniendo detalles completos de la Pipeline con ID: {pipeline_id_found} ---")
#             pipeline_details = obtener_record_individual_bigin(
#                 current_access_token,
#                 BIGIN_API_URL,
#                 MODULE_PIPELINES,
#                 pipeline_id_found
#             )
#             if pipeline_details:
#                 print(f"\nInformación clave de la Pipeline:")
#                 print(f"  Nombre de la Oportunidad (Deal_Name): {pipeline_details.get('Deal_Name')}")
#                 print(f"  Etapa (Stage): {pipeline_details.get('Stage')}")
#                 print(f"  Monto (Amount): {pipeline_details.get('Amount')}")
#                 print(f"  Propietario (Owner): {pipeline_details.get('Owner', {}).get('name')}")
#             else:
#                 print(f"\nNo se pudieron obtener los detalles completos de la Pipeline con ID: {pipeline_id_found}.")
#         else:
#             print(f"\nNo se encontraron Pipelines en tu cuenta. No se puede obtener un ID para buscar detalles.")
#             print("Asegúrate de tener al menos una Oportunidad (Deal) creada en tu Zoho Bigin.")
#
#         # --- Ejemplo 2: Obtener detalles de UN Producto ---
#         MODULE_PRODUCTS = "Products" # Nombre API para Productos
#         PRODUCT_FIELDS_TO_FIND_ID = "Product_Name,Unit_Price,id" # Campos para la búsqueda inicial
#
#         print(f"\n\n--- PASO 1: Buscando un ID de Producto en el módulo '{MODULE_PRODUCTS}' ---")
#         products_list = obtener_records_modulo_bigin(
#             current_access_token,
#             BIGIN_API_URL,
#             MODULE_PRODUCTS,
#             fields=PRODUCT_FIELDS_TO_FIND_ID,
#             per_page=1,
#             max_pages=1
#         )
#
#         if products_list and len(products_list) > 0:
#             first_product = products_list[0]
#             product_id_found = first_product.get('id')
#             product_name_found = first_product.get('Product_Name')
#             print(f"\n¡ID de Producto encontrado!: '{product_name_found}' con ID: {product_id_found}")
#
#             print(f"\n--- PASO 2: Obteniendo detalles completos del Producto con ID: {product_id_found} ---")
#             product_details = obtener_record_individual_bigin(
#                 current_access_token,
#                 BIGIN_API_URL,
#                 MODULE_PRODUCTS,
#                 product_id_found
#             )
#             if product_details:
#                 print(f"\nInformación clave del Producto:")
#                 print(f"  Nombre del Producto (Product_Name): {product_details.get('Product_Name')}")
#                 print(f"  Categoría (Product_Category): {product_details.get('Product_Category')}")
#                 print(f"  Precio Unitario (Unit_Price): {product_details.get('Unit_Price')}")
#                 print(f"  Propietario (Owner): {product_details.get('Owner', {}).get('name')}")
#             else:
#                 print(f"\nNo se pudieron obtener los detalles completos del Producto con ID: {product_id_found}.")
#         else:
#             print(f"\nNo se encontraron Productos en tu cuenta. No se puede obtener un ID para buscar detalles.")
#             print("Asegúrate de tener al menos un Producto creado en tu Zoho Bigin.")
#
#     else:
#         print("\nNo se pudo obtener un Access Token válido. No se puede proceder con las llamadas a la API.")



# OBTIENE TODA LA INFO DE TODOS LOS EMBUDOS
# import requests
# import json
#
# # --- Configuración (¡ACTUALIZA ESTOS VALORES CON TUS CREDENCIALES Y EL REFRESH TOKEN!) ---
# CLIENT_ID = "1000.GQTMVWKPS7HAJ5XRGB3HKZMB0W0IOC"
# CLIENT_SECRET = "5b16c9a69e2f96d0224be556b377f9afc4dddf75a7"
#
# # ¡ESTE ES EL REFRESH TOKEN QUE DEBES HABER OBTENIDO EN EL PASO ANTERIOR!
# REFRESH_TOKEN_ALMACENADO = "1000.d36ec67a1c828d1ff3b87ee15ef977eb.0943c9b523718dbd992506416a1c013f"
#
# # URL base para el proceso de OAuth de Zoho. Ajusta según tu centro de datos (DC):
# # Por ejemplo: https://accounts.zoho.eu, https://accounts.zoho.in, etc.
# ZOHO_ACCOUNTS_URL = "https://accounts.zoho.com"
#
# # URL base para la API de Bigin. Ajusta según tu centro de datos (DC):
# # Por ejemplo: https://www.zohoapis.eu/bigin/v2, https://www.zohoapis.in/bigin/v2, etc.
# BIGIN_API_URL = "https://www.zohoapis.com/bigin/v2"
#
#
# # --- Función para Usar el Refresh Token y Obtener un Nuevo Access Token ---
# def refrescar_access_token(refresh_token, client_id, client_secret, zoho_accounts_url):
#     """
#     Utiliza el refresh token para obtener un nuevo access token.
#     """
#     token_url = f"{zoho_accounts_url}/oauth/v2/token"
#     payload = {
#         "refresh_token": refresh_token,
#         "client_id": client_id,
#         "client_secret": client_secret,
#         "grant_type": "refresh_token",
#     }
#
#     print("\n--- Intentando refrescar Access Token ---")
#     print(f"Request URL: {token_url}")
#     try:
#         response = requests.post(token_url, data=payload)
#         response_data = response.json()
#         response.raise_for_status()
#
#         if response.status_code == 200:
#             print("¡Access Token refrescado exitosamente!")
#             print(f"Nuevo Access Token: {response_data.get('access_token')[:20]}...")
#             print(f"Expira en: {response_data.get('expires_in')} segundos")
#             return response_data.get('access_token')
#         else:
#             print(f"\nError inesperado al refrescar Access Token: {response.status_code}")
#             print("Respuesta de Zoho:", json.dumps(response_data, indent=4))
#             return None
#     except requests.exceptions.HTTPError as e:
#         print(f"\nError HTTP al refrescar token ({e.response.status_code}): {e}")
#         try:
#             error_details = e.response.json()
#             print("Detalles del error de Zoho:", json.dumps(error_details, indent=4))
#         except json.JSONDecodeError:
#             print("Cuerpo de la respuesta de error no JSON:", e.response.text)
#         return None
#     except requests.exceptions.RequestException as e:
#         print(f"\nError de conexión al refrescar token: {e}")
#         return None
#
#
# # --- Función para Obtener TODOS los Registros de un Módulo (con paginación completa usando page_token) ---
# def obtener_todas_records_modulo_bigin(access_token, bigin_api_url, module_api_name, fields=""):
#     """
#     Recupera TODOS los registros de un módulo específico de Bigin, manejando la paginación con page_token.
#
#     Args:
#         access_token (str): El token de acceso OAuth.
#         bigin_api_url (str): La URL base de la API de Bigin.
#         module_api_name (str): El nombre API del módulo (ej. "Pipelines").
#         fields (str, optional): Una cadena de campos separados por comas para recuperar. Ej. "Deal_Name,Stage,Amount,id".
#                                  **Es crucial especificar los campos que necesitas aquí.**
#     Returns:
#         list: Una lista de diccionarios, donde cada diccionario es un registro del módulo, o None en caso de error.
#     """
#     records_api_url = f"{bigin_api_url}/{module_api_name}"
#     headers = {
#         "Authorization": f"Zoho-oauthtoken {access_token}"
#     }
#
#     all_records = []
#     current_page_num = 1 # Para nuestra propia depuración, no para el API
#     page_token = None # Variable para almacenar el token de la siguiente página
#     more_records = True
#     per_page_limit = 200 # Máximo de registros por página permitido por Bigin
#
#     print(f"\n--- Intentando obtener TODOS los registros del módulo '{module_api_name}' (Paginación con page_token) ---")
#     print(f"Solicitando URL: {records_api_url}")
#
#     while more_records: # Bucle para paginación: Continúa mientras haya más registros
#         params = {
#             "per_page": per_page_limit,
#             "fields": fields # Siempre enviar los campos deseados
#         }
#
#         if page_token:
#             params["page_token"] = page_token
#             print(f"  > Petición usando page_token (página lógica {current_page_num}) con parámetros: {params}")
#         else:
#             params["page"] = current_page_num # Usamos 'page' para las primeras 2000
#             print(f"  > Petición usando 'page' (página {current_page_num}) con parámetros: {params}")
#
#         try:
#             response = requests.get(records_api_url, headers=headers, params=params)
#             response_data = response.json()
#             response.raise_for_status()
#
#             if response.status_code == 200:
#                 if 'data' in response_data and isinstance(response_data['data'], list):
#                     records_on_page = response_data['data']
#                     all_records.extend(records_on_page)
#                     print(f"  > Página {current_page_num} recuperada. Registros en esta página: {len(records_on_page)}")
#
#                     info = response_data.get('info', {})
#                     more_records = info.get('more_records', False)
#
#                     # Importante: Capturar el next_page_token para la siguiente iteración si existe
#                     if more_records:
#                         new_page_token = info.get('next_page_token')
#                         if new_page_token:
#                             page_token = new_page_token
#                         else:
#                             # Esto puede ocurrir en la última página de los primeros 2000 si no hay más
#                             # allá de 2000. Si 'more_records' es true pero no hay 'next_page_token'
#                             # significa que el API seguirá con paginación numérica, o que hay un problema.
#                             # Para el caso > 2000, 'next_page_token' *debería* estar siempre.
#                             # Si no está y more_records es true, implica que aún estamos en los primeros 2000
#                             # y el 'page' param seguirá funcionando.
#                             # Sin embargo, el error anterior indica que a partir de 2000 SIEMPRE se necesita page_token.
#                             # Por lo tanto, si more_records es True y no hay page_token, podría indicar un problema lógico
#                             # o que el API no está comportándose como se espera después de 2000.
#                             # Si esto sucede, el bucle continuará incrementando 'current_page_num' y eventualmente
#                             # volverá a golpear el límite de 2000 si no se encuentra el page_token.
#                             pass
#
#                     current_page_num += 1 # Siempre incrementamos nuestra propia cuenta de páginas
#                 else:
#                     print(f"\nLa respuesta para el módulo '{module_api_name}' no contiene la lista 'data' o no es un formato esperado.")
#                     print("Respuesta de Bigin:", json.dumps(response_data, indent=4))
#                     return None
#             else:
#                 print(f"\nError inesperado al recuperar registros del módulo '{module_api_name}': {response.status_code}")
#                 print("Respuesta de Bigin:", json.dumps(response_data, indent=4))
#                 return None
#         except requests.exceptions.HTTPError as e:
#             print(f"\nError HTTP al obtener registros del módulo '{module_api_name}' ({e.response.status_code}): {e}")
#             try:
#                 error_details = e.response.json()
#                 print("Detalles del error de Bigin (JSON):", json.dumps(error_details, indent=4))
#             except json.JSONDecodeError:
#                 print("Cuerpo de la respuesta de error no JSON (Error HTTP):", e.response.text)
#             return None
#         except json.JSONDecodeError as e:
#             print(f"\nError de decodificación JSON al obtener registros del módulo '{module_api_name}': {e}")
#             print(f"El servidor NO devolvió una respuesta JSON válida para la URL: {records_api_url}")
#             print(f"Contenido RAW de la respuesta: {response.text[:500]}...")
#             return None
#         except requests.exceptions.RequestException as e:
#             print(f"\nError de conexión al obtener registros del módulo '{module_api_name}': {e}")
#             return None
#
#     print(f"\n¡Proceso de paginación completado para '{module_api_name}'!")
#     print(f"Total de registros recuperados: {len(all_records)}.")
#     return all_records
#
#
# # --- Función para Obtener un Record Individual por ID (se mantiene por si acaso) ---
# # Esta función es útil si después de listar, quieres los *todos* los detalles de un registro específico que
# # no se incluyen en los "fields" de la función de listado.
# def obtener_record_individual_bigin(access_token, bigin_api_url, module_api_name, record_id):
#     """
#     Recupera los detalles de un registro específico de un módulo en Bigin utilizando su ID.
#
#     Args:
#         access_token (str): El token de acceso OAuth.
#         bigin_api_url (str): La URL base de la API de Bigin.
#         module_api_name (str): El nombre API del módulo (ej. "Pipelines").
#         record_id (str): El ID único del registro a recuperar.
#
#     Returns:
#         dict: Un diccionario con los detalles del registro, o None en caso de error.
#     """
#     record_api_url = f"{bigin_api_url}/{module_api_name}/{record_id}"
#     headers = {
#         "Authorization": f"Zoho-oauthtoken {access_token}"
#     }
#
#     print(f"\n--- Obteniendo detalles completos del registro '{record_id}' del módulo '{module_api_name}' ---")
#     print(f"Solicitando URL: {record_api_url}")
#
#     try:
#         response = requests.get(record_api_url, headers=headers)
#
#         if not response.headers.get('Content-Type', '').startswith('application/json'):
#              print(f"\nAdvertencia: La respuesta no es JSON. Contenido RAW (primeros 500 chars):\n{response.text[:500]}...")
#
#         response_data = response.json()
#         response.raise_for_status()
#
#         if response.status_code == 200:
#             if 'data' in response_data and isinstance(response_data['data'], list) and len(response_data['data']) > 0:
#                 record_details = response_data['data'][0]
#                 print("\n¡Detalles del registro obtenidos exitosamente!")
#                 print("Respuesta completa de la Pipeline:\n", json.dumps(record_details, indent=4))
#                 return record_details
#             else:
#                 print(f"\nLa respuesta para el registro '{record_id}' del módulo '{module_api_name}' no contiene datos esperados.")
#                 print("Respuesta de Bigin:", json.dumps(response_data, indent=4))
#                 return None
#         else:
#             print(f"\nError inesperado al recuperar el registro '{record_id}': {response.status_code}")
#             print("Respuesta de Bigin:", json.dumps(response_data, indent=4))
#             return None
#     except requests.exceptions.HTTPError as e:
#         print(f"\nError HTTP al obtener el registro individual ({e.response.status_code}): {e}")
#         try:
#             error_details = e.response.json()
#             print("Detalles del error de Bigin (JSON):", json.dumps(error_details, indent=4))
#         except json.JSONDecodeError:
#             print("Cuerpo de la respuesta de error no JSON (Error HTTP):", e.response.text)
#         return None
#     except json.JSONDecodeError as e:
#         print(f"\nError de decodificación JSON al obtener el registro individual: {e}")
#         print(f"El servidor NO devolvió una respuesta JSON válida para la URL: {record_api_url}")
#         print(f"Contenido RAW de la respuesta: {response.text[:500]}...")
#         return None
#     except requests.exceptions.RequestException as e:
#         print(f"\nError de conexión al obtener el registro individual: {e}")
#         return None
#
#
# # --- Flujo de Ejecución Principal ---
# if __name__ == "__main__":
#     print("--- Proceso para Obtener TODOS los Registros de Pipelines de Bigin (con paginación avanzada) ---")
#
#     # Paso 1: Usar el Refresh Token para obtener un Access Token fresco
#     current_access_token = refrescar_access_token(
#         REFRESH_TOKEN_ALMACENADO, CLIENT_ID, CLIENT_SECRET, ZOHO_ACCOUNTS_URL
#     )
#
#     if current_access_token:
#         print("\n¡Access Token obtenido correctamente, procediendo a obtener todas las Pipelines!")
#
#         # --- Obtener TODAS las Pipelines ---
#         MODULE_PIPELINES = "Pipelines" # Nombre API para Oportunidades (en la UI de Bigin son "Deals")
#         # Define TODOS los campos que te interesan de las Pipelines aquí.
#         # Es CRÍTICO que los nombres de los campos sean EXACTOS como aparecen en Bigin o en la API.
#         # "Moneda" es un campo personalizado, asegúrate de que exista y sea el nombre API correcto.
#         # Si un campo no existe o tiene un nombre incorrecto, la API podría devolver un error 400.
#         PIPELINE_FIELDS_TO_GET = "Deal_Name,Stage,Amount,Owner,Description,Moneda,Closing_Date,Contact_Name,id,Created_Time,Modified_Time"
#
#         print(f"\n--- Obteniendo TODAS las Pipelines del módulo '{MODULE_PIPELINES}' ---")
#         all_pipelines = obtener_todas_records_modulo_bigin(
#             current_access_token,
#             BIGIN_API_URL,
#             MODULE_PIPELINES,
#             fields=PIPELINE_FIELDS_TO_GET # Solicita todos los campos deseados
#         )
#
#         if all_pipelines:
#             print(f"\n--- Resumen de TODAS las Pipelines encontradas ({len(all_pipelines)} en total) ---")
#             for i, pipeline in enumerate(all_pipelines):
#                 print(f"\nPipeline #{i+1}:")
#                 print(f"  ID: {pipeline.get('id')}")
#                 print(f"  Nombre: {pipeline.get('Deal_Name')}")
#                 print(f"  Etapa: {pipeline.get('Stage')}")
#                 print(f"  Monto: {pipeline.get('Amount')}")
#                 print(f"  Propietario: {pipeline.get('Owner', {}).get('name')}")
#                 # "Contact_Name" es un objeto JSON, no solo un string. Accede a su 'name'.
#                 print(f"  Contacto: {pipeline.get('Contact_Name', {}).get('name') if pipeline.get('Contact_Name') else 'N/A'}")
#                 print(f"  Descripción: {pipeline.get('Description')}")
#                 print(f"  Moneda (campo personalizado): {pipeline.get('Moneda')}") # Asegúrate de que este campo exista y sea el nombre API.
#                 print(f"  Fecha de Cierre: {pipeline.get('Closing_Date')}")
#                 print(f"  Fecha de Creación: {pipeline.get('Created_Time')}")
#                 print(f"  Última Modificación: {pipeline.get('Modified_Time')}")
#                 # Puedes imprimir cualquier otro campo que hayas incluido en PIPELINE_FIELDS_TO_GET
#
#             # --- OPCIONAL: Obtener detalles completos de UN registro específico ---
#             # Esto NO es necesario si PIPELINE_FIELDS_TO_GET ya incluye todos los campos que necesitas.
#             # Solo sería útil si hay campos MUY complejos o no serializables en la lista general
#             # que solo se obtienen con la llamada individual.
#             if len(all_pipelines) > 0:
#                 primer_pipeline_id = all_pipelines[0].get('id')
#                 if primer_pipeline_id:
#                     print(f"\n\n--- Ejemplo: Obteniendo *todos* los detalles (nuevamente) de la primera Pipeline de la lista (ID: {primer_pipeline_id}) ---")
#                     obtener_record_individual_bigin(
#                         current_access_token,
#                         BIGIN_API_URL,
#                         MODULE_PIPELINES,
#                         primer_pipeline_id
#                     )
#                 else:
#                     print("\nNo se encontró un ID para la primera Pipeline en la lista obtenida.")
#             else:
#                 print("\nNo hay Pipelines para obtener detalles individuales de ejemplo.")
#
#         else:
#             print("\nNo se encontraron Pipelines en tu cuenta o hubo un error al recuperarlas.")
#             print("Asegúrate de tener Pipelines creadas en tu Zoho Bigin y que la configuración de DC sea correcta.")
#
#     else:
#         print("\nNo se pudo obtener un Access Token válido. No se puede proceder con las llamadas a la API.")



# EMBUDO VENTAS OBTENER DATOS

import requests
import json

# --- Configuración (¡ACTUALIZA ESTOS VALORES CON TUS CREDENCIALES Y EL REFRESH TOKEN!) ---
CLIENT_ID = "1000.GQTMVWKPS7HAJ5XRGB3HKZMB0W0IOC"
CLIENT_SECRET = "5b16c9a69e2f96d0224be556b377f9afc4dddf75a7"

# ¡ESTE ES EL REFRESH TOKEN QUE DEBES HABER OBTENIDO EN EL PASO ANTERIOR!
REFRESH_TOKEN_ALMACENADO = "1000.d36ec67a1c828d1ff3b87ee15ef977eb.0943c9b523718dbd992506416a1c013f"

# URL base para el proceso de OAuth de Zoho. Ajusta según tu centro de datos (DC):
# Por ejemplo: https://accounts.zoho.eu, https://accounts.zoho.in, etc.
ZOHO_ACCOUNTS_URL = "https://accounts.zoho.com"

# URL base para la API de Bigin. Ajusta según tu centro de datos (DC):
# Por ejemplo: https://www.zohoapis.eu/bigin/v2, https://www.zohoapis.in/bigin/v2, etc.
BIGIN_API_URL = "https://www.zohoapis.com/bigin/v2"


# --- Función para Usar el Refresh Token y Obtener un Nuevo Access Token ---
def refrescar_access_token(refresh_token, client_id, client_secret, zoho_accounts_url):
    """
    Utiliza el refresh token para obtener un nuevo access token.
    """
    token_url = f"{zoho_accounts_url}/oauth/v2/token"
    payload = {
        "refresh_token": refresh_token,
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "refresh_token",
    }

    print("\n--- Intentando refrescar Access Token ---")
    print(f"Request URL: {token_url}")
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


# --- Función GENÉRICA para Obtener TODOS los Registros de un Módulo (con paginación page_token y filtro) ---
def obtener_todas_records_modulo_bigin(access_token, bigin_api_url, module_api_name, fields="", pipeline_id=None):
    """
    Recupera TODOS los registros de un módulo específico de Bigin, manejando la paginación con page_token.
    Puede filtrar por pipeline_id si el módulo es 'Pipelines'.

    Args:
        access_token (str): El token de acceso OAuth.
        bigin_api_url (str): La URL base de la API de Bigin.
        module_api_name (str): El nombre API del módulo (ej. "Pipelines", "Contacts").
        fields (str, optional): Una cadena de campos separados por comas para recuperar. Ej. "Deal_Name,id".
                                 **Es crucial especificar los campos que necesitas aquí.**
        pipeline_id (str, optional): Si se proporciona y el módulo es 'Pipelines', filtra los registros por este ID de Team Pipeline.
    Returns:
        list: Una lista de diccionarios, donde cada diccionario es un registro del módulo, o None en caso de error.
    """
    records_api_url = f"{bigin_api_url}/{module_api_name}"
    headers = {
        "Authorization": f"Zoho-oauthtoken {access_token}"
    }

    all_records = []
    current_page_num = 1  # Para nuestra propia depuración, no para el API
    page_token = None  # Variable para almacenar el token de la siguiente página
    more_records = True
    per_page_limit = 200  # Máximo de registros por página permitido por Bigin

    filter_desc = f"del módulo '{module_api_name}'"
    if pipeline_id and module_api_name == "Pipelines":
        filter_desc = f"de la Team Pipeline '{pipeline_id}'"

    print(f"\n--- Intentando obtener TODOS los registros {filter_desc} (Paginación con page_token) ---")
    print(f"Solicitando URL: {records_api_url}")

    while more_records:
        params = {
            "per_page": per_page_limit,
            "fields": fields  # Siempre enviar los campos deseados
        }

        # Añadir el filtro de pipeline_id si es aplicable
        if pipeline_id and module_api_name == "Pipelines":
            params["pipeline_id"] = pipeline_id

        if page_token:
            params["page_token"] = page_token
            # print(f"  > Petición usando page_token (página lógica {current_page_num}) con parámetros: {params}")
        else:
            params["page"] = current_page_num
            # print(f"  > Petición usando 'page' (página {current_page_num}) con parámetros: {params}")

        # Se imprimen los parámetros siempre, sin importar si es page o page_token
        print(f"  > Petición para la página lógica {current_page_num} con parámetros: {params}")

        try:
            response = requests.get(records_api_url, headers=headers, params=params)
            response_data = response.json()
            response.raise_for_status()

            if response.status_code == 200:
                if 'data' in response_data and isinstance(response_data['data'], list):
                    records_on_page = response_data['data']
                    all_records.extend(records_on_page)
                    print(
                        f"  > Página lógica {current_page_num} recuperada. Registros en esta página: {len(records_on_page)}")

                    info = response_data.get('info', {})
                    more_records = info.get('more_records', False)

                    # Importante: Capturar el next_page_token para la siguiente iteración si existe
                    if more_records:
                        new_page_token = info.get('next_page_token')
                        if new_page_token:
                            page_token = new_page_token
                        else:
                            # Si more_records es true pero no hay next_page_token, y ya hemos superado 2000,
                            # esto es una inconsistencia del API o un bug. Para Bigin/CRM de Zoho
                            # page_token es mandatorio después de 2000.
                            # Aquí se asume que si more_records es True, siempre habrá next_page_token
                            # o que estamos en la fase < 2000 y 'page' seguirá funcionando.
                            # El error "DISCRETE_PAGINATION_LIMIT_EXCEEDED" se encargaría si fallamos.
                            pass
                    else:
                        page_token = None  # No hay más registros, la paginación termina

                    current_page_num += 1
                else:
                    print(
                        f"\nLa respuesta para el módulo '{module_api_name}' {filter_desc} no contiene la lista 'data' o no es un formato esperado.")
                    print("Respuesta de Bigin:", json.dumps(response_data, indent=4))
                    return None
            else:
                print(f"\nError inesperado al recuperar registros {filter_desc}: {response.status_code}")
                print("Respuesta de Bigin:", json.dumps(response_data, indent=4))
                return None
        except requests.exceptions.HTTPError as e:
            print(f"\nError HTTP al obtener registros {filter_desc} ({e.response.status_code}): {e}")
            try:
                error_details = e.response.json()
                print("Detalles del error de Bigin (JSON):", json.dumps(error_details, indent=4))
            except json.JSONDecodeError:
                print("Cuerpo de la respuesta de error no JSON (Error HTTP):", e.response.text)
            return None
        except json.JSONDecodeError as e:
            print(f"\nError de decodificación JSON al obtener registros {filter_desc}: {e}")
            print(f"El servidor NO devolvió una respuesta JSON válida para la URL: {records_api_url}")
            print(f"Contenido RAW de la respuesta: {response.text[:500]}...")
            return None
        except requests.exceptions.RequestException as e:
            print(f"\nError de conexión al obtener registros {filter_desc}: {e}")
            return None

    print(f"\n¡Proceso de paginación completado para los registros {filter_desc}!")
    print(f"Total de registros recuperados: {len(all_records)}.")
    return all_records


# --- La función para Obtener un Record Individual por ID se mantiene, aunque menos necesaria ahora ---
def obtener_record_individual_bigin(access_token, bigin_api_url, module_api_name, record_id):
    """
    Recupera los detalles de un registro específico de un módulo en Bigin utilizando su ID.
    """
    record_api_url = f"{bigin_api_url}/{module_api_name}/{record_id}"
    headers = {
        "Authorization": f"Zoho-oauthtoken {access_token}"
    }

    print(f"\n--- Obteniendo detalles completos del registro '{record_id}' del módulo '{module_api_name}' ---")
    print(f"Solicitando URL: {record_api_url}")

    try:
        response = requests.get(record_api_url, headers=headers)

        if not response.headers.get('Content-Type', '').startswith('application/json'):
            print(
                f"\nAdvertencia: La respuesta no es JSON. Contenido RAW (primeros 500 chars):\n{response.text[:500]}...")

        response_data = response.json()
        response.raise_for_status()

        if response.status_code == 200:
            if 'data' in response_data and isinstance(response_data['data'], list) and len(response_data['data']) > 0:
                record_details = response_data['data'][0]
                print("\n¡Detalles del registro obtenidos exitosamente!")
                print("Respuesta completa de la Pipeline:\n", json.dumps(record_details, indent=4))
                return record_details
            else:
                print(
                    f"\nLa respuesta para el registro '{record_id}' del módulo '{module_api_name}' no contiene datos esperados.")
                print("Respuesta de Bigin:", json.dumps(response_data, indent=4))
                return None
        else:
            print(f"\nError inesperado al recuperar el registro '{record_id}': {response.status_code}")
            print("Respuesta de Bigin:", json.dumps(response_data, indent=4))
            return None
    except requests.exceptions.HTTPError as e:
        print(f"\nError HTTP al obtener el registro individual ({e.response.status_code}): {e}")
        try:
            error_details = e.response.json()
            print("Detalles del error de Bigin (JSON):", json.dumps(error_details, indent=4))
        except json.JSONDecodeError:
            print("Cuerpo de la respuesta de error no JSON (Error HTTP):", e.response.text)
        return None
    except json.JSONDecodeError as e:
        print(f"\nError de decodificación JSON al obtener el registro individual: {e}")
        print(f"El servidor NO devolvió una respuesta JSON válida para la URL: {record_api_url}")
        print(f"Contenido RAW de la respuesta: {response.text[:500]}...")
        return None
    except requests.exceptions.RequestException as e:
        print(f"\nError de conexión al obtener el registro individual: {e}")
        return None


# --- Flujo de Ejecución Principal ---
if __name__ == "__main__":
    print("--- Proceso para Obtener Registros de una Team Pipeline Específica (con paginación robusta) ---")

    # Paso 1: Usar el Refresh Token para obtener un Access Token fresco
    current_access_token = refrescar_access_token(
        REFRESH_TOKEN_ALMACENADO, CLIENT_ID, CLIENT_SECRET, ZOHO_ACCOUNTS_URL
    )

    if current_access_token:
        print("\n¡Access Token obtenido correctamente, procediendo a obtener registros de Team Pipeline!")

        MODULE_PIPELINES_API_NAME = "Pipelines"  # Nombre API para Oportunidades/Deals

        # Campos necesarios para obtener el ID del Team Pipeline
        FIELDS_TO_GET_DEALS_FOR_TEAM_PIPELINE_ID = "Deal_Name,Stage,id,Pipeline"

        # --- PASO A: Obtener un ID de un "Team Pipeline" (Embudo) ---
        # Primero, listamos algunas oportunidades para encontrar el ID de un embudo.
        # Es suficiente obtener el primer registro si solo necesitas el ID de UN embudo.
        # Si tuvieras múltiples embudos y quisieras listar un embudo específico por su nombre,
        # tendrías que listar más records aquí y buscar el nombre.
        print(f"\n--- Paso A: Listando algunas oportunidades para encontrar un ID de 'Team Pipeline' ---")
        # Aquí limitamos a 1 la página para encontrar el ID, pero la función maneja más.
        some_deals = obtener_todas_records_modulo_bigin(
            current_access_token,
            BIGIN_API_URL,
            MODULE_PIPELINES_API_NAME,
            fields=FIELDS_TO_GET_DEALS_FOR_TEAM_PIPELINE_ID,
            # No pasamos pipeline_id aquí porque estamos listando TODAS las deals para encontrar el ID del pipeline.
        )

        team_pipeline_id_to_filter = None
        team_pipeline_name_found = "Desconocido"

        if some_deals and len(some_deals) > 0:
            # Buscamos la primera oportunidad que tenga un objeto 'Pipeline'
            for deal in some_deals:
                pipeline_obj = deal.get('Pipeline')
                if pipeline_obj and pipeline_obj.get('id'):
                    team_pipeline_id_to_filter = pipeline_obj.get('id')
                    team_pipeline_name_found = pipeline_obj.get('name')
                    print(
                        f"\n¡ID de 'Team Pipeline' encontrado para filtrar!: '{team_pipeline_name_found}' con ID: {team_pipeline_id_to_filter}")
                    break  # Una vez encontrado, salimos del bucle

            if not team_pipeline_id_to_filter:
                print(
                    "\nNo se pudo encontrar un ID de 'Team Pipeline' en los registros de Oportunidades obtenidos. Asegúrate de que tus Oportunidades estén asociadas a un embudo.")
        else:
            print(
                "\nNo se encontraron Oportunidades en tu cuenta. No se puede obtener un ID de 'Team Pipeline' para filtrar.")
            print("Asegúrate de tener Oportunidades (Deals) creadas en tu Zoho Bigin y asociadas a un embudo.")

        # --- PASO B: Obtener todos los records de esa "Team Pipeline" específica ---
        if team_pipeline_id_to_filter:
            # Aquí definimos los campos que queremos de las Oportunidades *filtradas por el Team Pipeline*.
            # Asegúrate de que estos campos existan en tus Oportunidades.
            # Puedes añadir más campos que sean relevantes para tu uso.
            FIELDS_FOR_FILTERED_PIPELINES = "Deal_Name,Stage,Amount,Owner,Contact_Name,Closing_Date,Description,id,Created_Time,Modified_Time,Moneda"

            print(
                f"\n--- Paso B: Obteniendo TODAS las Oportunidades de la Team Pipeline '{team_pipeline_name_found}' (ID: {team_pipeline_id_to_filter}) ---")
            filtered_pipelines = obtener_todas_records_modulo_bigin(  # Usamos la misma función robusta
                current_access_token,
                BIGIN_API_URL,
                MODULE_PIPELINES_API_NAME,
                fields=FIELDS_FOR_FILTERED_PIPELINES,
                pipeline_id=team_pipeline_id_to_filter  # Aquí pasamos el ID del Team Pipeline como filtro
            )

            if filtered_pipelines:
                print(
                    f"\n--- Resumen de Oportunidades de la Team Pipeline '{team_pipeline_name_found}' ({len(filtered_pipelines)} en total) ---")
                for i, pipeline in enumerate(filtered_pipelines):
                    print(f"\nOportunidad #{i + 1}:")
                    print(f"  ID: {pipeline.get('id')}")
                    print(f"  Nombre: {pipeline.get('Deal_Name')}")
                    print(f"  Etapa: {pipeline.get('Stage')}")
                    print(f"  Monto: {pipeline.get('Amount')}")
                    print(f"  Propietario: {pipeline.get('Owner', {}).get('name')}")
                    print(
                        f"  Contacto: {pipeline.get('Contact_Name', {}).get('name') if pipeline.get('Contact_Name') else 'N/A'}")
                    print(f"  Fecha de Cierre: {pipeline.get('Closing_Date')}")
                    print(f"  Descripción: {pipeline.get('Description')}")
                    print(f"  Moneda (campo personalizado): {pipeline.get('Moneda')}")
                    print(f"  Fecha de Creación: {pipeline.get('Created_Time')}")
                    print(f"  Última Modificación: {pipeline.get('Modified_Time')}")
            else:
                print(
                    f"\nNo se encontraron registros para la Team Pipeline '{team_pipeline_name_found}' o hubo un error.")
        else:
            print("\nNo se pudo proceder al Paso B porque no se encontró un ID de 'Team Pipeline' válido en el Paso A.")

    else:
        print("\nNo se pudo obtener un Access Token válido. No se puede proceder con las llamadas a la API.")