import requests
from flask import current_app, has_app_context

class ZohoBillingAPI:
    """Clase para interactuar con la API de Zoho Billing."""

    BASE_URL = "https://www.zohoapis.com/billing/v1"

    def __init__(self, access_token, organization_id):
        """
        Inicializa la clase con el token de acceso y el ID de organización.

        Args:
            access_token (str): Token de acceso de OAuth 2.0
            organization_id (str): ID de la organización en Zoho Billing
        """
        self.access_token = access_token
        self.organization_id = organization_id
        self.headers = {
            'Authorization': f'Zoho-oauthtoken {self.access_token}',
            'X-com-zoho-subscriptions-organizationid': self.organization_id,
            'Content-Type': 'application/json'
        }

    def _log_info(self, message):
        """Método auxiliar para logging de información"""
        if has_app_context():
            current_app.logger.info(message)
        else:
            print(f"[INFO] {message}")

    def _log_error(self, message):
        """Método auxiliar para logging de errores"""
        if hasattr(self, 'logger'):
            self.logger.error(message)
        else:
            print(f"[ERROR] {message}")

    def refresh_access_token(self):
        """
        Refresca el token de acceso de Zoho usando el refresh token.

        Returns:
            bool: True si el token se actualizó correctamente, False en caso contrario
        """
        from app import get_access_token  # Importamos aquí para evitar importación circular

        self._log_info("Refrescando token de acceso...")

        try:
            # Obtener un nuevo token de acceso
            token_info = get_access_token()

            if token_info and 'access_token' in token_info:
                # Actualizar el token en la instancia
                self.access_token = token_info['access_token']

                # Actualizar el token en los headers
                self.headers = {
                    'Authorization': f'Zoho-oauthtoken {self.access_token}',
                    'X-com-zoho-subscriptions-organizationid': self.organization_id,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                }

                self._log_info("Token de acceso actualizado exitosamente")
                return True
            else:
                self._log_error("No se pudo obtener un nuevo token de acceso")
                return False

        except Exception as e:
            self._log_error(f"Error al refrescar el token de acceso: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                self._log_error(f"Respuesta del servidor: {e.response.status_code} - {e.response.text}")
            return False

    def list_hosted_pages(self):
        """
        Obtiene la lista de todas las páginas alojadas en Zoho Billing.

        Returns:
            list: Lista de páginas alojadas o lista vacía en caso de error
        """
        # Asegurarse de que la URL base termine con /hostedpages
        url = f"{self.BASE_URL}/hostedpages"

        # Asegurarse de que la URL no tenga doble barra
        url = url.replace('//hostedpages', '/hostedpages')

        self._log_info(f"Solicitando lista de páginas alojadas: {url}")

        # Verificar que los headers tengan los campos necesarios
        headers = {
            'Authorization': f'Zoho-oauthtoken {self.access_token}',
            'X-com-zoho-subscriptions-organizationid': self.organization_id,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }

        # Mostrar los encabezados que se están enviando (sin el token por seguridad)
        safe_headers = {k: v for k, v in headers.items() if k.lower() != 'authorization'}
        self._log_info(f"Headers de la solicitud: {safe_headers}")

        try:
            # Realizamos la solicitud GET a la API de Zoho
            response = requests.get(
                url,
                headers=headers,
                timeout=30
            )

            self._log_info(f"Respuesta de la API - Código: {response.status_code}")
            self._log_info(f"Respuesta de la API - Contenido: {response.text[:500]}")

            # Verificar si la respuesta es exitosa
            if response.status_code != 200:
                self._log_error(f"Error en la respuesta: {response.status_code} - {response.text}")
                return []

            # Procesar la respuesta exitosa
            self._log_info("[DEBUG] Procesando respuesta exitosa...")

            try:
                data = response.json()
                self._log_info(f"[DEBUG] JSON parseado: {type(data)}")
                
                if isinstance(data, dict):
                    pages = None
                    key_used = None

                    if 'hosted_pages' in data:
                        pages = data['hosted_pages']
                        key_used = 'hosted_pages'
                    elif 'hostedpages' in data:
                        pages = data['hostedpages']
                        key_used = 'hostedpages'

                    if pages is not None:
                        self._log_info(f"[DEBUG] Se encontraron {len(pages) if isinstance(pages, list) else 0} páginas en '{key_used}'")
                        self._log_info(f"[DEBUG] Primeras 2 páginas: {pages[:2] if isinstance(pages, list) and len(pages) > 0 else 'N/A'}")
                        
                        if isinstance(pages, list):
                            self._log_info(f"[DEBUG] Devolviendo lista con {len(pages)} páginas")
                            return pages
                        else:
                            self._log_error(f"[DEBUG] {key_used} no es una lista: {type(pages)}")
                            return []
                    else:
                        self._log_error(f"[DEBUG] Clave de hosted pages no encontrada en la respuesta")
                        return []

                elif isinstance(data, list):
                    self._log_info(f"[DEBUG] Respuesta es una lista directa con {len(data)} elementos")
                    return data
                else:
                    self._log_error(f"[DEBUG] Formato de respuesta no reconocido: {type(data)}")
                    return []

            except ValueError as ve:
                self._log_error(f"Error al decodificar la respuesta JSON: {str(ve)}")
                return []

        except requests.exceptions.RequestException as e:
            error_msg = f"Error al obtener la lista de páginas alojadas: {str(e)}"
            self._log_error(error_msg)

            if hasattr(e, 'response') and e.response is not None:
                error_msg += f"\nStatus Code: {e.response.status_code}"
                try:
                    error_msg += f"\nResponse: {e.response.json()}"
                except:
                    error_msg += f"\nResponse Text: {e.response.text}"

            self._log_error(error_msg)
            return []

        except Exception as e:
            self._log_error(f"Error inesperado: {str(e)}")
            return []

    def get_hosted_page(self, hostedpage_id):
        """
        Obtiene los detalles de una página alojada específica.

        Args:
            hostedpage_id (str): ID de la página alojada

        Returns:
            dict: Detalles de la página alojada o None en caso de error
        """
        url = f"{self.BASE_URL}/hostedpages/{hostedpage_id}"

        self._log_info(f"Solicitando detalles de la página alojada: {url}")

        try:
            # Realizamos la solicitud GET a la API de Zoho
            response = requests.get(
                url,
                headers=self.headers,
                timeout=30
            )

            self._log_info(f"Respuesta de la API - Código: {response.status_code}")
            self._log_info(f"Respuesta de la API - Contenido: {response.text[:500]}")

            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            error_msg = f"Error al obtener los detalles de la página alojada: {str(e)}"
            self._log_error(error_msg)

            if hasattr(e, 'response') and e.response is not None:
                error_msg += f"\nStatus Code: {e.response.status_code}"
                try:
                    error_msg += f"\nResponse: {e.response.json()}"
                except:
                    error_msg += f"\nResponse Text: {e.response.text}"

            self._log_error(error_msg)
            return None



