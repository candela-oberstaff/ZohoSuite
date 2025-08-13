#!/usr/bin/env python3
"""
Script de prueba para verificar la validez del API key de Intelliscreen
"""
import requests
import os
from dotenv import load_dotenv

def test_api_key():
    # Cargar variables de entorno
    load_dotenv()
    
    api_key = os.getenv('INTELLISCREEN_API_KEY')
    base_url = os.getenv('INTELLISCREEN_BASE_URL')
    
    if not api_key:
        print("❌ No se encontró INTELLISCREEN_API_KEY en .env")
        return
    
    if not base_url:
        base_url = "https://api.intelliscreen.io/api/v1"
    
    print(f"🔍 Verificando API key: {api_key}")
    print(f"📍 URL base: {base_url}")
    
    # Crear sesión con headers
    session = requests.Session()
    session.headers.update({
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
        'User-Agent': 'APIKeyTest/1.0'
    })
    
    try:
        # Hacer petición de prueba
        url = f"{base_url}/positions"
        print(f"🔗 Haciendo petición a: {url}")
        
        response = session.get(url, params={'limit': 1}, timeout=30)
        
        print(f"📊 Código de respuesta: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ API key válida - conexión exitosa")
            data = response.json()
            if 'positions' in data:
                print(f"📋 Posiciones encontradas: {len(data['positions'])}")
        elif response.status_code == 401:
            print("❌ API key inválida o no autorizada")
        elif response.status_code == 404:
            print("❌ Recurso no encontrado - verifica la URL de la API")
            print(f"💡 URL utilizada: {url}")
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"📄 Respuesta: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Error de conexión: {e}")
    except Exception as e:
        print(f"❌ Error inesperado: {e}")

if __name__ == "__main__":
    test_api_key()