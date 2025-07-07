import { useState, useEffect, useCallback } from "react";
import { Customer } from "@/types";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import { useNavigate } from "react-router-dom";
import { Loader2, Search, Mail, Phone, User, X, Plus, Eye, Building, Globe, Users, RefreshCw } from "lucide-react";

const ITEMS_PER_PAGE = 12;

export default function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE); // Definir pageSize como estado
  const [totalPages, setTotalPages] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [activeCustomers, setActiveCustomers] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [loadingActiveCount, setLoadingActiveCount] = useState(false);
  const [refreshingCache, setRefreshingCache] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  // Resetear la página cuando cambia la búsqueda
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Función para obtener el total real de clientes
  const fetchTotalCustomers = useCallback(async () => {
    setLoadingCount(true);
    try {
      const response = await api.getCustomersCount();
      if (response.data?.total !== undefined) {
        setTotalCustomers(response.data.total);
      }
    } catch (err) {
      console.error('Error al obtener el total de clientes:', err);
      // No mostramos error al usuario, seguimos usando el total estimado
    } finally {
      setLoadingCount(false);
    }
  }, []);

  // Función para obtener el total de clientes activos y suscripciones activas
  const fetchActiveCustomers = useCallback(async () => {
    setLoadingActiveCount(true);
    try {
      const response = await api.getActiveCustomersCount();
      if (response.data?.active_customers_count !== undefined) {
        setActiveCustomers(response.data.active_customers_count);
      }
      // Actualizar también el total de clientes con el total de suscripciones activas
      if (response.data?.total_active_subscriptions !== undefined) {
        setTotalCustomers(response.data.total_active_subscriptions);
      }
    } catch (err) {
      console.error('Error al obtener el total de clientes activos:', err);
      // No mostramos error al usuario
    } finally {
      setLoadingActiveCount(false);
    }
  }, []);
  
  // Función para forzar la actualización de la caché de clientes activos
  const handleRefreshCache = useCallback(async () => {
    setRefreshingCache(true);
    try {
      // Forzar la actualización de la caché en el backend
      const response = await api.refreshActiveCustomersCache();
      
      if (response.success && response.data) {
        // Actualizar los valores con los datos recibidos del backend
        setActiveCustomers(response.data.active_customers_count);
        
        // Obtener el total de suscripciones activas en lugar del total de clientes
        // Necesitamos hacer una llamada adicional para obtener este dato
        try {
          const activeCountResponse = await api.getActiveCustomersCount({ useCache: false });
          if (activeCountResponse.data?.total_active_subscriptions !== undefined) {
            setTotalCustomers(activeCountResponse.data.total_active_subscriptions);
          }
        } catch (err) {
          console.error('Error al obtener el total de suscripciones activas:', err);
        }
        
        console.log('Datos sincronizados con Zoho Billing:', response.data);
        
        // Mostrar mensaje específico si se sincronizó con Zoho Billing
        if (response.data.synced_with_zoho) {
          toast.success('Datos sincronizados correctamente con Zoho Billing');
        } else {
          toast.success('Datos actualizados correctamente');
        }
      } else {
        console.error('Error al sincronizar los contadores con Zoho Billing:', response.error);
        toast.error('Error al sincronizar datos');
      }
    } catch (err) {
      console.error('Error al sincronizar los contadores con Zoho Billing:', err);
      toast.error('Error al sincronizar datos');
    } finally {
      setRefreshingCache(false);
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching customers with params:', { page, pageSize, search: debouncedSearch });
      const response = await api.getCustomers({
        page,
        pageSize,
        search: debouncedSearch,
      });
      
      console.log('API Response:', response);
      
      // Determinar dónde están los datos de clientes en la respuesta
      let customersData = [];
      if (response.data?.items) {
        customersData = response.data.items;
      } else if (response.data?.customers) {
        customersData = response.data.customers;
      } else if (Array.isArray(response.data)) {
        customersData = response.data;
      }
      
      setCustomers(customersData);
      
      // Determinar el total de clientes (estimado)
      let total = 0;
      if (response.meta?.total !== undefined) {
        total = response.meta.total;
      } else if (response.data?.total !== undefined) {
        total = response.data.total;
      } else {
        // Estimar el total basado en la información de paginación
        const currentPage = response.meta?.page || page;
        const itemsPerPage = response.meta?.per_page || pageSize;
        const hasMorePage = response.meta?.has_more_page;
        
        total = customersData.length + (currentPage - 1) * itemsPerPage;
        if (hasMorePage) {
          total += itemsPerPage; // Estimación aproximada si hay más páginas
        }
      }
      
      // Solo actualizamos el total estimado si no tenemos el total real
      // y no estamos cargando el total real actualmente
      if (!totalCustomers && !loadingCount) {
        setTotalCustomers(total);
      }
      
      // Calcular el total de páginas
      const calculatedTotalPages = Math.max(1, Math.ceil(total / pageSize));
      setTotalPages(calculatedTotalPages);
      
      // Solo obtenemos el total real una vez, cuando cargamos la primera página
      // y no estamos ya cargando el total
      if (page === 1 && !loadingCount && !totalCustomers) {
        fetchTotalCustomers();
      }
      
      // También obtenemos el total de clientes activos
      if (page === 1 && !loadingActiveCount && !activeCustomers) {
        fetchActiveCustomers();
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Error al cargar los clientes. Por favor, inténtalo de nuevo.');
      setCustomers([]);
      setTotalCustomers(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, loadingCount, totalCustomers, loadingActiveCount, activeCustomers, fetchTotalCustomers, fetchActiveCustomers]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Eliminamos el efecto de depuración que podría causar re-renderizaciones

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Building className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">
                Clientes
              </h1>
              <p className="text-sm text-gray-600">
                Gestiona tus clientes de Zoho Billing
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate('/customers/create')} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Cliente
            </Button>
            <div className="flex gap-4 items-center">
              <div className="text-right">
                <p className="text-xs text-gray-500">Total de Suscripciones Activas</p>
                <p className="text-xl font-semibold text-blue-600">
                  {loadingCount || refreshingCache ? <Loader2 className="h-5 w-5 animate-spin inline" /> : (totalCustomers > 0 ? totalCustomers : '0')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Clientes Activos</p>
                <p className="text-xl font-semibold text-green-600">
                  {loadingActiveCount || refreshingCache ? 
                    <Loader2 className="h-5 w-5 animate-spin inline" /> : 
                    (activeCustomers > 0 ? activeCustomers : '0')}
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="flex items-center gap-1 ml-2 h-8" 
                onClick={handleRefreshCache} 
                disabled={refreshingCache || loadingActiveCount || loadingCount}
                title="Sincronizar contadores con Zoho"
              >
                {refreshingCache ? 
                  <Loader2 className="h-4 w-4 animate-spin" /> : 
                  <RefreshCw className="h-4 w-4" />}
                <span className="text-xs">Sincronizar</span>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Información sobre los datos disponibles */}
        <div className="bg-blue-100 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Información disponible de los clientes:</h3>
          <ul className="text-xs text-blue-800 space-y-1 ml-4 list-disc">
            <li>Datos básicos: nombre, correo, teléfono, sitio web</li>
            <li>Estado del cliente: activo/inactivo (campo <code className="bg-blue-200 px-1 rounded">status</code>)</li>
            <li>Información de facturación: dirección, moneda</li>
            <li>Fecha de creación y última modificación</li>
            <li>Notas adicionales</li>
          </ul>
          <p className="text-xs text-blue-800 mt-2">Para ver todos los detalles, haz clic en cualquier cliente.</p>
        </div>
      </div>
        
        {/* Search Section */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar clientes por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-10 bg-white border-gray-300"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400 hover:text-gray-600"
                onClick={() => setSearch('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-center gap-2 text-destructive">
            <div className="rounded-full bg-destructive/20 p-1">
              <X className="h-4 w-4" />
            </div>
            <p className="font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: pageSize }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-5 w-32" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-full" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-gray-50 rounded-lg border border-border p-8">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Building className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2 dark:text-white">No se encontraron clientes</h3>
          <p className="text-muted-foreground dark:text-gray-300 max-w-md">
            {debouncedSearch ? 
              `No hay resultados para "${debouncedSearch}". Intenta con otro término de búsqueda.` : 
              'No hay clientes disponibles en este momento.'}
          </p>
          {debouncedSearch && (
            <Button 
              className="mt-6"
              variant="secondary"
              onClick={() => setSearch('')}
            >
              <X className="h-4 w-4 mr-2" />
              Limpiar búsqueda
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Grid de clientes moderno */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {customers.map((customer) => (
              <Card key={customer.customer_id} className="group relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-300 hover:shadow-lg hover:shadow-blue-100 dark:hover:shadow-blue-900/20 cursor-pointer transform hover:-translate-y-1">
                <div className="p-3">
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between min-w-0">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                          <Building className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-sm text-gray-800 group-hover:text-blue-600 transition-colors duration-200 truncate">
                            {customer.display_name || 'Sin nombre'}
                          </h3>
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 hover:bg-blue-50 border border-blue-200 shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customers/${customer.customer_id}`);
                          }}
                        >
                          <Eye className="h-3 w-3 text-blue-600" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-1" onClick={() => navigate(`/customers/${customer.customer_id}`)}>
                      {customer.email && (
                        <div className="flex items-center gap-1.5 text-gray-600 min-w-0">
                          <Mail className="h-3 w-3 text-blue-600 flex-shrink-0" />
                          <span className="text-xs truncate min-w-0 flex-1" title={customer.email}>{customer.email}</span>
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-1.5 text-gray-600 min-w-0">
                          <Phone className="h-3 w-3 text-blue-600 flex-shrink-0" />
                          <span className="text-xs truncate min-w-0 flex-1" title={customer.phone}>{customer.phone}</span>
                        </div>
                      )}
                      {customer.website && (
                        <div className="flex items-center gap-1.5 text-gray-600 min-w-0">
                          <Globe className="h-3 w-3 text-blue-600 flex-shrink-0" />
                          <span className="text-xs truncate min-w-0 flex-1" title={customer.website}>{customer.website}</span>
                        </div>
                      )}
                      {customer.status && (
                        <div className="flex items-center gap-1.5 text-gray-600 min-w-0 mt-1">
                          <div className={`h-2 w-2 rounded-full flex-shrink-0 ${customer.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                          <span className="text-xs capitalize">
                            {customer.status === 'active' ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination Section */}
          <div className="mt-10 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  Mostrando <span className="font-semibold text-blue-600">{(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalCustomers)}</span> de <span className="font-semibold text-blue-600">{totalCustomers || 0}</span> clientes
                </p>
              </div>

              {/* Siempre mostrar los controles de paginación, incluso si solo hay una página */}
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  className="gap-2 min-w-[100px] bg-white hover:bg-blue-50 border-blue-200 text-blue-700"
                >
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Anterior
                </Button>
                
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                  {/* Generar botones de página dinámicamente */}
                  {Array.from({ length: Math.min(4, totalPages) }).map((_, i) => {
                    // Calcular qué páginas mostrar basado en la página actual
                    let pageNum;
                    if (totalPages <= 4) {
                      // Si hay 4 o menos páginas, mostrarlas todas
                      pageNum = i + 1;
                    } else if (page <= 2) {
                      // Si estamos en las primeras páginas
                      pageNum = i + 1;
                    } else if (page >= totalPages - 1) {
                      // Si estamos en las últimas páginas
                      pageNum = totalPages - 3 + i;
                    } else {
                      // Si estamos en el medio, mostrar la página actual en el centro
                      pageNum = page - 1 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === page ? "default" : "ghost"}
                        size="sm"
                        className={pageNum === page 
                          ? `w-10 h-10 p-0 rounded-lg font-semibold transition-all duration-200 bg-blue-600 text-white shadow-md hover:bg-blue-700`
                          : `w-10 h-10 p-0 rounded-lg font-semibold transition-all duration-200 text-gray-600 hover:bg-white hover:text-blue-600`
                        }
                        onClick={() => pageNum !== page && setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages || totalPages === 0}
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  className="gap-2 min-w-[100px] bg-white hover:bg-blue-50 border-blue-200 text-blue-700"
                >
                  Siguiente
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}