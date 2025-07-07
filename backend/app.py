import os
import json
import time
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
from dotenv import load_dotenv

# Cargar variables de entorno (opcional, para mayor seguridad)
load_dotenv()

app = FastAPI(title="Zoho Bigin API", description="API para interactuar con Zoho Bigin")

# Configurar CORS para permitir peticiones desde el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, limitar a la URL del frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuración desde variables de entorno o directamente del script
CLIENT_ID = os.getenv("ZOHO_CLIENT_ID", "1000.GQTMVWKPS7HAJ5XRGB3HKZMB0W0IOC")
CLIENT_SECRET = os.getenv("ZOHO_CLIENT_SECRET", "5b16c9a69e2f96d0224be556b377f9afc4dddf75a7")
REFRESH_TOKEN = os.getenv("ZOHO_REFRESH_TOKEN", "1000.d36ec67a1c828d1ff3b87ee15ef977eb.0943c9b523718dbd992506416a1c013f")
ZOHO_ACCOUNTS_URL = os.getenv("ZOHO_ACCOUNTS_URL", "https://accounts.zoho.com")
BIGIN_API_URL = os.getenv("BIGIN_API_URL", "https://www.zohoapis.com/bigin/v2")

# Variable global para almacenar el token (en producción usar una solución más robusta)
access_token_cache = {
    "token": None,
    "expires_at": 0
}

# Modelos de datos para la API
class AccessToken(BaseModel):
    access_token: str
    expires_in: int

class ApiResponse(BaseModel):
    success: bool
    data: Any = None
    error: Optional[str] = None
    message: Optional[str] = None

class OpportunityCreate(BaseModel):
    Deal_Name: str
    Stage: Optional[str] = None
    Amount: Optional[float] = None
    Closing_Date: Optional[str] = None
    Account_Name: Optional[str] = None
    Pipeline: Optional[str] = None
    Contact_Name: Optional[str] = None
    Contact_Email: Optional[str] = None
    Contact_Phone: Optional[str] = None

# Función para refrescar el token de acceso
def refrescar_access_token():
    """Obtiene un nuevo access token usando el refresh token"""
    # Si el token actual es válido y no ha expirado, lo devolvemos
    current_time = time.time()
    if access_token_cache["token"] and access_token_cache["expires_at"] > current_time:
        return access_token_cache["token"]
    
    token_url = f"{ZOHO_ACCOUNTS_URL}/oauth/v2/token"
    payload = {
        "refresh_token": REFRESH_TOKEN,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "grant_type": "refresh_token",
    }
    
    try:
        response = requests.post(token_url, data=payload)
        response.raise_for_status()
        response_data = response.json()
        
        # Almacenar el token y su tiempo de expiración
        access_token_cache["token"] = response_data.get("access_token")
        # Restamos 60 segundos para renovar antes de que expire
        access_token_cache["expires_at"] = current_time + response_data.get("expires_in", 3600) - 60
        
        return access_token_cache["token"]
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener access token: {str(e)}")

# Dependencia para obtener el token en cada endpoint
async def get_access_token():
    token = refrescar_access_token()
    if not token:
        raise HTTPException(status_code=401, detail="No se pudo obtener un token de acceso válido")
    return token

# Función auxiliar para obtener datos de Zoho con paginación
async def fetch_zoho_data(endpoint: str, access_token: str, params: dict = None):
    """Función auxiliar para obtener datos de Zoho con paginación optimizada"""
    headers = {"Authorization": f"Zoho-oauthtoken {access_token}"}
    
    try:
        response = requests.get(f"{BIGIN_API_URL}/{endpoint}", headers=headers, params=params)
        response.raise_for_status()
        response_data = response.json()
        
        return response_data
        
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener datos de Zoho: {str(e)}")

# Endpoints de la API
@app.get("/", response_model=ApiResponse)
async def root():
    return {"success": True, "message": "API de Zoho Bigin funcionando correctamente"}

@app.get("/api/contactos", response_model=ApiResponse)
async def obtener_contactos(
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=200),
    search: Optional[str] = None,
    access_token: str = Depends(get_access_token)
):
    """Obtiene la lista paginada de contactos de Bigin"""
    try:
        # Configurar parámetros de la consulta según la API de Bigin
        params = {
            "per_page": min(limit, 200),  # Máximo 200 según la documentación
            "page": page,
            "fields": "Full_Name,Email,Phone,Mobile,Last_Name,First_Name,id,Account_Name,Created_Time"
        }
        
        if search:
            params["search_criteria"] = f"(Full_Name:starts_with:{search})"

        response = await fetch_zoho_data("Contacts", access_token, params)
        
        if not response or not response.get("data"):
            return {
                "success": True,
                "data": {
                    "items": [],
                    "total": 0,
                    "page": page,
                    "limit": limit
                }
            }

        # Obtener información de paginación
        info = response.get("info", {})
        current_count = len(response.get("data", []))
        more_records = info.get("more_records", False)
        
        # Calcular el total estimado basado en la paginación
        # Si hay más registros, estimamos el total
        if more_records:
            # Estimación conservadora: (página actual - 1) * límite + registros actuales + al menos 1 más
            estimated_total = (page - 1) * limit + current_count + limit
        else:
            # Si no hay más registros, el total es exacto
            estimated_total = (page - 1) * limit + current_count
        
        return {
            "success": True,
            "data": {
                "items": response.get("data", []),
                "total": estimated_total,
                "page": page,
                "limit": limit,
                "more_records": more_records
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/contactos/{contact_id}", response_model=ApiResponse)
async def obtener_contacto_por_id(
    contact_id: str,
    access_token: str = Depends(get_access_token)
):
    """Obtiene un contacto específico por su ID"""
    try:
        # Usar el endpoint específico de Zoho para obtener un contacto por ID
        response = await fetch_zoho_data(f"Contacts/{contact_id}", access_token)
        
        if not response or not response.get("data"):
            return {
                "success": False,
                "error": "Contacto no encontrado"
            }
        
        # Zoho devuelve un array con un solo elemento cuando se busca por ID
        contact_data = response.get("data")
        if isinstance(contact_data, list) and len(contact_data) > 0:
            contact_data = contact_data[0]
        
        return {
            "success": True,
            "data": contact_data
        }
    except Exception as e:
        return {"success": False, "error": f"Error al obtener contacto: {str(e)}"}

@app.get("/api/modulos", response_model=ApiResponse)
async def obtener_modulos(access_token: str = Depends(get_access_token)):
    """Obtiene la lista de módulos disponibles en Bigin"""
    modulos_api_url = f"{BIGIN_API_URL}/settings/modules"
    headers = {"Authorization": f"Zoho-oauthtoken {access_token}"}
    
    try:
        response = requests.get(modulos_api_url, headers=headers)
        response.raise_for_status()
        response_data = response.json()
        return {"success": True, "data": response_data.get("modules", [])}
    except requests.exceptions.RequestException as e:
        return {"success": False, "error": str(e)}

@app.get("/api/pipelines", response_model=ApiResponse)
async def obtener_pipelines(
    pipeline_id: Optional[str] = Query(None, description="ID del embudo específico a consultar"),
    access_token: str = Depends(get_access_token)
):
    """Obtiene la lista de oportunidades (pipelines), opcionalmente filtradas por ID de embudo"""
    pipelines_api_url = f"{BIGIN_API_URL}/Pipelines"
    headers = {"Authorization": f"Zoho-oauthtoken {access_token}"}
    
    # Campos a recuperar
    fields = "Deal_Name,Stage,Amount,Owner,Contact_Name,Closing_Date,Description,id,Created_Time,Modified_Time,Pipeline"
    
    params = {
        "per_page": 200,
        "page": 1,
        "fields": fields
    }
    
    # Añadir filtro por pipeline_id si se proporciona
    if pipeline_id:
        params["pipeline_id"] = pipeline_id
    
    try:
        all_pipelines = []
        more_records = True
        page = 1
        page_token = None
        
        while more_records and page <= 50:  # Limitamos a 50 páginas por seguridad
            # Si tenemos un page_token, lo usamos en lugar de page
            if page_token:
                params["page_token"] = page_token
                if "page" in params:
                    del params["page"]
            else:
                params["page"] = page
                if "page_token" in params:
                    del params["page_token"]
            
            response = requests.get(pipelines_api_url, headers=headers, params=params)
            response.raise_for_status()
            response_data = response.json()
            
            pipelines_on_page = response_data.get("data", [])
            all_pipelines.extend(pipelines_on_page)
            
            info = response_data.get("info", {})
            more_records = info.get("more_records", False)
            
            # Obtener el token para la siguiente página si existe
            if more_records:
                page_token = info.get("next_page_token")
            
            page += 1
            
        return {"success": True, "data": all_pipelines}
    except requests.exceptions.RequestException as e:
        return {"success": False, "error": str(e)}

@app.get("/api/team-pipelines", response_model=ApiResponse)
async def obtener_team_pipelines(access_token: str = Depends(get_access_token)):
    """Obtiene la lista de embudos (team pipelines) disponibles"""
    # Primero obtenemos algunas oportunidades para extraer los embudos
    pipelines_api_url = f"{BIGIN_API_URL}/Pipelines"
    headers = {"Authorization": f"Zoho-oauthtoken {access_token}"}
    
    params = {
        "per_page": 200,  # Obtenemos más para encontrar diferentes embudos
        "fields": "Pipeline"
    }
    
    try:
        response = requests.get(pipelines_api_url, headers=headers, params=params)
        response.raise_for_status()
        response_data = response.json()
        
        # Extraer los embudos únicos
        team_pipelines = {}
        for deal in response_data.get("data", []):
            pipeline = deal.get("Pipeline")
            if pipeline and pipeline.get("id") and pipeline.get("id") not in team_pipelines:
                team_pipelines[pipeline.get("id")] = {
                    "id": pipeline.get("id"),
                    "name": pipeline.get("name")
                }
        
        return {"success": True, "data": list(team_pipelines.values())}
    except requests.exceptions.RequestException as e:
        return {"success": False, "error": str(e)}

@app.get("/api/pipeline-fields", response_model=ApiResponse)
async def obtener_campos_pipeline(access_token: str = Depends(get_access_token)):
    """Obtiene las fases específicas del pipeline Oberstaff"""
    headers = {"Authorization": f"Zoho-oauthtoken {access_token}"}
    
    try:
        # Primero obtenemos los team pipelines para encontrar Oberstaff
        team_pipelines_response = await obtener_team_pipelines(access_token)
        
        if not team_pipelines_response.get("success"):
            return {"success": False, "error": "No se pudieron obtener los embudos"}
        
        # Buscar el embudo Oberstaff
        oberstaff_pipeline = None
        for pipeline in team_pipelines_response.get("data", []):
            if "oberstaff" in pipeline.get("name", "").lower():
                oberstaff_pipeline = pipeline
                break
        
        if not oberstaff_pipeline:
            return {"success": False, "error": "No se encontró el embudo Oberstaff"}
        
        # Intentar obtener layouts metadata para el pipeline específico
        layouts_api_url = f"{BIGIN_API_URL}/settings/layouts"
        params = {
            "module": "Pipelines"
        }
        
        response = requests.get(layouts_api_url, headers=headers, params=params)
        response.raise_for_status()
        layouts_data = response.json()
        
        # Buscar stages específicos del pipeline Oberstaff en los layouts
        oberstaff_stages = []
        layouts = layouts_data.get("layouts", [])
        
        for layout in layouts:
            # Verificar si este layout corresponde al pipeline Oberstaff
            if layout.get("name") and "oberstaff" in layout.get("name", "").lower():
                sections = layout.get("sections", [])
                for section in sections:
                    fields = section.get("fields", [])
                    for field in fields:
                        if field.get("api_name") == "Stage" and field.get("pick_list_values"):
                            oberstaff_stages = field.get("pick_list_values", [])
                            break
                    if oberstaff_stages:
                        break
                if oberstaff_stages:
                    break
        
        # Obtener registros del pipeline Oberstaff usando la API específica
        # Según la documentación: Get records from a Team Pipeline usando pipeline_id como query parameter
        pipelines_api_url = f"{BIGIN_API_URL}/Pipelines"
        params = {
            "pipeline_id": oberstaff_pipeline["id"],
            "fields": "Stage,Sub_Pipeline,Deal_Name,Pipeline",
            "per_page": 200
        }
        
        print(f"Obteniendo registros del pipeline Oberstaff con ID: {oberstaff_pipeline['id']}")
        print(f"URL de la API: {pipelines_api_url}")
        print(f"Parámetros: {params}")
        
        response = requests.get(pipelines_api_url, headers=headers, params=params)
        print(f"Status code de la respuesta: {response.status_code}")
        
        if response.status_code != 200:
            print(f"Error en la respuesta: {response.text}")
            # Si falla la obtención de registros específicos, intentar obtener todos los registros
            params_all = {
                "fields": "Stage,Sub_Pipeline,Deal_Name,Pipeline",
                "per_page": 200
            }
            response = requests.get(pipelines_api_url, headers=headers, params=params_all)
        
        response.raise_for_status()
        records_data = response.json()
        
        print(f"Respuesta de registros del pipeline: {records_data}")
        
        # Extraer stages únicos de los registros del pipeline Oberstaff
        unique_stages = set()
        records = records_data.get("data", [])
        
        print(f"Número total de registros encontrados: {len(records)}")
        
        # Filtrar registros que pertenecen al pipeline Oberstaff
        oberstaff_records = []
        for record in records:
            pipeline_info = record.get("Pipeline", {})
            if isinstance(pipeline_info, dict):
                pipeline_name = pipeline_info.get("name", "")
                pipeline_id = pipeline_info.get("id", "")
                
                # Verificar si el registro pertenece al pipeline Oberstaff
                if (pipeline_id == oberstaff_pipeline["id"] or 
                    "oberstaff" in pipeline_name.lower()):
                    oberstaff_records.append(record)
                    stage = record.get("Stage")
                    if stage:
                        unique_stages.add(stage)
                        print(f"Stage encontrado en pipeline Oberstaff: {stage}")
        
        print(f"Registros del pipeline Oberstaff: {len(oberstaff_records)}")
        print(f"Stages únicos encontrados: {unique_stages}")
        
        # Convertir a formato de pick_list_values
        if unique_stages:
            oberstaff_stages = [{"display_value": stage, "actual_value": stage} for stage in sorted(unique_stages)]
        else:
            # Si no hay registros específicos, intentar obtener desde fields metadata
            print("No se encontraron stages específicos, obteniendo desde fields metadata...")
            fields_api_url = f"{BIGIN_API_URL}/settings/fields"
            params = {"module": "Pipelines"}
            
            response = requests.get(fields_api_url, headers=headers, params=params)
            response.raise_for_status()
            fields_data = response.json()
            
            print(f"Fields metadata response: {fields_data}")
            
            # Buscar el campo Stage
            for field in fields_data.get("fields", []):
                if field.get("api_name") == "Stage" and field.get("pick_list_values"):
                    all_stages = field.get("pick_list_values", [])
                    print(f"Todos los stages disponibles: {all_stages}")
                    # Filtrar solo los stages que podrían ser del pipeline Oberstaff
                    oberstaff_stages = all_stages
                    break
        
        # Si aún no tenemos stages, usar valores por defecto
        if not oberstaff_stages:
            oberstaff_stages = [
                {"display_value": "Prospecto", "actual_value": "Prospecto"},
                {"display_value": "Calificación", "actual_value": "Calificación"},
                {"display_value": "Necesidades", "actual_value": "Necesidades"},
                {"display_value": "Propuesta", "actual_value": "Propuesta"},
                {"display_value": "Negociación", "actual_value": "Negociación"},
                {"display_value": "Cerrado Ganado", "actual_value": "Cerrado Ganado"},
                {"display_value": "Cerrado Perdido", "actual_value": "Cerrado Perdido"}
            ]
        
        return {
            "success": True, 
            "data": {
                "pipeline_id": oberstaff_pipeline["id"],
                "pipeline_name": oberstaff_pipeline["name"],
                "stages": oberstaff_stages,
                "stage_field": {
                    "api_name": "Stage",
                    "display_label": "Stage",
                    "pick_list_values": oberstaff_stages
                }
            }
        }
    except requests.exceptions.RequestException as e:
        return {"success": False, "error": str(e)}
    except Exception as e:
        return {"success": False, "error": f"Error al obtener campos del pipeline: {str(e)}"}

@app.get("/api/oberstaff-pipeline", response_model=ApiResponse)
async def obtener_oberstaff_pipeline(access_token: str = Depends(get_access_token)):
    """Obtiene específicamente el embudo Oberstaff y todas sus oportunidades"""
    try:
        # Primero obtenemos todos los embudos para encontrar el de Oberstaff
        team_pipelines_response = await obtener_team_pipelines(access_token)
        
        if not team_pipelines_response.get("success"):
            return {"success": False, "error": "No se pudieron obtener los embudos"}
        
        # Buscar el embudo Oberstaff
        oberstaff_pipeline = None
        for pipeline in team_pipelines_response.get("data", []):
            if "oberstaff" in pipeline.get("name", "").lower():
                oberstaff_pipeline = pipeline
                break
        
        if not oberstaff_pipeline:
            return {"success": False, "error": "No se encontró el embudo Oberstaff"}
        
        # Obtener todas las oportunidades del embudo Oberstaff usando el endpoint correcto
        opportunities_api_url = f"{BIGIN_API_URL}/Pipelines"
        headers = {"Authorization": f"Zoho-oauthtoken {access_token}"}
        
        fields = "Deal_Name,Stage,Amount,Account_Name,Contact_Name,Closing_Date,id,Created_Time,Modified_Time,Pipeline"
        
        params = {
            "per_page": 200,
            "fields": fields,
            "pipeline_id": oberstaff_pipeline["id"]
        }
        
        # Obtener todas las páginas de oportunidades
        all_opportunities = []
        page = 1
        more_records = True
        
        while more_records and page <= 10:  # Limitamos a 10 páginas
            params["page"] = page
            
            response = requests.get(opportunities_api_url, headers=headers, params=params)
            response.raise_for_status()
            response_data = response.json()
            
            if response_data and response_data.get("data"):
                opportunities = response_data.get("data", [])
                all_opportunities.extend(opportunities)
                
                info = response_data.get("info", {})
                more_records = info.get("more_records", False)
            else:
                more_records = False
            
            page += 1
        
        return {
            "success": True,
            "data": {
                "opportunities": all_opportunities,
                "pipeline": oberstaff_pipeline,
                "total": len(all_opportunities)
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/opportunities", response_model=ApiResponse)
async def obtener_oportunidades(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
    pipeline_id: str = Query(None, description="ID del embudo específico"),
    access_token: str = Depends(get_access_token)
):
    """Obtiene oportunidades con paginación optimizada, filtradas por embudo específico"""
    try:
        # Configurar parámetros para obtener oportunidades
        fields = "Deal_Name,Stage,Amount,Account_Name,Contact_Name,Closing_Date,id,Created_Time,Modified_Time,Pipeline"
        
        params = {
            "per_page": min(limit, 200),  # Máximo 200 según la documentación
            "page": page,
            "fields": fields
        }
        
        # Si se especifica un pipeline_id, agregarlo a los parámetros
        if pipeline_id:
            params["pipeline_id"] = pipeline_id
        
        # Obtener oportunidades usando la función optimizada
        response = await fetch_zoho_data("Pipelines", access_token, params)
        
        if not response or not response.get("data"):
            return {
                "success": True,
                "data": {
                    "opportunities": [],
                    "pipeline": {"name": "Pipeline Principal"},
                    "page": page,
                    "limit": limit,
                    "total": 0
                }
            }
        
        # Extraer información del pipeline
        opportunities = response.get("data", [])
        pipeline_info = {"name": "Pipeline Principal"}
        
        # Intentar obtener el nombre del pipeline de la primera oportunidad
        if opportunities and len(opportunities) > 0:
            first_opportunity = opportunities[0]
            if "Pipeline" in first_opportunity and first_opportunity["Pipeline"]:
                pipeline_info = {
                    "id": first_opportunity["Pipeline"].get("id"),
                    "name": first_opportunity["Pipeline"].get("name", "Pipeline Principal")
                }
        
        # Obtener información de paginación
        info = response.get("info", {})
        total = info.get("count", len(opportunities))
        more_records = info.get("more_records", False)
        
        return {
            "success": True,
            "data": {
                "opportunities": opportunities,
                "pipeline": pipeline_info,
                "page": page,
                "limit": limit,
                "total": total,
                "more_records": more_records
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/opportunities", response_model=ApiResponse)
async def crear_oportunidad(
    opportunity: OpportunityCreate,
    access_token: str = Depends(get_access_token)
):
    """Crea una nueva oportunidad en Zoho Bigin con contacto asociado"""
    try:
        headers = {
            "Authorization": f"Zoho-oauthtoken {access_token}",
            "Content-Type": "application/json"
        }
        
        contact_id = None
        
        # Paso 1: Crear el contacto si se proporciona información de contacto
        if opportunity.Account_Name:
            # Usar Account_Name como nombre del contacto si no se proporciona Contact_Name
            contact_name = opportunity.Contact_Name or opportunity.Account_Name
            
            contact_data = {
                "Last_Name": contact_name
            }
            
            # Agregar campos opcionales del contacto
            if opportunity.Contact_Email:
                contact_data["Email"] = opportunity.Contact_Email
            if opportunity.Contact_Phone:
                contact_data["Phone"] = opportunity.Contact_Phone
            
            # Crear el contacto
            contact_payload = {"data": [contact_data]}
            contact_url = f"{BIGIN_API_URL}/Contacts"
            
            print(f"Creando contacto: {contact_payload}")
            contact_response = requests.post(contact_url, headers=headers, json=contact_payload)
            
            if contact_response.status_code == 201:
                contact_result = contact_response.json()
                if contact_result.get("data") and len(contact_result["data"]) > 0:
                    contact_id = contact_result["data"][0].get("details", {}).get("id")
                    print(f"Contacto creado exitosamente con ID: {contact_id}")
                else:
                    print(f"Error: No se pudo obtener el ID del contacto creado")
            else:
                error_data = contact_response.json() if contact_response.content else {}
                print(f"Error al crear contacto: {contact_response.status_code} - {error_data}")
                return {
                    "success": False,
                    "error": f"Error al crear contacto: {contact_response.status_code} - {error_data.get('message', 'Error desconocido')}"
                }
        
        # Paso 2: Crear la oportunidad
        opportunity_data = {
            "Deal_Name": opportunity.Deal_Name
        }
        
        # Agregar campos opcionales
        if opportunity.Stage:
            opportunity_data["Stage"] = opportunity.Stage
        if opportunity.Amount is not None:
            opportunity_data["Amount"] = opportunity.Amount
        if opportunity.Closing_Date:
            opportunity_data["Closing_Date"] = opportunity.Closing_Date
        if opportunity.Pipeline:
            opportunity_data["Pipeline"] = opportunity.Pipeline
        
        # Asociar el contacto a la oportunidad si se creó exitosamente
        if contact_id:
            opportunity_data["Contact_Name"] = contact_id
            print(f"Asociando oportunidad al contacto ID: {contact_id}")
        
        # Crear la oportunidad
        opportunity_payload = {"data": [opportunity_data]}
        opportunity_url = f"{BIGIN_API_URL}/Pipelines"
        
        print(f"Creando oportunidad: {opportunity_payload}")
        opportunity_response = requests.post(opportunity_url, headers=headers, json=opportunity_payload)
        
        if opportunity_response.status_code == 201:
            opportunity_result = opportunity_response.json()
            return {
                "success": True,
                "data": {
                    "opportunity": opportunity_result.get("data", []),
                    "contact_id": contact_id
                },
                "message": "Contacto y oportunidad creados exitosamente"
            }
        else:
            error_data = opportunity_response.json() if opportunity_response.content else {}
            print(f"Error al crear oportunidad: {opportunity_response.status_code} - {error_data}")
            return {
                "success": False,
                "error": f"Error al crear oportunidad: {opportunity_response.status_code} - {error_data.get('message', 'Error desconocido')}"
            }
            
    except Exception as e:
        print(f"Error interno: {str(e)}")
        return {
            "success": False,
            "error": f"Error interno al crear oportunidad: {str(e)}"
        }

# Endpoint para obtener el conteo de suscripciones por estado
@app.get("/api/billing/subscriptions/count", response_model=ApiResponse)
async def get_subscriptions_count(access_token: str = Depends(get_access_token)):
    """Obtiene el conteo de suscripciones por estado, incluyendo premium (activas > 100)"""
    try:
        # URL de la API de Zoho Billing para suscripciones
        zoho_billing_url = "https://subscriptions.zoho.com/api/v1/subscriptions"
        headers = {"Authorization": f"Zoho-oauthtoken {access_token}"}
        
        # Inicializar contadores
        counters = {
            "total": 0,
            "live": 0,
            "non_renewing": 0,
            "cancelled": 0,
            "expired": 0,
            "trial": 0,
            "unpaid": 0,
            "other": 0,
            "premium": 0  # Nuevo contador para suscripciones premium (activas > 100)
        }
        
        # Parámetros para la primera página
        params = {
            "page": 1,
            "per_page": 200  # Máximo permitido por Zoho
        }
        
        more_pages = True
        page = 1
        max_pages = 10  # Límite de seguridad para evitar bucles infinitos
        
        while more_pages and page <= max_pages:
            try:
                response = requests.get(zoho_billing_url, headers=headers, params=params)
                response.raise_for_status()
                data = response.json()
                
                # Procesar suscripciones
                if "subscriptions" in data:
                    subscriptions = data["subscriptions"]
                    
                    # Incrementar contador total
                    counters["total"] += len(subscriptions)
                    
                    # Contar por estado
                    for subscription in subscriptions:
                        status = subscription.get("status", "").lower()
                        
                        # Incrementar contador según el estado
                        if status == "live":
                            counters["live"] += 1
                            
                            # Verificar si es premium (activa con precio > 100)
                            try:
                                amount = float(subscription.get("amount", "0").replace(",", "."))
                                if amount > 100:
                                    counters["premium"] += 1
                            except (ValueError, TypeError):
                                pass  # Ignorar errores de conversión
                                
                        elif status == "non_renewing":
                            counters["non_renewing"] += 1
                        elif status == "cancelled":
                            counters["cancelled"] += 1
                        elif status == "expired":
                            counters["expired"] += 1
                        elif status == "trial":
                            counters["trial"] += 1
                        elif status == "unpaid":
                            counters["unpaid"] += 1
                        else:
                            counters["other"] += 1
                    
                    # Verificar si hay más páginas
                    page_context = data.get("page_context", {})
                    more_pages = page_context.get("has_more_page", False)
                    
                    if more_pages:
                        page += 1
                        params["page"] = page
                    
                else:
                    more_pages = False
                    
            except Exception as e:
                print(f"Error al procesar página {page}: {str(e)}")
                more_pages = False
        
        return {"success": True, "data": counters}
        
    except Exception as e:
        print(f"Error al obtener conteo de suscripciones: {str(e)}")
        return {"success": False, "error": f"Error al obtener conteo de suscripciones: {str(e)}"}

# Punto de entrada para ejecutar la aplicación
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)