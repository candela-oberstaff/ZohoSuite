import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Subscription, Plan, SubscriptionCreate, SubscriptionUpdate } from "@/types";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import { useNavigate } from "react-router-dom";
import { 
  Loader2, Search, Plus, Eye, RefreshCw, Calendar, CreditCard, 
  BarChart, PieChart, Edit, Trash2, Play, Pause, X, Check,
  AlertTriangle, DollarSign, Users, TrendingUp
} from "lucide-react";
import { 
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, 
  Pie, Cell 
} from "recharts";
import { format, subMonths, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 12;

// Interfaz extendida para incluir información del cliente
interface SubscriptionWithCustomer extends Subscription {
  customer_name?: string;
  customer_id?: string;
}

export default function SubscriptionsPage() {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithCustomer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [plansLoading, setPlansLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE);
  const [totalPages, setTotalPages] = useState(0);
  const [totalSubscriptions, setTotalSubscriptions] = useState(0);
  const [activeSubscriptions, setActiveSubscriptions] = useState(0);
  const [premiumSubscriptions, setPremiumSubscriptions] = useState(0);
  const [nonRenewingSubscriptions, setNonRenewingSubscriptions] = useState(0);
  const [cancelledSubscriptions, setCancelledSubscriptions] = useState(0);
  const [expiredSubscriptions, setExpiredSubscriptions] = useState(0);
  const [trialSubscriptions, setTrialSubscriptions] = useState(0);
  const [unpaidSubscriptions, setUnpaidSubscriptions] = useState(0);
  const [pausedSubscriptions, setPausedSubscriptions] = useState(0);
  const [otherSubscriptions, setOtherSubscriptions] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartView, setChartView] = useState<"monthly" | "status">("monthly");
  
  // Estados para modales
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionWithCustomer | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Estados para formularios
  const [createForm, setCreateForm] = useState<SubscriptionCreate>({
    customer_id: "",
    plan_code: "",
    trial_days: 0,
    auto_collect: true
  });
  const [editForm, setEditForm] = useState<SubscriptionUpdate>({});

  const debouncedSearch = useDebounce(search, 300);

  // Resetear la página cuando cambia la búsqueda o los filtros
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);
  
  // Colores para el gráfico de estado
  const COLORS = {
    active: "#10b981", // verde
    non_renewing: "#f59e0b", // ámbar
    cancelled: "#ef4444", // rojo
    expired: "#6b7280", // gris
    unpaid: "#f97316", // naranja
    paused: "#e11d48", // rosa
    other: "#9ca3af", // gris claro
  };
  
  // Función para generar datos de gráfico por mes
  const generateMonthlyChartData = useCallback((subscriptions: SubscriptionWithCustomer[]) => {
    if (!subscriptions.length) return [];
    
    // Obtener los últimos 6 meses
    const months = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), i);
      return {
        month: format(date, 'MMM yyyy', { locale: es }),
        date: date,
        active: 0,
        cancelled: 0,
        expired: 0,
        total: 0
      };
    }).reverse();
    
    // Contar suscripciones por mes y estado
    subscriptions.forEach(sub => {
      if (sub.created_time) {
        const createdDate = parseISO(sub.created_time);
        if (isValid(createdDate)) {
          const monthIndex = months.findIndex(m => {
            return createdDate.getMonth() === m.date.getMonth() && 
                   createdDate.getFullYear() === m.date.getFullYear();
          });
          
          if (monthIndex !== -1) {
            months[monthIndex].total += 1;
            
            if (sub.status === 'live') {
              months[monthIndex].active += 1;
            } else if (sub.status === 'cancelled') {
              months[monthIndex].cancelled += 1;
            } else if (sub.status === 'expired') {
              months[monthIndex].expired += 1;
            }
          }
        }
      }
    });
    
    return months;
  }, []);

  // Función para generar datos de gráfico por estado
  const generateStatusChartData = useCallback(() => {
    return [
      { name: 'Activas', value: activeSubscriptions, color: COLORS.active },
      { name: 'No renovables', value: nonRenewingSubscriptions, color: COLORS.non_renewing },
      { name: 'Canceladas', value: cancelledSubscriptions, color: COLORS.cancelled },
      { name: 'Expiradas', value: expiredSubscriptions, color: COLORS.expired },
      { name: 'No pagadas', value: unpaidSubscriptions, color: COLORS.unpaid },
      { name: 'Pausadas', value: pausedSubscriptions, color: COLORS.paused },
      { name: 'Otras', value: otherSubscriptions, color: COLORS.other },
    ].filter(item => item.value > 0);
  }, [activeSubscriptions, nonRenewingSubscriptions, cancelledSubscriptions, expiredSubscriptions, unpaidSubscriptions, pausedSubscriptions, otherSubscriptions]);

  // Cargar contadores de suscripciones
  const loadSubscriptionCounts = useCallback(async () => {
    try {
      const response = await api.getSubscriptionsCount({ useCache: false });
      if (response.success && response.data) {
        setTotalSubscriptions(response.data.total || 0);
        setActiveSubscriptions(response.data.live || 0);
        setPremiumSubscriptions(response.data.premium || 0);
        setNonRenewingSubscriptions(response.data.non_renewing || 0);
        setCancelledSubscriptions(response.data.cancelled || 0);
        setExpiredSubscriptions(response.data.expired || 0);
        setTrialSubscriptions(response.data.trial || 0);
        setUnpaidSubscriptions(response.data.unpaid || 0);
        setPausedSubscriptions(response.data.paused || 0);
        setOtherSubscriptions(response.data.other || 0);
      }
    } catch (error) {
      console.error('Error al cargar contadores de suscripciones:', error);
    }
  }, []);

  // Cargar suscripciones
  const loadSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = {
        page: page.toString(),
        per_page: pageSize.toString()
      };
      
      // Para filtro 'paused', necesitamos obtener todas las suscripciones
      if (statusFilter === 'paused') {
        params.get_all = 'true';
      } else if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }
      

      const response = await api.getAllSubscriptions(params, { useCache: false });
      
      if (response.success && response.data) {
        setSubscriptions(response.data.items || []);
        // Calculate totalPages based on total items and page size
        const totalItems = response.data.total || 0;
        const pageSize = response.data.pageSize || ITEMS_PER_PAGE;
        const calculatedTotalPages = Math.ceil(totalItems / pageSize);
        

        
        // Use the calculated total pages or backend value, whichever is higher
        const finalTotalPages = Math.max(calculatedTotalPages, response.data.totalPages || 0);
        setTotalPages(finalTotalPages);
      } else {
        setError(response.error || 'Error al cargar suscripciones');
      }
    } catch (error) {
      console.error('Error al cargar suscripciones:', error);
      setError('Error al cargar suscripciones');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, debouncedSearch]);

  // Cargar planes
  const loadPlans = useCallback(async () => {
    try {
      setPlansLoading(true);
      const response = await api.getPlans({ status: 'active' }, { useCache: true });
      if (response.success && response.data) {
        setPlans(response.data);
      }
    } catch (error) {
      console.error('Error al cargar planes:', error);
    } finally {
      setPlansLoading(false);
    }
  }, []);

  // Efectos
  useEffect(() => {
    loadSubscriptionCounts();
    loadPlans();
  }, [loadSubscriptionCounts, loadPlans]);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  useEffect(() => {
    if (chartView === 'monthly') {
      setChartData(generateMonthlyChartData(subscriptions));
    } else {
      setChartData(generateStatusChartData());
    }
  }, [chartView, subscriptions, generateMonthlyChartData, generateStatusChartData]);

  // Funciones de gestión de suscripciones
  const handleCreateSubscription = async () => {
    try {
      setActionLoading(true);
      const response = await api.createSubscription(createForm);
      if (response.success) {
        toast.success('Suscripción creada exitosamente');
        setCreateModalOpen(false);
        setCreateForm({
          customer_id: "",
          plan_code: "",
          trial_days: 0,
          auto_collect: true
        });
        loadSubscriptions();
        loadSubscriptionCounts();
      } else {
        toast.error(response.error || 'Error al crear suscripción');
      }
    } catch (error) {
      toast.error('Error al crear suscripción');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateSubscription = async () => {
    if (!selectedSubscription) return;
    
    try {
      setActionLoading(true);
      const response = await api.updateSubscription(selectedSubscription.subscription_id, editForm);
      if (response.success) {
        toast.success('Suscripción actualizada exitosamente');
        setEditModalOpen(false);
        setSelectedSubscription(null);
        setEditForm({});
        loadSubscriptions();
      } else {
        toast.error(response.error || 'Error al actualizar suscripción');
      }
    } catch (error) {
      toast.error('Error al actualizar suscripción');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string, cancelAtEnd: boolean = false) => {
    try {
      setActionLoading(true);
      const response = await api.cancelSubscription(subscriptionId, cancelAtEnd, 'Cancelación solicitada por el usuario');
      if (response.success) {
        toast.success('Suscripción cancelada exitosamente');
        loadSubscriptions();
        loadSubscriptionCounts();
      } else {
        toast.error(response.error || 'Error al cancelar suscripción');
      }
    } catch (error) {
      toast.error('Error al cancelar suscripción');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseSubscription = async (subscriptionId: string) => {
    try {
      setActionLoading(true);
      const response = await api.pauseSubscription(subscriptionId);
      if (response.success) {
        toast.success('Suscripción pausada exitosamente');
        loadSubscriptions();
        loadSubscriptionCounts();
      } else {
        toast.error(response.error || 'Error al pausar suscripción');
      }
    } catch (error) {
      toast.error('Error al pausar suscripción');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeSubscription = async (subscriptionId: string) => {
    try {
      setActionLoading(true);
      const response = await api.resumeSubscription(subscriptionId);
      if (response.success) {
        toast.success('Suscripción reanudada exitosamente');
        loadSubscriptions();
        loadSubscriptionCounts();
      } else {
        toast.error(response.error || 'Error al reanudar suscripción');
      }
    } catch (error) {
      toast.error('Error al reanudar suscripción');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePlan = async (subscriptionId: string, newPlanCode: string) => {
    try {
      setActionLoading(true);
      const response = await api.changePlan(subscriptionId, newPlanCode, true);
      if (response.success) {
        toast.success('Plan cambiado exitosamente');
        loadSubscriptions();
      } else {
        toast.error(response.error || 'Error al cambiar plan');
      }
    } catch (error) {
      toast.error('Error al cambiar plan');
    } finally {
      setActionLoading(false);
    }
  };

  // Función para obtener el color del badge según el estado
  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'live':
      case 'active':
        return 'default';
      case 'trial':
        return 'secondary';
      case 'cancelled':
      case 'expired':
        return 'destructive';
      case 'non_renewing':
        return 'outline';
      case 'paused':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  // Función para obtener el texto del estado en español
  const getStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'live': return 'Activa';
      case 'trial': return 'Prueba';
      case 'cancelled': return 'Cancelada';
      case 'expired': return 'Expirada';
      case 'non_renewing': return 'No renovable';
      case 'paused': return 'Pausada';
      case 'unpaid': return 'No pagada';
      default: return status || 'Desconocido';
    }
  };

  // Aplicar filtrado local para estados que la API no soporta
  const filteredSubscriptions = useMemo(() => {
    if (statusFilter === 'paused') {
      return subscriptions.filter(sub => sub.status?.toLowerCase() === 'paused');
    }
    // Para otros filtros, las suscripciones ya vienen filtradas del backend
    return subscriptions;
  }, [subscriptions, statusFilter]);

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar suscripciones</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Suscripciones</h1>
          <p className="text-gray-600 mt-1">Administra y monitorea todas las suscripciones de Zoho Billing</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => {
              loadSubscriptions();
              loadSubscriptionCounts();
            }}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
            <DialogTrigger asChild>
              <Button 
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Botón Nueva Suscripción clickeado');
                  setCreateModalOpen(true);
                }}
                onMouseDown={(e) => {
                  console.log('MouseDown en botón Nueva Suscripción');
                }}
                style={{ zIndex: 9999, position: 'relative' }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nueva Suscripción
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Crear Nueva Suscripción</DialogTitle>
                <DialogDescription>
                  Completa los datos para crear una nueva suscripción.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="customer_id">ID del Cliente</Label>
                  <Input
                    id="customer_id"
                    value={createForm.customer_id}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, customer_id: e.target.value }))}
                    placeholder="Ingresa el ID del cliente"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="plan_code">Plan</Label>
                  <Select 
                    value={createForm.plan_code} 
                    onValueChange={(value) => setCreateForm(prev => ({ ...prev, plan_code: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.plan_code} value={plan.plan_code}>
                          {plan.plan_name} - ${plan.price} {plan.currency_code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="trial_days">Días de Prueba</Label>
                  <Input
                    id="trial_days"
                    type="number"
                    value={createForm.trial_days}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, trial_days: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setCreateModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="button" 
                  onClick={handleCreateSubscription}
                  disabled={actionLoading || !createForm.customer_id || !createForm.plan_code}
                >
                  {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crear Suscripción
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Suscripciones</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubscriptions.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suscripciones Activas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeSubscriptions.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suscripciones Premium</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{premiumSubscriptions.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suscripciones Vencidas</CardTitle>
            <Pause className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{pausedSubscriptions.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suscripciones Canceladas</CardTitle>
            <X className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{cancelledSubscriptions.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos y Filtros */}
      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Lista de Suscripciones</TabsTrigger>
          <TabsTrigger 
             value="analytics"
             onClick={(e) => {
               e.preventDefault();
               e.stopPropagation();
               console.log('Tab Análisis clickeado');
             }}
             onMouseDown={(e) => {
               console.log('MouseDown en tab Análisis');
             }}
             style={{ zIndex: 9999, position: 'relative' }}
           >
            Análisis
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar suscripciones..."
                  value={search}
                  onChange={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Campo de búsqueda cambiado:', e.target.value);
                    setSearch(e.target.value);
                  }}
                  onFocus={(e) => {
                    console.log('Campo de búsqueda enfocado');
                  }}
                  className="pl-10"
                  style={{ zIndex: 9999, position: 'relative' }}
                />
              </div>
            </div>
            <Select 
              value={statusFilter} 
              onValueChange={(value) => {
                console.log('Selector de estado cambiado:', value);
                setStatusFilter(value);
              }}
            >
              <SelectTrigger 
                className="w-[200px]"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('SelectTrigger clickeado');
                }}
                onMouseDown={(e) => {
                  console.log('MouseDown en SelectTrigger');
                }}
                style={{ zIndex: 9999, position: 'relative' }}
              >
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="live">Activas</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
                <SelectItem value="expired">Expiradas</SelectItem>
                <SelectItem value="paused">Pausadas</SelectItem>
                <SelectItem value="non_renewing">No renovables</SelectItem>
                <SelectItem value="unpaid">No pagadas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lista de Suscripciones */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredSubscriptions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron suscripciones</h3>
                <p className="text-gray-600">No hay suscripciones que coincidan con los filtros aplicados.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-5">
              {filteredSubscriptions.map((subscription) => (
                <Card 
                  key={subscription.subscription_id} 
                  className="group relative overflow-hidden bg-white border border-slate-200/60 hover:border-slate-300 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer backdrop-blur-sm h-[280px] flex flex-col"
                  onClick={() => navigate(`/subscriptions/${subscription.subscription_id}`)}
                >
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <CardHeader className="relative p-4 pb-3 flex-shrink-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-xs text-slate-800 leading-tight mb-2 h-8 flex items-start overflow-hidden" title={subscription.name || 'Sin nombre'}>
                          <span className="line-clamp-2">
                            {subscription.name || 'Sin nombre'}
                          </span>
                        </CardTitle>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1 h-1 rounded-full bg-slate-400" />
                          <p className="text-xs text-slate-600 font-medium truncate" title={subscription.customer_name || 'Cliente desconocido'}>
                            {subscription.customer_name || 'Cliente desconocido'}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={getStatusBadgeVariant(subscription.status)} 
                        className="shrink-0 text-xs px-2 py-1 font-medium border-0 shadow-sm"
                      >
                        {getStatusText(subscription.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="relative p-4 pt-0 flex-1 flex flex-col justify-between">
                    <div className="space-y-4">
                      {/* Plan and Pricing info */}
                      <div className="bg-slate-50/80 border border-slate-100 rounded-lg p-3 space-y-2.5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">Plan</span>
                          <span className="text-xs font-semibold text-slate-800 truncate ml-2 max-w-[120px]" title={subscription.plan_name || 'N/A'}>
                            {subscription.plan_name || 'N/A'}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">Precio</span>
                          <div className="text-right">
                            <span className="text-lg font-bold text-emerald-600">
                              ${subscription.amount}
                            </span>
                            <span className="text-xs text-slate-500 ml-1">
                              {subscription.currency_code}
                            </span>
                          </div>
                        </div>
                        
                        {subscription.next_billing_at && (
                          <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                            <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">Próximo</span>
                            <span className="text-xs font-semibold text-slate-700 bg-white px-2 py-1 rounded border">
                              {format(parseISO(subscription.next_billing_at), 'dd MMM', { locale: es })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Action button */}
                    <Button
                       size="sm"
                       variant="default"
                       className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200 border-0 mt-4 flex items-center justify-center"
                       onClick={(e) => {
                         e.stopPropagation();
                         navigate(`/subscriptions/${subscription.subscription_id}`);
                       }}
                     >
                       <Eye className="h-4 w-4 mr-2" />
                       Ver Detalles
                     </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Paginación Mejorada */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Mostrando {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, totalSubscriptions)} de {totalSubscriptions} suscripciones</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(1)}
                  disabled={page === 1 || loading}
                  className="hidden sm:flex"
                >
                  Primera
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1 || loading}
                >
                  Anterior
                </Button>
                
                <div className="flex items-center gap-1">
                  {/* Páginas visibles */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        disabled={loading}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages || loading}
                >
                  Siguiente
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages || loading}
                  className="hidden sm:flex"
                >
                  Última
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Por página:</span>
                <Select value={pageSize.toString()} onValueChange={(value) => {
                  setPageSize(parseInt(value));
                  setPage(1);
                }}>
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12</SelectItem>
                    <SelectItem value="24">24</SelectItem>
                    <SelectItem value="48">48</SelectItem>
                    <SelectItem value="96">96</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Tendencia de Suscripciones</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={chartView === 'monthly' ? 'default' : 'outline'}
                      onClick={() => setChartView('monthly')}
                    >
                      <BarChart className="h-4 w-4 mr-1" />
                      Mensual
                    </Button>
                    <Button
                      size="sm"
                      variant={chartView === 'status' ? 'default' : 'outline'}
                      onClick={() => setChartView('status')}
                    >
                      <PieChart className="h-4 w-4 mr-1" />
                      Estados
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {chartLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : chartView === 'monthly' ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="total" fill="#3b82f6" name="Total" />
                      <Bar dataKey="active" fill="#10b981" name="Activas" />
                      <Bar dataKey="cancelled" fill="#ef4444" name="Canceladas" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Resumen por Estado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Activas</span>
                    <span className="text-sm text-green-600 font-bold">{activeSubscriptions}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">No renovables</span>
                    <span className="text-sm text-yellow-600 font-bold">{nonRenewingSubscriptions}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Canceladas</span>
                    <span className="text-sm text-red-600 font-bold">{cancelledSubscriptions}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Expiradas</span>
                    <span className="text-sm text-gray-600 font-bold">{expiredSubscriptions}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">En prueba</span>
                    <span className="text-sm text-blue-600 font-bold">{trialSubscriptions}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">No pagadas</span>
                    <span className="text-sm text-orange-600 font-bold">{unpaidSubscriptions}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Pausadas</span>
                    <span className="text-sm text-cyan-600 font-bold">{pausedSubscriptions}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Otras</span>
                    <span className="text-sm text-gray-400 font-bold">{otherSubscriptions}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de Edición */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Suscripción</DialogTitle>
            <DialogDescription>
              Modifica los datos de la suscripción seleccionada.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit_plan_code">Plan</Label>
              <Select 
                value={editForm.plan_code} 
                onValueChange={(value) => setEditForm(prev => ({ ...prev, plan_code: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.plan_code} value={plan.plan_code}>
                      {plan.plan_name} - ${plan.price} {plan.currency_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_quantity">Cantidad</Label>
              <Input
                id="edit_quantity"
                type="number"
                value={editForm.quantity || 1}
                onChange={(e) => setEditForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                placeholder="1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setEditModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={handleUpdateSubscription}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Actualizar Suscripción
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}