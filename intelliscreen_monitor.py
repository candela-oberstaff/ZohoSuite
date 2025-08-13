#!/usr/bin/env python3
"""
Monitor de Intelliscreen - Detector de nuevas vacantes
Detecta automáticamente vacantes recién publicadas en Intelliscreen y las envía por webhook.

Características:
- Monitoreo continuo o ejecución única
- Detección basada en timestamps
- Enriquecimiento completo de datos
- Envío robusto por webhook
- Logging detallado
- Manejo de errores y reconexión
"""

import os
import sys
import time
import json
import logging
import argparse
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

class IntelliscreenMonitor:
    """
    Monitor principal para detectar nuevas posiciones en Intelliscreen
    """
    
    def __init__(self):
        # Configuración de la API
        self.api_key = os.getenv('INTELLISCREEN_API_KEY', '9cc1610f1cbb201b3123726765bc67b6')
        self.base_url = os.getenv('INTELLISCREEN_BASE_URL', 'https://api.intelliscreen.io/api/v1')
        
        # Configuración del webhook y monitoreo
        self.webhook_url = os.getenv('WEBHOOK_URL', 'https://n8n.obertrack.com/webhook/5ccffaaf-11d0-4c2d-9ebf-4308b0bb5c1f')
        self.check_interval = int(os.getenv('CHECK_INTERVAL', 300))  # 5 minutos por defecto
        
        # Archivos de control
        self.last_check_file = "last_check_timestamp.txt"
        self.log_file = "intelliscreen_monitor.log"
        
        # Configurar logging
        self._setup_logging()
        
        # Session para reutilizar conexiones HTTP
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
            'User-Agent': 'IntelliscreenMonitor/1.0'
        })
        
        # Timeouts configurables
        self.request_timeout = 30
        self.max_retries = 3
        
        self.logger.info("🚀 Monitor de Intelliscreen inicializado")
        self.logger.info(f"📡 Webhook URL: {self.webhook_url}")
        self.logger.info(f"⏱️  Intervalo de verificación: {self.check_interval} segundos")
        
    def _setup_logging(self):
        """Configurar el sistema de logging"""
        # Configurar formato de logs
        formatter = logging.Formatter(
            '%(asctime)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        # Logger principal
        self.logger = logging.getLogger('intelliscreen_monitor')
        self.logger.setLevel(logging.INFO)
        
        # Handler para archivo
        file_handler = logging.FileHandler(self.log_file, encoding='utf-8')
        file_handler.setLevel(logging.INFO)
        file_handler.setFormatter(formatter)
        
        # Handler para consola
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(formatter)
        
        # Añadir handlers
        self.logger.addHandler(file_handler)
        self.logger.addHandler(console_handler)
        
        # Evitar logs duplicados
        self.logger.propagate = False
        
    def test_connection(self) -> bool:
        """Probar conexión con la API de Intelliscreen"""
        try:
            response = self.session.get(
                f"{self.base_url}/positions",
                timeout=self.request_timeout,
                params={'limit': 1}
            )
            
            if response.status_code == 200:
                self.logger.info("✅ Conexión con Intelliscreen API exitosa")
                return True
            elif response.status_code == 404:
                self.logger.error("❌ Error 404: Verifica la URL de la API y que la clave sea válida")
                self.logger.error(f"📍 URL utilizada: {self.base_url}/positions")
                self.logger.error("💡 Sugerencia: Verifica que tu API key sea correcta y que tengas acceso a la API")
                return False
            elif response.status_code == 401:
                self.logger.error("❌ Error 401: API key inválida o no autorizada")
                return False
            else:
                self.logger.error(f"❌ Error de autenticación: {response.status_code}")
                return False
                
        except Exception as e:
            self.logger.error(f"❌ Error de conexión: {e}")
            return False
            
    def _make_request(self, endpoint: str, params: Optional[Dict] = None, retries: int = 0) -> Optional[Dict]:
        """Realizar petición HTTP con reintentos"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        try:
            response = self.session.get(
                url,
                params=params,
                timeout=self.request_timeout
            )
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                self.logger.warning(f"⚠️  Recurso no encontrado: {endpoint}")
                return None
            elif response.status_code == 429:
                # Rate limit - esperar más tiempo
                self.logger.warning("⏳ Rate limit alcanzado, esperando...")
                time.sleep(60)
                return self._make_request(endpoint, params, retries)
            else:
                self.logger.error(f"❌ Error HTTP {response.status_code}: {response.text}")
                
        except requests.exceptions.Timeout:
            self.logger.warning(f"⏰ Timeout en petición: {endpoint}")
        except requests.exceptions.ConnectionError as e:
            self.logger.warning(f"🔌 Error de conexión: {e}")
        except Exception as e:
            self.logger.error(f"❌ Error en petición: {e}")
            
        # Reintentar si hay errores
        if retries < self.max_retries:
            wait_time = 2 ** retries  # Backoff exponencial
            self.logger.info(f"🔄 Reintentando en {wait_time} segundos... (intento {retries + 1}/{self.max_retries})")
            time.sleep(wait_time)
            return self._make_request(endpoint, params, retries + 1)
            
        return None
        
    def get_positions(self, status: Optional[str] = None, per_page: int = 100) -> List[Dict]:
        """Obtener todas las posiciones con paginación"""
        all_positions = []
        page = 1
        
        while True:
            params = {
                'page': page,
                'per_page': per_page
            }
            
            if status:
                params['status'] = status
                
            response_data = self._make_request('/positions', params)
            
            if not response_data or 'positions' not in response_data:
                break
                
            positions = response_data['positions']
            if not positions:
                break
                
            all_positions.extend(positions)
            
            # Verificar si hay más páginas
            if len(positions) < per_page:
                break
                
            page += 1
            
            # Evitar bucles infinitos
            if page > 50:  # Máximo 5000 posiciones
                self.logger.warning("⚠️  Límite de páginas alcanzado")
                break
                
        self.logger.info(f"📊 Obtenidas {len(all_positions)} posiciones")
        return all_positions
        
    def get_position_details(self, position_id: str) -> Optional[Dict]:
        """Obtener detalles completos de una posición"""
        return self._make_request(f'/positions/{position_id}')
        
    def get_candidates_for_position(self, position_id: str, limit: int = 5) -> List[Dict]:
        """Obtener candidatos de una posición"""
        params = {'limit': limit}
        response_data = self._make_request(f'/positions/{position_id}/candidates', params)
        
        if response_data and 'candidates' in response_data:
            return response_data['candidates']
        return []
        
    def parse_datetime(self, date_string: str) -> datetime:
        """Parse flexible de fechas ISO 8601"""
        if not date_string:
            return datetime.now()
            
        # Formatos comunes de timestamp
        formats = [
            '%Y-%m-%dT%H:%M:%SZ',
            '%Y-%m-%dT%H:%M:%S.%fZ',
            '%Y-%m-%dT%H:%M:%S%z',
            '%Y-%m-%dT%H:%M:%S.%f%z',
            '%Y-%m-%d %H:%M:%S',
            '%Y-%m-%d'
        ]
        
        for fmt in formats:
            try:
                # Remover zona horaria simplificada si existe
                clean_date = date_string.replace('Z', '+00:00')
                return datetime.strptime(clean_date.split('+')[0].split('Z')[0], fmt.split('%z')[0])
            except ValueError:
                continue
                
        # Si no se puede parsear, usar fecha actual
        self.logger.warning(f"⚠️  No se pudo parsear fecha: {date_string}")
        return datetime.now()
        
    def get_last_check_timestamp(self) -> datetime:
        """Obtener timestamp de la última verificación"""
        if os.path.exists(self.last_check_file):
            try:
                with open(self.last_check_file, 'r') as f:
                    timestamp_str = f.read().strip()
                    return self.parse_datetime(timestamp_str)
            except Exception as e:
                self.logger.warning(f"⚠️  Error leyendo timestamp: {e}")
                
        # Si no existe archivo o hay error, usar 24 horas atrás
        return datetime.now() - timedelta(hours=24)
        
    def save_last_check_timestamp(self, timestamp: datetime):
        """Guardar timestamp de la verificación actual"""
        try:
            with open(self.last_check_file, 'w') as f:
                f.write(timestamp.isoformat())
        except Exception as e:
            self.logger.error(f"❌ Error guardando timestamp: {e}")
            
    def enrich_position_data(self, position: Dict) -> Dict:
        """Enriquecer datos de una posición con información adicional"""
        enriched = position.copy()
        
        try:
            # Obtener detalles completos
            position_id = position.get('id')
            if position_id:
                details = self.get_position_details(position_id)
                if details:
                    enriched.update(details)
                    
                # Obtener candidatos (limitado para no sobrecargar)
                candidates = self.get_candidates_for_position(position_id, limit=5)
                enriched['candidates'] = candidates
                enriched['candidates_count'] = len(candidates)
                
            # Añadir metadata de procesamiento
            enriched['processed_at'] = datetime.now().isoformat()
            enriched['source'] = 'intelliscreen_monitor'
            
        except Exception as e:
            self.logger.warning(f"⚠️  Error enriqueciendo posición {position.get('id', 'unknown')}: {e}")
            
        return enriched
        
    def find_new_positions(self, positions: List[Dict], last_check: datetime) -> List[Dict]:
        """Filtrar posiciones nuevas desde la última verificación"""
        new_positions = []
        
        for position in positions:
            try:
                # Verificar fecha de creación
                created_at_str = position.get('created_at')
                if not created_at_str:
                    continue
                    
                created_at = self.parse_datetime(created_at_str)
                
                # Comparar con último check (con margen de 1 minuto)
                if created_at > last_check - timedelta(minutes=1):
                    new_positions.append(position)
                    
            except Exception as e:
                self.logger.warning(f"⚠️  Error procesando posición: {e}")
                continue
                
        return new_positions
        
    def send_webhook(self, new_positions: List[Dict]) -> bool:
        """Enviar posiciones nuevas por webhook"""
        if not new_positions:
            return True
            
        payload = {
            'timestamp': datetime.now().isoformat(),
            'source': 'intelliscreen_monitor',
            'event_type': 'new_positions',
            'count': len(new_positions),
            'positions': new_positions
        }
        
        try:
            response = requests.post(
                self.webhook_url,
                json=payload,
                timeout=30,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code in [200, 201, 202]:
                self.logger.info(f"✅ Webhook enviado exitosamente: {len(new_positions)} posiciones")
                return True
            else:
                self.logger.error(f"❌ Error en webhook: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.logger.error(f"❌ Error enviando webhook: {e}")
            return False
            
    def check_for_new_positions(self) -> bool:
        """Verificar y procesar nuevas posiciones"""
        self.logger.info("=== Iniciando verificación de posiciones nuevas ===")
        
        try:
            # Obtener timestamp de última verificación
            last_check = self.get_last_check_timestamp()
            self.logger.info(f"🕒 Última verificación: {last_check.strftime('%Y-%m-%d %H:%M:%S')}")
            
            # Obtener posiciones activas de Intelliscreen
            self.logger.info("📡 Obteniendo posiciones de Intelliscreen...")
            positions = self.get_positions(status='active')

            if not positions:
                self.logger.warning("⚠️  No se obtuvieron posiciones de la API")
                return False
            
            # Buscar posiciones nuevas
            new_positions = self.find_new_positions(positions, last_check)
            
            if new_positions:
                self.logger.info(f"🆕 Encontradas {len(new_positions)} posiciones nuevas")
                
                # Enriquecer datos de posiciones nuevas
                enriched_positions = []
                for position in new_positions:
                    self.logger.info(f"🔍 Enriqueciendo posición: {position.get('title', 'Sin título')}")
                    enriched = self.enrich_position_data(position)
                    enriched_positions.append(enriched)
                    
                # Enviar por webhook
                success = self.send_webhook(enriched_positions)
                
                if success:
                    # Mostrar resumen
                    for pos in enriched_positions:
                        self.logger.info(f"📋 Enviada: {pos.get('title', 'Sin título')} (ID: {pos.get('id', 'N/A')})")
                else:
                    self.logger.error("❌ Error enviando datos por webhook")
                    return False
                    
            else:
                self.logger.info("ℹ️  No se encontraron posiciones nuevas")
                
            # Actualizar timestamp de última verificación
            current_time = datetime.now()
            self.save_last_check_timestamp(current_time)
            self.logger.info(f"💾 Timestamp actualizado: {current_time.strftime('%Y-%m-%d %H:%M:%S')}")
            
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Error en verificación: {e}")
            return False
             
    def run_single_check(self) -> bool:
        """Ejecutar una sola verificación"""
        return self.check_for_new_positions()
        
    def run_continuous_monitoring(self):
        """Ejecutar monitoreo continuo"""
        self.logger.info(f"🔄 Iniciando monitoreo continuo cada {self.check_interval} segundos")
        self.logger.info("💡 Presiona Ctrl+C para detener el monitoreo")
        
        consecutive_errors = 0
        max_consecutive_errors = 5
        
        while True:
            try:
                success = self.check_for_new_positions()
                
                if success:
                    consecutive_errors = 0
                else:
                    consecutive_errors += 1
                    
                if consecutive_errors >= max_consecutive_errors:
                    self.logger.error(f"❌ Demasiados errores consecutivos ({consecutive_errors}), deteniendo monitoreo")
                    break
                    
                self.logger.info(f"⏱️  Esperando {self.check_interval} segundos para próxima verificación...")
                time.sleep(self.check_interval)
                
            except KeyboardInterrupt:
                self.logger.info("\n⏹️  Monitoreo detenido por el usuario")
                break
            except Exception as e:
                consecutive_errors += 1
                self.logger.error(f"❌ Error inesperado en monitoreo: {e}")
                
                if consecutive_errors < max_consecutive_errors:
                    wait_time = min(60 * consecutive_errors, 300)  # Máximo 5 minutos
                    self.logger.info(f"⏳ Esperando {wait_time} segundos antes de reintentar...")
                    time.sleep(wait_time)
                else:
                    self.logger.error("❌ Demasiados errores, deteniendo monitoreo")
                    break
                     
def main():
    """Función principal del script"""
    parser = argparse.ArgumentParser(
        description='Monitor de posiciones nuevas en Intelliscreen',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos de uso:
  python intelliscreen_monitor.py                    # Monitoreo continuo
  python intelliscreen_monitor.py --once             # Ejecutar una sola vez
  python intelliscreen_monitor.py --test             # Probar conexión
  python intelliscreen_monitor.py --help             # Mostrar esta ayuda

Variables de entorno:
  WEBHOOK_URL      - URL del webhook (default: https://n8n.obertrack.com/webhook-test/5ccffaaf-11d0-4c2d-9ebf-4308b0bb5c1f)
  CHECK_INTERVAL   - Intervalo en segundos (default: 300)
        """
    )
    
    parser.add_argument(
        '--once',
        action='store_true',
        help='Ejecutar una sola verificación en lugar de monitoreo continuo'
    )
    
    parser.add_argument(
        '--test',
        action='store_true',
        help='Probar conexión con la API y salir'
    )
    
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Mostrar información detallada'
    )
    
    args = parser.parse_args()
    
    try:
        # Crear instancia del monitor
        monitor = IntelliscreenMonitor()
        
        # Probar conexión primero
        print("🔍 Probando conexión con Intelliscreen API...")
        if not monitor.test_connection():
            print("❌ No se puede conectar a la API. Verificar credenciales y conexión a internet.")
            return 1
            
        print("✅ Conexión establecida correctamente")
        
        if args.test:
            print("✅ Prueba de conexión exitosa")
            return 0
            
        if args.once:
            print("🔄 Ejecutando verificación única...")
            success = monitor.run_single_check()
            if success:
                print("✅ Verificación completada exitosamente")
                return 0
            else:
                print("❌ Error en la verificación")
                return 1
        else:
            print("🚀 Iniciando monitoreo continuo...")
            monitor.run_continuous_monitoring()
            return 0
            
    except KeyboardInterrupt:
        print("\n⏹️  Proceso detenido por el usuario")
        return 0
    except Exception as e:
        print(f"❌ Error fatal: {e}")
        return 1
        
if __name__ == '__main__':
    exit_code = main()
    exit(exit_code)