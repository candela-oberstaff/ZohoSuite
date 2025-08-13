#!/usr/bin/env python3
"""
Script para probar diferentes endpoints de la API de Intelliscreen
"""
import requests
import os
from dotenv import load_dotenv

def test_different_endpoints():
    # Cargar variables de entorno
    load_dotenv()
    
    api_key = os.getenv('INTELLISCREEN_API_KEY')
    base_url = os.getenv('INTELLISCREEN_BASE_URL')
    
    if not api_key:
        print("❌ No se encontró INTELLISCREEN_API_KEY en .env")
        return
    
    if not base_url:
        base_url = "https://api.intelliscreen.io/api/v1"
    
    # Endpoints comunes a probar
    endpoints = [
        "/positions",
        "/jobs",
        "/listings",
        "/v1/positions",
        "/api/positions",
        "/positions/",
        "/",
        "/health",
        "/status",
        "/ping"
    ]
    
    session = requests.Session()
    session.headers.update({
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
        'User-Agent': 'EndpointTest/1.0'
    })
    
    print(f"🔍 Probando diferentes endpoints con API key: {api_key}")
    print(f"📍 URL base: {base_url}")
    print("=" * 60)
    
    for endpoint in endpoints:
        try:
            url = f"{base_url}{endpoint}"
            print(f"🔗 Probando: {endpoint}")
            
            response = session.get(url, timeout=30)
            
            if response.status_code == 200:
                print(f"✅ {endpoint} - {response.status_code} OK")
                if 'json' in response.headers.get('content-type', ''):
                    try:
                        data = response.json()
                        print(f"   📊 Respuesta: {type(data).__name__}")
                    except:
                        print(f"   📄 Texto: {response.text[:100]}...")
            elif response.status_code == 401:
                print(f"❌ {endpoint} - {response.status_code} Unauthorized")
            elif response.status_code == 404:
                print(f"⚠️  {endpoint} - {response.status_code} Not Found")
            else:
                print(f"❓ {endpoint} - {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            print(f"❌ {endpoint} - Error: {e}")
    
    # También probar sin el /api/v1
    print("\n" + "=" * 60)
    print("Probando con URL base alternativa...")
    
    alternative_urls = [
        "https://api.intelliscreen.io",
        "https://intelliscreen.io/api",
        "https://app.intelliscreen.io/api"
    ]
    
    for alt_url in alternative_urls:
        try:
            url = f"{alt_url}/positions"
            print(f"🔗 Probando: {url}")
            
            response = session.get(url, timeout=30)
            print(f"📊 {alt_url} - {response.status_code}")
            
        except requests.exceptions.RequestException as e:
            print(f"❌ {alt_url} - Error: {e}")

if __name__ == "__main__":
    test_different_endpoints()