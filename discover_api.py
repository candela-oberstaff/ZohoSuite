#!/usr/bin/env python3
"""
Script para descubrir la estructura correcta de la API de Intelliscreen
"""
import requests
import json

def test_intelliscreen_api():
    api_key = "9cc1610f1cbb201b3123726765bc67b6"
    
    # Posibles dominios de Intelliscreen
    domains = [
        "https://api.intelliscreen.io",
        "https://intelliscreen.io",
        "https://app.intelliscreen.io",
        "https://admin.intelliscreen.io",
        "https://dashboard.intelliscreen.io"
    ]
    
    headers = {
        "accept": "application/json",
        "X-API-Key": api_key
    }
    
    print("🔍 Descubriendo la API de Intelliscreen...")
    print("=" * 80)
    
    # 1. Probar endpoints básicos
    for domain in domains:
        print(f"\n📍 Probando dominio: {domain}")
        print("-" * 50)
        
        # Probar endpoint raíz
        try:
            response = requests.get(domain, headers=headers, timeout=10)
            print(f"GET {domain} - {response.status_code}")
            if response.status_code == 200:
                print(f"   ✅ Respuesta: {response.text[:200]}...")
        except Exception as e:
            print(f"   ❌ Error: {e}")
        
        # Probar /api
        try:
            response = requests.get(f"{domain}/api", headers=headers, timeout=10)
            print(f"GET {domain}/api - {response.status_code}")
            if response.status_code == 200:
                print(f"   ✅ Respuesta: {response.text[:200]}...")
        except Exception as e:
            print(f"   ❌ Error: {e}")
        
        # Probar /docs o /documentation
        doc_endpoints = ["/docs", "/documentation", "/swagger", "/api-docs", "/health"]
        for doc in doc_endpoints:
            try:
                response = requests.get(f"{domain}{doc}", timeout=10)
                if response.status_code == 200:
                    print(f"   📚 Documentación encontrada: {domain}{doc}")
                    print(f"   📄 Respuesta: {response.text[:300]}...")
            except:
                pass
    
    # 2. Probar con Bearer token
    print("\n" + "=" * 80)
    print("Probando con Bearer token...")
    
    bearer_headers = {
        "accept": "application/json",
        "Authorization": f"Bearer 9cc1610f1cbb201b3123726765bc67b6"
    }
    
    for domain in ["https://api.intelliscreen.io"]:
        endpoints = ["/positions", "/jobs", "/listings", "/v1/positions"]
        for endpoint in endpoints:
            try:
                url = f"{domain}{endpoint}"
                response = requests.get(url, headers=bearer_headers, timeout=10)
                print(f"{endpoint} - {response.status_code}")
                if response.status_code == 200:
                    print(f"   ✅ Funciona con Bearer: {response.json()}")
            except Exception as e:
                print(f"   ❌ Error: {e}")

if __name__ == "__main__":
    test_intelliscreen_api()