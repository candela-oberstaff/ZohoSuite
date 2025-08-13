#!/usr/bin/env python3
"""
Script para encontrar el endpoint correcto de la API de Intelliscreen
"""
import requests
import os
from dotenv import load_dotenv

def test_all_possible_endpoints():
    load_dotenv()
    
    api_key = "9cc1610f1cbb201b3123726765bc67b6"
    
    # Posibles URLs base
    base_urls = [
        "https://api.intelliscreen.io",
        "https://api.intelliscreen.io/api",
        "https://api.intelliscreen.io/api/v1",
        "https://intelliscreen.io/api",
        "https://app.intelliscreen.io/api"
    ]
    
    # Posibles endpoints
    endpoints = [
        "/positions",
        "/jobs",
        "/listings",
        "/vacancies",
        "/openings",
        "/recruitment/positions",
        "/hr/positions",
        "/v1/positions",
        "/api/positions",
        "/positions/",
        "/api/v1/positions"
    ]
    
    headers = {
        "accept": "application/json",
        "X-API-Key": api_key
    }
    
    print("🔍 Buscando el endpoint correcto de Intelliscreen API")
    print(f"API Key: {api_key}")
    print("=" * 80)
    
    for base_url in base_urls:
        print(f"\n📍 Probando URL base: {base_url}")
        print("-" * 50)
        
        for endpoint in endpoints:
            url = f"{base_url}{endpoint}"
            try:
                response = requests.get(url, headers=headers, timeout=10)
                
                if response.status_code == 200:
                    print(f"✅ {endpoint} - {response.status_code} OK")
                    try:
                        data = response.json()
                        print(f"   📊 Tipo de respuesta: {type(data)}")
                        if 'positions' in str(data).lower():
                            print(f"   🎯 ¡Contiene datos de posiciones!")
                        elif 'jobs' in str(data).lower():
                            print(f"   🎯 ¡Contiene datos de trabajos!")
                    except:
                        pass
                elif response.status_code == 404:
                    print(f"⚠️  {endpoint} - 404 Not Found")
                elif response.status_code == 401:
                    print(f"❌ {endpoint} - 401 Unauthorized")
                else:
                    print(f"❓ {endpoint} - {response.status_code}")
                    
            except requests.exceptions.RequestException as e:
                print(f"❌ {endpoint} - Error de conexión: {e}")
    
    # También probar endpoints con parámetros
    print("\n" + "=" * 80)
    print("Probando endpoints con parámetros...")
    
    for base_url in base_urls:
        url = f"{base_url}/positions"
        try:
            params = {"limit": 1}
            response = requests.get(url, headers=headers, params=params, timeout=10)
            print(f"{url}?limit=1 - {response.status_code}")
            if response.status_code == 200:
                print("   ✅ Funciona con parámetros!")
        except:
            pass

if __name__ == "__main__":
    test_all_possible_endpoints()