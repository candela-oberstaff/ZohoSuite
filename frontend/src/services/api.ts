import type { ApiResponse, Contact, Opportunity, PaginatedResponse, PaginationParams, Module, TeamPipeline, CandidatesApiResponse, CandidateDetail } from '../types';

const API_BASE_URL = 'http://localhost:8000/api';

// Caché simple para almacenar respuestas
type CacheEntry<T> = {
  data: ApiResponse<T>;
  timestamp: number;
  key: string;
};

const cache = new Map<string, CacheEntry<any>>();
const CACHE_DURATION = 60 * 1000; // 1 minuto en milisegundos

// Función para generar una clave de caché basada en la URL y los parámetros
function generateCacheKey(url: string, params?: Record<string, any>): string {
  return `${url}${params ? `?${new URLSearchParams(params as any).toString()}` : ''}`;
}



async function fetchWithErrorHandling<T>(
  url: string, 
  params?: Record<string, any>, 
  options?: { 
    useCache?: boolean; 
    cacheDuration?: number;
  }
): Promise<ApiResponse<T>> {
  const useCache = options?.useCache !== false;
  const cacheDuration = options?.cacheDuration || CACHE_DURATION;
  
  const cacheKey = generateCacheKey(url, params);
    
    // Verificar si tenemos una respuesta en caché válida
    if (useCache) {
      const cachedResponse = cache.get(cacheKey);
      const now = Date.now();
      
      if (cachedResponse && (now - cachedResponse.timestamp) < cacheDuration) {
        console.log('Usando datos en caché para:', cacheKey);
        return cachedResponse.data as ApiResponse<T>;
      }
    }
    
    // Si no hay caché o está expirada, hacer la petición
    const queryString = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    console.log(`Fetching: ${url}${queryString}`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 15 segundos de timeout para peticiones más lentas
      
      const response = await fetch(`${url}${queryString}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json() as ApiResponse<T>;
      
      // Log para debugging
      console.log('API Response:', {
        url: `${url}${queryString}`,
        status: response.status,
        success: data.success,
        hasData: !!data.data,
        error: data.error
      });
      
      // Guardar en caché si es exitoso
      if (useCache && data.success) {
        cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          key: cacheKey
        });
      }
      
      return data;
    } catch (error) {
      console.error('Error en la petición API:', {
        url: `${url}${queryString}`,
        error: error,
        message: error instanceof Error ? error.message : 'Error desconocido'
      });
    
      if (error instanceof DOMException && error.name === 'AbortError') {
        return {
          success: false,
          error: 'La solicitud tardó demasiado tiempo en completarse.'
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

// Función para realizar peticiones POST
async function postWithErrorHandling<T>(
  url: string,
  data: any
): Promise<ApiResponse<T>> {
  try {
    console.log(`Iniciando POST a ${url} con datos:`, data);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`Timeout alcanzado para la solicitud a ${url}`);
      controller.abort();
    }, 30000); // 30 second timeout (reducido de 60s)

    console.log(`Enviando solicitud POST a ${url}...`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    console.log(`Respuesta recibida de ${url}, status:`, response.status, response.statusText);

    const responseText = await response.text();
    console.log(`Texto de respuesta recibido (${responseText.length} caracteres):`, responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));
    
    let responseData;
    
    try {
      responseData = JSON.parse(responseText) as ApiResponse<T>;
      console.log(`Datos de respuesta parseados:`, responseData);
    } catch (parseError) {
      console.error('Error al parsear la respuesta JSON:', parseError);
      console.log('Texto de respuesta recibido completo:', responseText);
      return {
        success: false,
        error: `Error al procesar la respuesta del servidor: ${parseError}. Texto recibido: ${responseText.substring(0, 100)}`,
      };
    }

    if (!response.ok) {
      console.error(`Error en respuesta HTTP: ${response.status} ${response.statusText}`, responseData);
      return {
        success: false,
        error: responseData?.error || `Error HTTP: ${response.status} ${response.statusText}`,
      };
    }
    
    // Verificar explícitamente si la respuesta indica éxito
    if (responseData && responseData.success === false) {
      console.error('La respuesta indica fallo aunque el status HTTP es OK:', responseData);
      return responseData; // Devolver la respuesta con success=false y el error
    }
    
    console.log('POST Response exitosa:', {
      url,
      status: response.status,
      success: responseData?.success,
      hasData: !!responseData?.data,
      error: responseData?.error
    });
    
    return responseData;
  } catch (error) {
    console.error('Error en solicitud POST:', error);
    
    // Manejar específicamente errores de timeout/abort
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        success: false,
        error: `La solicitud a ${url} excedió el tiempo de espera. Por favor, inténtelo de nuevo.`,
      };
    }
    
    return {
      success: false,
      error: error instanceof Error 
        ? `Error de conexión: ${error.message}` 
        : 'Error desconocido al conectar con el servidor',
    };
  }
}

// Función para realizar peticiones PUT
async function putWithErrorHandling<T>(
  url: string,
  data: any
): Promise<ApiResponse<T>> {
  try {
    console.log(`Updating with PUT: ${url}`, data);
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const responseData = await response.json() as ApiResponse<T>;
    
    console.log('PUT Response:', {
      url,
      status: response.status,
      success: responseData.success,
      hasData: !!responseData.data,
      error: responseData.error
    });
    
    return responseData;
  } catch (error) {
    console.error('Error en la petición PUT:', {
      url,
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

// Función para realizar peticiones DELETE
async function deleteWithErrorHandling(
  url: string
): Promise<ApiResponse<any>> {
  try {
    console.log(`Deleting with DELETE: ${url}`);
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const responseData = await response.json() as ApiResponse<any>;
    
    console.log('DELETE Response:', {
      url,
      status: response.status,
      success: responseData.success,
      error: responseData.error
    });
    
    return responseData;
  } catch (error) {
    console.error('Error en la petición DELETE:', {
      url,
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

export const api = {
  getContacts: (params?: PaginationParams, options?: { useCache?: boolean }) => 
    fetchWithErrorHandling<PaginatedResponse<Contact>>(`${API_BASE_URL}/contactos`, params, options),
  
  getContactById: (contactId: string, options?: { useCache?: boolean }) => 
    fetchWithErrorHandling<Contact>(`${API_BASE_URL}/contactos/${contactId}`, undefined, options),

  // Funciones para empresas/cuentas
  getCompanies: (params?: PaginationParams, options?: { useCache?: boolean }) => 
    fetchWithErrorHandling<PaginatedResponse<Company>>(`${API_BASE_URL}/companies`, params, options),
  
  getCompanyById: (companyId: string, options?: { useCache?: boolean }) => 
    fetchWithErrorHandling<Company>(`${API_BASE_URL}/companies/${companyId}`, undefined, options),
  
  createCompany: (companyData: CompanyCreate) => 
    postWithErrorHandling<Company>(`${API_BASE_URL}/companies`, companyData),
  
  updateCompany: (id: string, companyData: Partial<CompanyCreate>) => 
    putWithErrorHandling<Company>(`${API_BASE_URL}/companies/${id}`, companyData),
  
  deleteCompany: (id: string) => 
    deleteWithErrorHandling(`${API_BASE_URL}/companies/${id}`),
  
  getPipelines: (pipelineId?: string) => {
    const url = pipelineId 
      ? `${API_BASE_URL}/pipelines?pipeline_id=${pipelineId}` 
      : `${API_BASE_URL}/pipelines`;
    return fetchWithErrorHandling<Opportunity[]>(url);
  },
  
  // Nueva función para obtener oportunidades automáticamente
  getOpportunities: (params?: PaginationParams, options?: { useCache?: boolean }) => 
    fetchWithErrorHandling<{ opportunities: Opportunity[], pipeline?: { name: string } }>(`${API_BASE_URL}/opportunities`, params, options),
  
  // Función específica para obtener oportunidades del embudo Oberstaff
  getOberstaffOpportunities: (options?: { useCache?: boolean }) => 
    fetchWithErrorHandling<{ opportunities: Opportunity[], pipeline: { id: string, name: string }, total: number }>(`${API_BASE_URL}/oberstaff-pipeline`, undefined, options),
    
  // Función específica para obtener oportunidades del embudo Empresas y Productos
  getEmpresasProductosOpportunities: (options?: { useCache?: boolean }) => 
    fetchWithErrorHandling<{ opportunities: Opportunity[], pipeline: { id: string, name: string }, total: number }>(`${API_BASE_URL}/empresas-productos-pipeline`, undefined, options),
    
  // Función para obtener una oportunidad específica por ID
  getOpportunityById: (id: string, options?: { useCache?: boolean }) => 
    fetchWithErrorHandling<Opportunity>(`${API_BASE_URL}/opportunities/${id}`, undefined, options),
  
  getModules: () => fetchWithErrorHandling<Module[]>(`${API_BASE_URL}/modulos`),
  
  getTeamPipelines: () => fetchWithErrorHandling<TeamPipeline[]>(`${API_BASE_URL}/team-pipelines`),
  
  // Nueva función para obtener los metadatos de campos de pipeline, incluyendo stages
  getPipelineFields: (options?: { useCache?: boolean }) => 
    fetchWithErrorHandling<{ data: { pipeline_id: string, pipeline_name: string, stages: any[], stage_field: any } }>(`${API_BASE_URL}/pipeline-fields`, undefined, options),
  
  // Nueva función para obtener los metadatos de campos del pipeline Empresas y Productos
  getEmpresasProductosPipelineFields: (options?: { useCache?: boolean }) => 
    fetchWithErrorHandling<{ data: { pipeline_id: string, pipeline_name: string, stages: any[], stage_field: any } }>(`${API_BASE_URL}/empresas-productos-pipeline-fields`, undefined, options),
  
  // Nueva función para crear oportunidades
  createOpportunity: (opportunityData: {
    Deal_Name: string;
    Stage?: string;
    Amount?: number;
    Closing_Date?: string;
    Account_Name?: string;
    Pipeline?: string;
  }) => 
    postWithErrorHandling<any>(`${API_BASE_URL}/opportunities`, opportunityData),
    
  // Función para actualizar oportunidades existentes
  updateOpportunity: (id: string, opportunityData: {
    Deal_Name?: string;
    Stage?: string;
    Amount?: number;
    Closing_Date?: string;
    Account_Name?: string;
    Pipeline?: string;
    Contact_Name?: string;
  }) => 
    putWithErrorHandling<any>(`${API_BASE_URL}/opportunities/${id}`, opportunityData),
  
  // Funciones para Zoho Billing - Clientes
  getCustomers: (params?: PaginationParams, options?: { useCache?: boolean }) => 
    fetchWithErrorHandling<PaginatedResponse<Customer>>(`${API_BASE_URL}/billing/customers`, params, options),
  
  getCustomerById: (customerId: string, options?: { useCache?: boolean }) => 
    fetchWithErrorHandling<Customer>(`${API_BASE_URL}/billing/customers/${customerId}`, undefined, options),
  
  createCustomer: (customerData: CustomerCreate) => 
    postWithErrorHandling<Customer>(`${API_BASE_URL}/billing/customers`, customerData),
  
  updateCustomer: (id: string, customerData: Partial<CustomerCreate>) => 
    putWithErrorHandling<Customer>(`${API_BASE_URL}/billing/customers/${id}`, customerData),
    
  // Nueva función para obtener el total real de clientes
  getCustomersCount: (options?: { useCache?: boolean }) => 
    fetchWithErrorHandling<{ total: number }>(`${API_BASE_URL}/billing/customers/count`, undefined, options),
    
  // Función para obtener el total de clientes activos (con al menos una suscripción activa)
  getActiveCustomersCount: (options?: { useCache?: boolean }) => 
    fetchWithErrorHandling<{ active_customers_count: number, total_customers: number, total_active_subscriptions: number }>(`${API_BASE_URL}/billing/customers/active/count`, undefined, options),
    
  // Función para forzar la actualización de la caché de clientes activos
  refreshActiveCustomersCache: () => 
    fetchWithErrorHandling<{ active_customers_count: number, total_customers: number, refreshed: boolean, synced_with_zoho?: boolean }>(`${API_BASE_URL}/billing/customers/active/refresh`, undefined, { useCache: false }),
    
  // Nueva función para obtener las transacciones de un cliente
  getCustomerTransactions: (customerId: string, filterBy?: string, options?: { useCache?: boolean }) => {
    const params: Record<string, string> = { customer_id: customerId };
    if (filterBy) params.filter_by = filterBy;
    return fetchWithErrorHandling<Transaction[]>(`${API_BASE_URL}/billing/transactions`, params, options);
  },
  
  // Funciones para obtener suscripciones
  getCustomerSubscriptions: (customerId: string, options?: { useCache?: boolean }) => {
    const params: Record<string, string> = { customer_id: customerId };
    return fetchWithErrorHandling<Subscription[]>(`${API_BASE_URL}/billing/subscriptions`, params, options);
  },
  
  getSubscriptionById: (subscriptionId: string, options?: { useCache?: boolean }) => 
    fetchWithErrorHandling<Subscription>(`${API_BASE_URL}/billing/subscriptions/${subscriptionId}`, undefined, options),
    
  // Función para obtener detalles completos del cliente (incluyendo suscripciones y transacciones)
  getCustomerDetailById: (customerId: string, options?: { useCache?: boolean }) => 
    fetchWithErrorHandling<CustomerDetailData>(`${API_BASE_URL}/billing/customers/${customerId}?detail=true`, undefined, options),

  // Función para crear un cliente a partir de una oportunidad y enviar enlace de actualización de datos bancarios
  createCustomerFromOpportunity: (opportunityId: string) => 
    postWithErrorHandling<{ customer_id: string, message: string }>(`${API_BASE_URL}/billing/customers/from-opportunity/${opportunityId}`, {}),

  // Función para generar un enlace de actualización de datos bancarios para un cliente
  generatePaymentMethodUpdateLink: (customerId: string) => 
    postWithErrorHandling<{ url: string, expires_at: string }>(`${API_BASE_URL}/billing/customers/${customerId}/payment-method-link`, {}),
    
  // Nueva función para obtener todas las suscripciones con información del cliente
  getAllSubscriptions: (params?: PaginationParams & { status?: string }, options?: { useCache?: boolean }) => {
    // Siempre agregar get_all=true para obtener el conteo correcto
    const allParams = { ...params, get_all: 'true' };
    return fetchWithErrorHandling<PaginatedResponse<Subscription>>(`${API_BASE_URL}/billing/subscriptions/all`, allParams, options);
  },
    
  // Función para obtener el conteo de suscripciones por estado
  getSubscriptionsCount: (options?: { useCache?: boolean }) => 
    fetchWithErrorHandling<{ total: number, live: number, non_renewing: number, cancelled: number, expired: number, trial: number, unpaid: number, other: number, premium: number }>(`${API_BASE_URL}/billing/subscriptions/count`, undefined, options),

  // Nuevas funciones para gestión de suscripciones
  createSubscription: (subscriptionData: {
    customer_id: string;
    plan_code: string;
    trial_days?: number;
    coupon_code?: string;
    auto_collect?: boolean;
    [key: string]: any;
  }) => 
    postWithErrorHandling<Subscription>(`${API_BASE_URL}/billing/subscriptions`, subscriptionData),

  updateSubscription: (subscriptionId: string, updateData: {
    plan_code?: string;
    quantity?: number;
    auto_collect?: boolean;
    [key: string]: any;
  }) => 
    putWithErrorHandling<Subscription>(`${API_BASE_URL}/billing/subscriptions/${subscriptionId}`, updateData),

  cancelSubscription: (subscriptionId: string, cancelAtEnd: boolean = false, reason?: string) => {
    const params: Record<string, string> = { cancel_at_end: cancelAtEnd.toString() };
    if (reason) params.reason = reason;
    return postWithErrorHandling<{ message: string }>(`${API_BASE_URL}/billing/subscriptions/${subscriptionId}/cancel?${new URLSearchParams(params).toString()}`, {});
  },

  pauseSubscription: (subscriptionId: string) => 
    postWithErrorHandling<{ message: string }>(`${API_BASE_URL}/billing/subscriptions/${subscriptionId}/pause`, {}),

  resumeSubscription: (subscriptionId: string) => 
    postWithErrorHandling<{ message: string }>(`${API_BASE_URL}/billing/subscriptions/${subscriptionId}/resume`, {}),

  changePlan: (subscriptionId: string, planCode: string, prorate: boolean = true) => 
    postWithErrorHandling<Subscription>(`${API_BASE_URL}/billing/subscriptions/${subscriptionId}/change-plan`, {
      plan_code: planCode,
      prorate: prorate
    }),

  // Funciones para gestión de planes
  getPlans: (params?: { status?: string; page?: string; per_page?: string }, options?: { useCache?: boolean }) => 
    fetchWithErrorHandling<Plan[]>(`${API_BASE_URL}/billing/plans`, params, options),

  getPlanByCode: (planCode: string, options?: { useCache?: boolean }) => 
    fetchWithErrorHandling<Plan>(`${API_BASE_URL}/billing/plans/${planCode}`, undefined, options),

  createPlan: (planData: {
    plan_code: string;
    plan_name: string;
    description?: string;
    price: number;
    currency_code?: string;
    interval: number;
    interval_unit: string;
    trial_period?: number;
    trial_period_unit?: string;
    setup_fee?: number;
    [key: string]: any;
  }) => 
    postWithErrorHandling<Plan>(`${API_BASE_URL}/billing/plans`, planData),

  updatePlan: (planCode: string, updateData: {
    plan_name?: string;
    description?: string;
    price?: number;
    trial_period?: number;
    trial_period_unit?: string;
    setup_fee?: number;
    [key: string]: any;
  }) => 
    putWithErrorHandling<Plan>(`${API_BASE_URL}/billing/plans/${planCode}`, updateData),

  // Funciones para el módulo de reclutamiento
  getRecruitmentDashboard: (options?: { useCache?: boolean }) => 
    fetchWithErrorHandling<{
      total_candidates: number;
      total_positions: number;
      total_assessments: number;
      recent_candidates: any[];
      recent_assessments: any[];
    }>(`${API_BASE_URL}/recruitment/dashboard`, undefined, options),

  getCandidates: (params?: PaginationParams, options?: { useCache?: boolean }) => 
    fetchWithErrorHandling<any[]>(`${API_BASE_URL}/recruitment/candidates`, params, options),

  getCandidateById: (candidateId: string, options?: { useCache?: boolean }) => 
    fetchWithErrorHandling<any>(`${API_BASE_URL}/recruitment/candidates/${candidateId}`, undefined, options),

  createCandidate: (candidateData: {
    name: string;
    email: string;
    phone?: string;
    [key: string]: any;
  }) => 
    postWithErrorHandling<any>(`${API_BASE_URL}/recruitment/candidates`, candidateData),

  getPositions: (options?: { useCache?: boolean }) => 
    fetchWithErrorHandling<any[]>(`${API_BASE_URL}/recruitment/positions`, undefined, options),

  createPosition: (positionData: {
    title: string;
    description?: string;
    requirements?: string;
    [key: string]: any;
  }) => 
    postWithErrorHandling<any>(`${API_BASE_URL}/recruitment/positions`, positionData),

  getAssessments: (options?: { useCache?: boolean }) => 
    fetchWithErrorHandling<any[]>(`${API_BASE_URL}/recruitment/assessments`, undefined, options),

  getCandidateResults: (candidateId: string, options?: { useCache?: boolean }) => 
    fetchWithErrorHandling<any[]>(`${API_BASE_URL}/recruitment/candidates/${candidateId}/results`, undefined, options),

  // Función para obtener candidatos de Intelliscreen
  getIntelliscreenCandidates: (page: number = 1, options?: { useCache?: boolean }) => 
    fetchWithErrorHandling<CandidatesApiResponse>(`${API_BASE_URL}/intelliscreen/candidates`, { page: page.toString() }, options),

  // Función para obtener el detalle de un candidato de Intelliscreen
  getIntelliscreenCandidateDetail: (candidateId: string, options?: { useCache?: boolean }) => 
    fetchWithErrorHandling<CandidateDetail>(`${API_BASE_URL}/recruitment/candidates/${candidateId}/detail`, undefined, options)
};
