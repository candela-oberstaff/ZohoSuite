#!/usr/bin/env python3
"""
Utilidades para el monitor de Intelliscreen
Script de administración y herramientas adicionales
"""

import sys
import os
import json
from datetime import datetime, timedelta
from intelliscreen_monitor import IntelliscreenMonitor
import logging

# Configurar logging básico
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class IntelliscreenUtils:
    def __init__(self):
        self.monitor = IntelliscreenMonitor()
        
    def test_api_connection(self):
        """Probar conexión con la API"""
        print("🔍 Probando conexión con Intelliscreen API...\n")
        
        if self.monitor.test_connection():
            print("✅ Conexión exitosa!")
            
            # Obtener información básica
            try:
                positions = self.monitor.get_positions()
                print(f"📊 Posiciones disponibles: {len(positions)}")
                
                # Mostrar últimas 3 posiciones
                if positions:
                    print("\n📋 Últimas posiciones:")
                    for i, pos in enumerate(positions[:3]):
                        print(f"  {i+1}. {pos.get('title', 'Sin título')} (ID: {pos.get('id', 'N/A')})")
                        
            except Exception as e:
                print(f"⚠️  Error obteniendo información: {e}")
                
        else:
            print("❌ Error de conexión")
            return False
            
        return True
        
    def show_recent_positions(self, hours=24):
        """Mostrar posiciones recientes"""
        print(f"📅 Posiciones de las últimas {hours} horas:\n")
        
        try:
            positions = self.monitor.get_positions()
            recent_threshold = datetime.now() - timedelta(hours=hours)
            
            recent_positions = []
            for pos in positions:
                if 'created_at' in pos:
                    try:
                        created_at = self.monitor.parse_datetime(pos['created_at'])
                        if created_at > recent_threshold:
                            recent_positions.append(pos)
                    except:
                        continue
                        
            if recent_positions:
                print(f"Encontradas {len(recent_positions)} posiciones recientes:")
                for i, pos in enumerate(recent_positions):
                    created_at = self.monitor.parse_datetime(pos.get('created_at', ''))
                    print(f"\n{i+1}. 📄 {pos.get('title', 'Sin título')}")
                    print(f"   ID: {pos.get('id', 'N/A')}")
                    print(f"   Estado: {pos.get('status', 'N/A')}")
                    print(f"   Creada: {created_at.strftime('%Y-%m-%d %H:%M:%S')}")
                    print(f"   Descripción: {(pos.get('description', '')[:100] + '...') if pos.get('description') else 'N/A'}")
            else:
                print("❌ No se encontraron posiciones recientes")
                
        except Exception as e:
            print(f"❌ Error obteniendo posiciones: {e}")
            
    def show_position_details(self, position_id):
        """Mostrar detalles de una posición específica"""
        print(f"🔍 Detalles de la posición: {position_id}\n")
        
        try:
            position = self.monitor.get_position_details(position_id)
            
            if position:
                print(f"📄 Título: {position.get('title', 'N/A')}")
                print(f"🆔 ID: {position.get('id', 'N/A')}")
                print(f"📊 Estado: {position.get('status', 'N/A')}")
                print(f"📅 Creada: {position.get('created_at', 'N/A')}")
                print(f"🔄 Actualizada: {position.get('updated_at', 'N/A')}")
                print(f"\n📝 Descripción:")
                print(position.get('description', 'N/A'))
                print(f"\n📋 Requisitos:")
                print(position.get('requirements', 'N/A'))
                
                # Obtener candidatos
                candidates = self.monitor.get_candidates_for_position(position_id)
                print(f"\n👥 Candidatos: {len(candidates)}")
                
                if candidates:
                    print("\nPrimeros candidatos:")
                    for i, candidate in enumerate(candidates[:5]):
                        print(f"  {i+1}. {candidate.get('name', 'N/A')} ({candidate.get('email', 'N/A')})")
                        
                # Evaluaciones
                assessments = position.get('assessments', [])
                if assessments:
                    print(f"\n🎯 Evaluaciones: {', '.join(assessments)}")
                    
            else:
                print("❌ No se pudo obtener la posición")
                
        except Exception as e:
            print(f"❌ Error obteniendo detalles: {e}")
            
    def reset_timestamp(self):
        """Reiniciar timestamp de última verificación"""
        try:
            if os.path.exists(self.monitor.last_check_file):
                os.remove(self.monitor.last_check_file)
                print("✅ Timestamp reiniciado - próxima verificación incluirá todas las posiciones")
            else:
                print("ℹ️  No había timestamp previo")
        except Exception as e:
            print(f"❌ Error reiniciando timestamp: {e}")
            
    def set_custom_timestamp(self, hours_back=24):
        """Establecer timestamp personalizado"""
        try:
            new_timestamp = datetime.now() - timedelta(hours=hours_back)
            self.monitor.save_last_check_timestamp(new_timestamp)
            print(f"✅ Timestamp establecido a {hours_back} horas atrás ({new_timestamp})")
        except Exception as e:
            print(f"❌ Error estableciendo timestamp: {e}")
            
    def simulate_webhook(self, position_ids=None, count=1):
        """Simular envío de webhook con posiciones existentes"""
        print(f"🧪 Simulando webhook...\n")
        
        try:
            positions = self.monitor.get_positions()
            
            if position_ids:
                # Usar posiciones específicas
                test_positions = [p for p in positions if p.get('id') in position_ids]
            else:
                # Usar las primeras N posiciones
                test_positions = positions[:count]
                
            if test_positions:
                print(f"Enviando {len(test_positions)} posiciones de prueba:")
                for pos in test_positions:
                    print(f"  - {pos.get('title', 'Sin título')} (ID: {pos.get('id', 'N/A')})")
                    
                # Enriquecer y enviar
                enriched = [self.monitor.enrich_position_data(pos) for pos in test_positions]
                self.monitor.send_webhook(enriched)
                print("\n✅ Webhook de prueba enviado")
            else:
                print("❌ No se encontraron posiciones para simular")
                
        except Exception as e:
            print(f"❌ Error simulando webhook: {e}")
            
    def show_stats(self):
        """Mostrar estadísticas generales"""
        print("📊 Estadísticas de Intelliscreen\n")
        
        try:
            positions = self.monitor.get_positions()
            
            # Contar por estado
            status_counts = {}
            for pos in positions:
                status = pos.get('status', 'unknown')
                status_counts[status] = status_counts.get(status, 0) + 1
                
            print(f"📄 Total de posiciones: {len(positions)}")
            print("\n📋 Por estado:")
            for status, count in status_counts.items():
                print(f"  {status}: {count}")
                
            # Posiciones recientes
            recent_24h = []
            recent_7d = []
            now = datetime.now()
            
            for pos in positions:
                if 'created_at' in pos:
                    try:
                        created_at = self.monitor.parse_datetime(pos['created_at'])
                        if (now - created_at).days < 1:
                            recent_24h.append(pos)
                        elif (now - created_at).days < 7:
                            recent_7d.append(pos)
                    except:
                        continue
                        
            print(f"\n📅 Posiciones recientes:")
            print(f"  Últimas 24 horas: {len(recent_24h)}")
            print(f"  Últimos 7 días: {len(recent_7d)}")
            
            # Timestamp de última verificación
            if os.path.exists(self.monitor.last_check_file):
                last_check = self.monitor.get_last_check_timestamp()
                print(f"\n🕒 Última verificación: {last_check.strftime('%Y-%m-%d %H:%M:%S')}")
                time_since = now - last_check
                print(f"   Hace {time_since.total_seconds()/3600:.1f} horas")
                
        except Exception as e:
            print(f"❌ Error obteniendo estadísticas: {e}")
            
    def export_positions(self, filename='intelliscreen_positions.json'):
        """Exportar todas las posiciones a JSON"""
        print(f"💾 Exportando posiciones a {filename}...\n")
        
        try:
            positions = self.monitor.get_positions()
            
            # Enriquecer datos
            enriched_positions = []
            for pos in positions:
                enriched = self.monitor.enrich_position_data(pos)
                enriched_positions.append(enriched)
                
            export_data = {
                'export_date': datetime.now().isoformat(),
                'total_positions': len(enriched_positions),
                'positions': enriched_positions
            }
            
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, indent=2, ensure_ascii=False)
                
            print(f"✅ {len(enriched_positions)} posiciones exportadas a {filename}")
            
        except Exception as e:
            print(f"❌ Error exportando: {e}")
            
def show_help():
    """Mostrar ayuda"""
    print("""
🛠️  Utilidades de Intelliscreen Monitor

Comandos disponibles:

🔍 Diagnóstico:
  test           - Probar conexión con la API
  stats          - Mostrar estadísticas generales
  recent [horas] - Mostrar posiciones recientes (default: 24h)
  details <id>   - Mostrar detalles de una posición

⚙️  Configuración:
  reset          - Reiniciar timestamp de última verificación
  settime <hrs>  - Establecer timestamp N horas atrás (default: 24)

🧪 Testing:
  simulate [n]   - Simular webhook con N posiciones (default: 1)
  webhook <id>   - Enviar posición específica por webhook

💾 Exportar:
  export [file]  - Exportar todas las posiciones a JSON

❓ Ayuda:
  help           - Mostrar esta ayuda

Ejemplos:
  python intelliscreen_utils.py test
  python intelliscreen_utils.py recent 12
  python intelliscreen_utils.py details pos_12345
  python intelliscreen_utils.py simulate 3
  python intelliscreen_utils.py export mi_export.json
    """)
    
def main():
    if len(sys.argv) < 2:
        show_help()
        return
        
    utils = IntelliscreenUtils()
    command = sys.argv[1].lower()
    
    if command == 'help':
        show_help()
        
    elif command == 'test':
        utils.test_api_connection()
        
    elif command == 'stats':
        utils.show_stats()
        
    elif command == 'recent':
        hours = int(sys.argv[2]) if len(sys.argv) > 2 else 24
        utils.show_recent_positions(hours)
        
    elif command == 'details':
        if len(sys.argv) < 3:
            print("❌ Uso: python intelliscreen_utils.py details <position_id>")
            return
        utils.show_position_details(sys.argv[2])
        
    elif command == 'reset':
        utils.reset_timestamp()
        
    elif command == 'settime':
        hours = int(sys.argv[2]) if len(sys.argv) > 2 else 24
        utils.set_custom_timestamp(hours)
        
    elif command == 'simulate':
        count = int(sys.argv[2]) if len(sys.argv) > 2 else 1
        utils.simulate_webhook(count=count)
        
    elif command == 'webhook':
        if len(sys.argv) < 3:
            print("❌ Uso: python intelliscreen_utils.py webhook <position_id>")
            return
        utils.simulate_webhook(position_ids=[sys.argv[2]])
        
    elif command == 'export':
        filename = sys.argv[2] if len(sys.argv) > 2 else 'intelliscreen_positions.json'
        utils.export_positions(filename)
        
    else:
        print(f"❌ Comando desconocido: {command}")
        print("Usa 'help'