#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cliente Python para consumir la API de Zoho Billing
Obtiene y muestra información de suscripciones, clientes y estados
"""

import requests
import json
import time
from typing import Dict, List, Optional, Any
import os
from datetime import datetime

class ZohoBillingClient:
    def __init__(self, access_token: str, organization_id: str, region: str = "com", 
                 refresh_token: str = None, client_id: str = None, client_secret: str = None):
        """
        Inicializa el cliente de Zoho Billing
        
        Args:
            access_token: Token de acceso de Zoho
            organization_id: ID de la organización en Zoho Billing
            region: Región del datacenter (com, eu, in, etc.)
            refresh_token: Token para renovar el access token
            client_id: ID del cliente de la aplicación
            client_secret: Secreto del cliente
        """
        self.access_token = access_token
        self.organization_id = organization_id
        self.region = region
        self.refresh_token = refresh_token
        self.client_id = client_id
        self.client_secret = client_secret
        self.base_url = f"https://www.zohoapis.{region}/billing/v1"
        self.auth_url = f"https://accounts.zoho.{region}/oauth/v2/token"
        self.session = requests.Session()
        self._update_headers()
    
    def _update_headers(self):
        """Actualiza los headers de la sesión con el token actual"""
        self.session.headers.update({
            'Authorization': f'Zoho-oauthtoken {self.access_token}',
            'X-com-zoho-subscriptions-organizationid': self.organization_id,
            'Content-Type': 'application/json'
        })
    
    def _refresh_access_token(self) -> bool:
        """
        Renueva el access token usando el refresh token
        
        Returns:
            True si el token se renovó exitosamente, False en caso contrario
        """
        if not all([self.refresh_token, self.client_id, self.client_secret]):
            print("❌ No se pueden renovar tokens: faltan credenciales de refresh")
            return False
        
        try:
            data = {
                'refresh_token': self.refresh_token,
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'grant_type': 'refresh_token'
            }
            
            response = requests.post(self.auth_url, data=data, timeout=30)
            response.raise_for_status()
            
            token_data = response.json()
            
            if 'access_token' in token_data:
                self.access_token = token_data['access_token']
                self._update_headers()
                print("✅ Token de acceso renovado exitosamente")
                return True
            else:
                print(f"❌ Error al renovar token: {token_data}")
                return False
                
        except Exception as e:
            print(f"❌ Error al renovar access token: {e}")
            return False
    
    def _make_request(self, endpoint: str, method: str = 'GET', params: Dict = None, data: Dict = None, retry_auth: bool = True) -> Dict:
        """
        Realiza una solicitud HTTP a la API de Zoho Billing
        
        Args:
            endpoint: Endpoint de la API (sin la URL base)
            method: Método HTTP (GET, POST, PUT, DELETE)
            params: Parámetros de consulta
            data: Datos del cuerpo de la solicitud
            retry_auth: Si debe intentar renovar el token en caso de error de autenticación
            
        Returns:
            Respuesta JSON de la API
        """
        url = f"{self.base_url}/{endpoint}"
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, params=params, timeout=30)
            elif method.upper() == 'POST':
                response = self.session.post(url, params=params, json=data, timeout=30)
            elif method.upper() == 'PUT':
                response = self.session.put(url, params=params, json=data, timeout=30)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, params=params, timeout=30)
            else:
                raise ValueError(f"Método HTTP no soportado: {method}")
            
            # Si recibimos un error 401 (no autorizado) y tenemos credenciales para renovar
            if response.status_code == 401 and retry_auth and self.refresh_token:
                print("🔄 Token expirado, intentando renovar...")
                if self._refresh_access_token():
                    # Reintentar la solicitud con el nuevo token
                    return self._make_request(endpoint, method, params, data, retry_auth=False)
                else:
                    print("❌ No se pudo renovar el token")
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            print(f"Error en la solicitud HTTP: {e}")
            raise
        except json.JSONDecodeError as e:
            print(f"Error al decodificar JSON: {e}")
            raise
    
    def get_all_subscriptions(self, status: str = None, page: int = 1, per_page: int = 200) -> Dict:
        """
        Obtiene todas las suscripciones
        
        Args:
            status: Filtro por estado (live, cancelled, expired, etc.)
            page: Número de página
            per_page: Elementos por página (máximo 200)
            
        Returns:
            Respuesta con las suscripciones
        """
        params = {
            'page': page,
            'per_page': min(per_page, 200)
        }
        
        if status:
            params['status'] = status
            
        return self._make_request('subscriptions', params=params)
    
    def get_subscriptions_count_by_status(self) -> Dict[str, int]:
        """
        Obtiene el conteo de suscripciones por estado
        
        Returns:
            Diccionario con conteos por estado
        """
        counts = {
            'total': 0,
            'live': 0,
            'non_renewing': 0,
            'cancelled': 0,
            'expired': 0,
            'trial': 0,
            'unpaid': 0,
            'paused': 0,
            'past_due': 0,
            'premium': 0,  # Suscripciones > $100
            'other': 0
        }
        
        page = 1
        total_pages_processed = 0
        consecutive_errors = 0
        max_pages = 1000  # Límite de seguridad
        
        print("🔄 Obteniendo TODAS las suscripciones para conteo completo...")
        print("⚠️  Este proceso puede tomar varios minutos dependiendo del número total de suscripciones")
        
        while page <= max_pages:
            try:
                print(f"🔄 Procesando página {page}...")
                response = self.get_all_subscriptions(page=page, per_page=200)
                
                # Debug: Mostrar estructura de respuesta en la primera página
                if page == 1:
                    print(f"🔍 Debug - Estructura de respuesta:")
                    print(f"   - Código: {response.get('code')}")
                    print(f"   - Mensaje: {response.get('message', 'N/A')}")
                    print(f"   - Has more page: {response.get('has_more_page')}")
                    print(f"   - Page context: {response.get('page_context', {})}")
                    print(f"   - Claves disponibles: {list(response.keys())}")
                
                if response.get('code') != 0:
                    print(f"❌ Error en API: {response.get('message', 'Error desconocido')}")
                    consecutive_errors += 1
                    if consecutive_errors >= 3:
                        print("❌ Demasiados errores consecutivos. Deteniendo proceso.")
                        break
                    page += 1
                    continue
                
                subscriptions = response.get('subscriptions', [])
                
                # Si no hay suscripciones en esta página, hemos terminado
                if not subscriptions or len(subscriptions) == 0:
                    print(f"✅ No hay más suscripciones en página {page}. Terminando proceso.")
                    break
                
                # Resetear contador de errores consecutivos
                consecutive_errors = 0
                
                for sub in subscriptions:
                    counts['total'] += 1
                    status = sub.get('status', 'unknown')
                    amount = float(sub.get('amount', 0))
                    
                    if status in counts:
                        counts[status] += 1
                    else:
                        counts['other'] += 1
                    
                    # Contar suscripciones premium
                    if status == 'live' and amount > 100:
                        counts['premium'] += 1
                
                total_pages_processed += 1
                print(f"📄 Página {page} procesada: {len(subscriptions)} suscripciones | Total acumulado: {counts['total']}")
                
                # Múltiples verificaciones para determinar si hay más páginas
                has_more_page = response.get('has_more_page', False)
                page_context = response.get('page_context', {})
                has_more_context = page_context.get('has_more_page', False) if page_context else False
                
                # Si recibimos menos suscripciones de las solicitadas, probablemente es la última página
                received_less_than_requested = len(subscriptions) < 200
                
                print(f"🔍 Verificaciones de paginación:")
                print(f"   - has_more_page: {has_more_page}")
                print(f"   - has_more_context: {has_more_context}")
                print(f"   - Recibidas: {len(subscriptions)}/200")
                print(f"   - ¿Menos de lo solicitado?: {received_less_than_requested}")
                
                # Si no hay más páginas según cualquiera de los indicadores
                if not has_more_page and not has_more_context:
                    print(f"✅ API indica que no hay más páginas. Proceso completado.")
                    break
                
                # Si recibimos menos suscripciones de las solicitadas, es probable que sea la última página
                if received_less_than_requested:
                    print(f"✅ Recibidas menos suscripciones de las solicitadas ({len(subscriptions)}/200). Probablemente última página.")
                    # Intentar una página más para confirmar
                    page += 1
                    print(f"🔄 Verificando página {page} para confirmar...")
                    verify_response = self.get_all_subscriptions(page=page, per_page=200)
                    verify_subscriptions = verify_response.get('subscriptions', [])
                    if not verify_subscriptions:
                        print(f"✅ Confirmado: No hay más suscripciones. Proceso completado.")
                        break
                    else:
                        print(f"🔄 Encontradas {len(verify_subscriptions)} suscripciones adicionales en página {page}. Continuando...")
                        # Procesar esta página también
                        for sub in verify_subscriptions:
                            counts['total'] += 1
                            status = sub.get('status', 'unknown')
                            amount = float(sub.get('amount', 0))
                            
                            if status in counts:
                                counts[status] += 1
                            else:
                                counts['other'] += 1
                            
                            if status == 'live' and amount > 100:
                                counts['premium'] += 1
                        
                        total_pages_processed += 1
                        print(f"📄 Página {page} procesada: {len(verify_subscriptions)} suscripciones | Total acumulado: {counts['total']}")
                
                page += 1
                
                # Pausa pequeña para no sobrecargar la API
                time.sleep(0.2)
                
            except Exception as e:
                print(f"❌ Error al obtener página {page}: {e}")
                print("🔄 Intentando continuar con la siguiente página...")
                consecutive_errors += 1
                if consecutive_errors >= 5:
                    print("❌ Demasiados errores consecutivos. Deteniendo proceso.")
                    break
                page += 1
                time.sleep(1)  # Pausa más larga en caso de error
        
        if page > max_pages:
            print(f"⚠️ Alcanzado límite máximo de páginas ({max_pages}). Proceso detenido por seguridad.")
        
        print(f"\n✅ Proceso de conteo completado:")
        print(f"📊 Total de páginas procesadas: {total_pages_processed}")
        print(f"📈 Total de suscripciones encontradas: {counts['total']}")
        print(f"🔄 Última página procesada: {page - 1}")
        
        return counts
    
    def get_subscription_by_id(self, subscription_id: str) -> Dict:
        """
        Obtiene detalles de una suscripción específica
        
        Args:
            subscription_id: ID de la suscripción
            
        Returns:
            Detalles de la suscripción
        """
        return self._make_request(f'subscriptions/{subscription_id}')
    
    def get_customers(self, page: int = 1, per_page: int = 200) -> Dict:
        """
        Obtiene lista de clientes
        
        Args:
            page: Número de página
            per_page: Elementos por página
            
        Returns:
            Lista de clientes
        """
        params = {
            'page': page,
            'per_page': min(per_page, 200)
        }
        
        return self._make_request('customers', params=params)
    
    def get_customer_by_id(self, customer_id: str) -> Dict:
        """
        Obtiene detalles de un cliente específico
        
        Args:
            customer_id: ID del cliente
            
        Returns:
            Detalles del cliente
        """
        return self._make_request(f'customers/{customer_id}')
    
    def get_plans(self, page: int = 1, per_page: int = 200) -> Dict:
        """
        Obtiene lista de planes
        
        Args:
            page: Número de página
            per_page: Elementos por página
            
        Returns:
            Lista de planes
        """
        params = {
            'page': page,
            'per_page': min(per_page, 200)
        }
        
        return self._make_request('plans', params=params)

def print_subscription_summary(counts: Dict[str, int]):
    """
    Imprime un resumen formateado de las suscripciones
    """
    print("\n" + "="*60)
    print("📊 RESUMEN DE SUSCRIPCIONES POR ESTADO")
    print("="*60)
    
    print(f"📈 Total de suscripciones: {counts['total']}")
    print("\n🔍 Desglose por estado:")
    print(f"  ✅ Activas (live): {counts['live']}")
    
    if counts['live'] > 0:
        premium_percentage = (counts['premium'] / counts['live']) * 100
        regular_count = counts['live'] - counts['premium']
        regular_percentage = (regular_count / counts['live']) * 100
        
        print(f"    💎 Premium (>$100): {counts['premium']} ({premium_percentage:.1f}%)")
        print(f"    💰 Regulares (≤$100): {regular_count} ({regular_percentage:.1f}%)")
    
    print(f"  🔄 No renovables: {counts['non_renewing']}")
    print(f"  ❌ Canceladas: {counts['cancelled']}")
    print(f"  ⏰ Expiradas: {counts['expired']}")
    print(f"  🆓 En prueba: {counts['trial']}")
    print(f"  💳 Impagadas: {counts['unpaid']}")
    print(f"  ⏸️  Pausadas: {counts['paused']}")
    print(f"  ⚠️  Con pago vencido: {counts['past_due']}")
    print(f"  ❓ Otros estados: {counts['other']}")
    print("="*60)

def print_subscriptions_details(client: ZohoBillingClient, limit: int = 10):
    """
    Imprime detalles de las primeras suscripciones
    """
    print(f"\n📋 DETALLES DE LAS PRIMERAS {limit} SUSCRIPCIONES")
    print("="*80)
    
    try:
        response = client.get_all_subscriptions(per_page=limit)
        
        if response.get('code') != 0:
            print(f"❌ Error: {response.get('message')}")
            return
        
        subscriptions = response.get('subscriptions', [])
        
        for i, sub in enumerate(subscriptions, 1):
            print(f"\n{i}. Suscripción ID: {sub.get('subscription_id')}")
            print(f"   👤 Cliente: {sub.get('customer_name', 'N/A')}")
            print(f"   📦 Plan: {sub.get('plan_name', 'N/A')}")
            print(f"   💰 Monto: ${sub.get('amount', 0):.2f}")
            print(f"   📊 Estado: {sub.get('status', 'N/A')}")
            print(f"   📅 Creada: {sub.get('created_time', 'N/A')}")
            print(f"   🔄 Próximo cobro: {sub.get('next_billing_at', 'N/A')}")
            
    except Exception as e:
        print(f"❌ Error al obtener detalles: {e}")

def print_customers_summary(client: ZohoBillingClient, limit: int = 5):
    """
    Imprime resumen de clientes
    """
    print(f"\n👥 RESUMEN DE CLIENTES (Primeros {limit})")
    print("="*60)
    
    try:
        response = client.get_customers(per_page=limit)
        
        if response.get('code') != 0:
            print(f"❌ Error: {response.get('message')}")
            return
        
        customers = response.get('customers', [])
        
        for i, customer in enumerate(customers, 1):
            print(f"\n{i}. Cliente ID: {customer.get('customer_id')}")
            print(f"   📛 Nombre: {customer.get('display_name', 'N/A')}")
            print(f"   📧 Email: {customer.get('email', 'N/A')}")
            print(f"   📊 Estado: {customer.get('status', 'N/A')}")
            print(f"   📅 Creado: {customer.get('created_time', 'N/A')}")
            
    except Exception as e:
        print(f"❌ Error al obtener clientes: {e}")

def send_webhook(data: Dict, webhook_url: str = None) -> bool:
    """
    Envía datos por webhook a Zapier u otro servicio
    
    Args:
        data: Datos a enviar
        webhook_url: URL del webhook (si no se proporciona, usa la configurada)
        
    Returns:
        True si se envió exitosamente, False en caso contrario
    """
    if not webhook_url:
        print("⚠️ No se ha configurado URL de webhook")
        return False
    
    try:
        # Preparar payload con timestamp
        payload = {
            "timestamp": datetime.now().isoformat(),
            "source": "zoho_billing_client",
            "data": data
        }
        
        print(f"📤 Enviando datos por webhook a: {webhook_url[:50]}...")
        
        response = requests.post(
            webhook_url,
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        response.raise_for_status()
        
        print("✅ Webhook enviado exitosamente")
        print(f"📊 Respuesta del servidor: {response.status_code}")
        
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Error al enviar webhook: {e}")
        return False
    except Exception as e:
        print(f"❌ Error inesperado en webhook: {e}")
        return False

def main():
    """
    Función principal del script
    """
    print("🚀 CLIENTE PYTHON PARA ZOHO BILLING API")
    print("="*50)
    
    # ========================================
    # CONFIGURACIÓN DE CREDENCIALES
    # ========================================
    # CREDENCIALES CONFIGURADAS PARA ZOHO BILLING
    
    ACCESS_TOKEN = ""  # Token de acceso de Zoho (se renovará automáticamente)
    REFRESH_TOKEN = "1000.729233311909dfbe672a1d635bde99fb.470f1bd77de41d2f28c5ee1b50361893"  # Token de actualización
    CLIENT_ID = "1000.GQTMVWKPS7HAJ5XRGB3HKZMB0W0IOC"  # ID del cliente de la aplicación
    CLIENT_SECRET = "5b16c9a69e2f96d0224be556b377f9afc4dddf75a7"  # Secreto del cliente
    ORGANIZATION_ID = "799550320"  # ID de organización de Zoho Billing
    REGION = "com"  # Región: com, eu, in, com.au, jp
    
    # ========================================
    # CONFIGURACIÓN DE WEBHOOK
    # ========================================
    # URL del webhook de Zapier (configura tu URL aquí)
    WEBHOOK_URL = ""  # Ejemplo: "https://hooks.zapier.com/hooks/catch/123456/abcdef/"
    
    # Para obtener tu URL de webhook de Zapier:
    # 1. Ve a https://zapier.com/app/zaps
    # 2. Crea un nuevo Zap
    # 3. Selecciona "Webhooks by Zapier" como trigger
    # 4. Elige "Catch Hook"
    # 5. Copia la URL del webhook que te proporciona Zapier
    # 6. Pégala en WEBHOOK_URL arriba
    
    # ========================================
    # VALIDACIÓN DE CREDENCIALES
    # ========================================
    
    # Verificar que las credenciales han sido configuradas
    if (ACCESS_TOKEN.endswith("_aqui") or 
        REFRESH_TOKEN.endswith("_aqui") or 
        CLIENT_ID.endswith("_aqui") or 
        CLIENT_SECRET.endswith("_aqui") or 
        ORGANIZATION_ID.endswith("_aqui")):
        
        print("❌ ERROR: Debes configurar tus credenciales de Zoho en el script")
        print("\n📝 Instrucciones de configuración:")
        print("\n1. 🔑 ACCESS_TOKEN: Token de acceso actual (válido por 1 hora)")
        print("   - Formato: 1000.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")
        print("   - Obtener en: https://api-console.zoho.com/")
        
        print("\n2. 🔄 REFRESH_TOKEN: Token para renovar el access token")
        print("   - Formato: 1000.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")
        print("   - Se obtiene junto con el access token")
        
        print("\n3. 🆔 CLIENT_ID: ID de tu aplicación Zoho")
        print("   - Formato: 1000.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")
        print("   - Crear aplicación en: https://api-console.zoho.com/")
        
        print("\n4. 🔐 CLIENT_SECRET: Secreto de tu aplicación")
        print("   - Formato: cadena alfanumérica")
        print("   - Se genera al crear la aplicación")
        
        print("\n5. 🏢 ORGANIZATION_ID: ID de tu organización en Zoho Billing")
        print("   - Obtener en: Zoho Billing → Configuración → Organización")
        
        print("\n6. 🌍 REGION: Región de tu datacenter")
        print("   - com (Estados Unidos) - por defecto")
        print("   - eu (Europa)")
        print("   - in (India)")
        print("   - com.au (Australia)")
        print("   - jp (Japón)")
        
        print("\n💡 Tip: Edita las variables en la función main() de este script")
        return
    
    # Crear cliente
    try:
        client = ZohoBillingClient(
            access_token=ACCESS_TOKEN,
            organization_id=ORGANIZATION_ID,
            region=REGION,
            refresh_token=REFRESH_TOKEN,
            client_id=CLIENT_ID,
            client_secret=CLIENT_SECRET
        )
        print(f"✅ Cliente inicializado para región: {REGION}")
        print(f"🌐 URL base: {client.base_url}")
        print(f"🔄 Renovación automática: {'✅ Habilitada' if REFRESH_TOKEN and not REFRESH_TOKEN.endswith('_aqui') else '❌ Deshabilitada'}")
        
        # Verificar conectividad inicial
        print("\n🔍 Verificando conectividad con Zoho Billing...")
        test_response = client.get_customers(per_page=1)
        if test_response.get('code') == 0:
            print("✅ Conexión exitosa con Zoho Billing")
        else:
            print(f"⚠️ Advertencia: {test_response.get('message', 'Respuesta inesperada')}")
        
        # Obtener y mostrar conteo de suscripciones
        print("\n🔄 Obteniendo conteo de suscripciones...")
        counts = client.get_subscriptions_count_by_status()
        print_subscription_summary(counts)
        
        # Enviar datos por webhook si está configurado
        if WEBHOOK_URL and WEBHOOK_URL.strip():
            print("\n" + "="*50)
            print("📤 ENVIANDO DATOS POR WEBHOOK...")
            print("="*50)
            
            # Obtener suscripciones past_due individuales
            past_due_details = []
            if counts['past_due'] > 0:
                print(f"🔍 Obteniendo detalles de {counts['past_due']} suscripciones past_due...")
                page = 1
                while True:
                    response = client.get_all_subscriptions(status='past_due', page=page, per_page=200)
                    if response.get('code') != 0:
                        print(f"❌ Error obteniendo suscripciones past_due: {response.get('message')}")
                        break
                    
                    subscriptions = response.get('subscriptions', [])
                    if not subscriptions:
                        break
                    
                    for sub in subscriptions:
                        past_due_details.append({
                            "subscription_id": sub.get('subscription_id'),
                            "subscription_number": sub.get('subscription_number'),
                            "customer_name": sub.get('customer', {}).get('display_name', 'N/A'),
                            "customer_email": sub.get('customer', {}).get('email', 'N/A'),
                            "plan_name": sub.get('plan', {}).get('plan_name', 'N/A'),
                            "amount": sub.get('amount', 0),
                            "currency_code": sub.get('currency_code', 'USD'),
                            "status": sub.get('status'),
                            "created_time": sub.get('created_time'),
                            "last_billing_at": sub.get('last_billing_at'),
                            "next_billing_at": sub.get('next_billing_at'),
                            "trial_ends_at": sub.get('trial_ends_at'),
                            "interval": sub.get('interval'),
                            "interval_unit": sub.get('interval_unit')
                        })
                    
                    # Verificar si hay más páginas
                    if not response.get('has_more_page', False):
                        break
                    page += 1
                
                print(f"✅ Obtenidos detalles de {len(past_due_details)} suscripciones past_due")
            
            # Preparar datos para webhook
            webhook_data = {
                "subscription_summary": {
                    "total_subscriptions": counts['total'],
                    "active_subscriptions": counts['live'],
                    "premium_subscriptions": counts['premium'],
                    "regular_subscriptions": counts['live'] - counts['premium'],
                    "cancelled_subscriptions": counts['cancelled'],
                    "expired_subscriptions": counts['expired'],
                    "trial_subscriptions": counts['trial'],
                    "unpaid_subscriptions": counts['unpaid'],
                    "paused_subscriptions": counts['paused'],
                    "past_due_subscriptions": counts['past_due'],
                    "non_renewing_subscriptions": counts['non_renewing'],
                    "other_status_subscriptions": counts['other']
                },
                "past_due_details": past_due_details,
                "percentages": {
                    "premium_percentage": (counts['premium'] / counts['live'] * 100) if counts['live'] > 0 else 0,
                    "regular_percentage": ((counts['live'] - counts['premium']) / counts['live'] * 100) if counts['live'] > 0 else 0,
                    "active_percentage": (counts['live'] / counts['total'] * 100) if counts['total'] > 0 else 0,
                    "cancelled_percentage": (counts['cancelled'] / counts['total'] * 100) if counts['total'] > 0 else 0,
                    "past_due_percentage": (counts['past_due'] / counts['total'] * 100) if counts['total'] > 0 else 0
                },
                "organization_id": ORGANIZATION_ID,
                "region": REGION,
                "generated_at": datetime.now().isoformat()
            }
            
            # Enviar webhook
            webhook_success = send_webhook(webhook_data, WEBHOOK_URL)
            
            if webhook_success:
                print("✅ Datos enviados exitosamente a Zapier")
            else:
                print("❌ Error al enviar datos por webhook")
        else:
            print("\n⚠️ Webhook no configurado. Para enviar datos a Zapier:")
            print("   1. Configura WEBHOOK_URL en el script")
            print("   2. Usa la URL de webhook de Zapier")
        
        # Mostrar detalles de suscripciones
        print_subscriptions_details(client, limit=5)
        
        # Mostrar resumen de clientes
        print_customers_summary(client, limit=3)
        
        print(f"\n✅ Proceso completado exitosamente - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
    except Exception as e:
        print(f"❌ Error general: {e}")
        print("\n🔧 Posibles soluciones:")
        print("1. Verifica que tu token de acceso sea válido")
        print("2. Confirma que el organization_id sea correcto")
        print("3. Asegúrate de tener permisos para acceder a Zoho Billing")
        print("4. Verifica tu conexión a internet")

if __name__ == "__main__":
    main()