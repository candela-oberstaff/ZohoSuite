import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Subscription, Plan, SubscriptionUpdate } from "@/types";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, Edit, Play, Pause, X, Check, RefreshCw, Calendar, 
  CreditCard, User, Building, Mail, Phone, MapPin, DollarSign,
  Clock, AlertTriangle, FileText, Download, Eye, Settings,
  Receipt, CheckCircle, Repeat
} from "lucide-react";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

interface SubscriptionWithCustomer extends Subscription {
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
}

export default function SubscriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [subscription, setSubscription] = useState<SubscriptionWithCustomer | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para modales
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [changePlanModalOpen, setChangePlanModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  
  // Estados para formularios
  const [editForm, setEditForm] = useState<SubscriptionUpdate>({});
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [cancelReason, setCancelReason] = useState<string>("");
  const [cancelAtEnd, setCancelAtEnd] = useState<boolean>(false);

  // Cargar detalles de la suscripción
  const loadSubscription = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.getSubscriptionById(id);
      if (response.success && response.data) {
        setSubscription(response.data);
        setEditForm({
          plan_code: response.data.plan_code,
          quantity: response.data.quantity || 1,
          auto_collect: response.data.auto_collect
        });
      } else {
        setError(response.error || 'Error al cargar la suscripción');
      }
    } catch (error) {
      console.error('Error al cargar suscripción:', error);
      setError('Error al cargar la suscripción');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Cargar planes disponibles
  const loadPlans = useCallback(async () => {
    try {
      const response = await api.getPlans({ status: 'active' }, { useCache: true });
      if (response.success && response.data) {
        setPlans(response.data);
      }
    } catch (error) {
      console.error('Error al cargar planes:', error);
    }
  }, []);

  useEffect(() => {
    loadSubscription();
    loadPlans();
  }, [loadSubscription, loadPlans]);

  // Funciones de gestión
  const handleUpdateSubscription = async () => {
    if (!subscription) return;
    
    try {
      setActionLoading(true);
      const response = await api.updateSubscription(subscription.subscription_id, editForm);
      if (response.success) {
        toast.success('Suscripción actualizada exitosamente');
        setEditModalOpen(false);
        loadSubscription();
      } else {
        toast.error(response.error || 'Error al actualizar suscripción');
      }
    } catch (error) {
      toast.error('Error al actualizar suscripción');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePlan = async () => {
    if (!subscription || !selectedPlan) return;
    
    try {
      setActionLoading(true);
      const response = await api.changePlan(subscription.subscription_id, selectedPlan, true);
      if (response.success) {
        toast.success('Plan cambiado exitosamente');
        setChangePlanModalOpen(false);
        setSelectedPlan("");
        loadSubscription();
      } else {
        toast.error(response.error || 'Error al cambiar plan');
      }
    } catch (error) {
      toast.error('Error al cambiar plan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;
    
    try {
      setActionLoading(true);
      const response = await api.cancelSubscription(
        subscription.subscription_id, 
        cancelAtEnd, 
        cancelReason || 'Cancelación solicitada por el usuario'
      );
      if (response.success) {
        toast.success('Suscripción cancelada exitosamente');
        setCancelModalOpen(false);
        setCancelReason("");
        setCancelAtEnd(false);
        loadSubscription();
      } else {
        toast.error(response.error || 'Error al cancelar suscripción');
      }
    } catch (error) {
      toast.error('Error al cancelar suscripción');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseSubscription = async () => {
    if (!subscription) return;
    
    try {
      setActionLoading(true);
      const response = await api.pauseSubscription(subscription.subscription_id);
      if (response.success) {
        toast.success('Suscripción pausada exitosamente');
        loadSubscription();
      } else {
        toast.error(response.error || 'Error al pausar suscripción');
      }
    } catch (error) {
      toast.error('Error al pausar suscripción');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeSubscription = async () => {
    if (!subscription) return;
    
    try {
      setActionLoading(true);
      const response = await api.resumeSubscription(subscription.subscription_id);
      if (response.success) {
        toast.success('Suscripción reanudada exitosamente');
        loadSubscription();
      } else {
        toast.error(response.error || 'Error al reanudar suscripción');
      }
    } catch (error) {
      toast.error('Error al reanudar suscripción');
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
      case 'paused': return 'Pausada';
      case 'non_renewing': return 'No renovable';
      case 'unpaid': return 'No pagada';
      case 'past_due': return 'Vencida';
      default: return status || 'Desconocido';
    }
  };

  // Función para formatear fechas
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = parseISO(dateString);
    if (!isValid(date)) return 'N/A';
    return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar la suscripción</h3>
          <p className="text-gray-600 mb-4">{error || 'Suscripción no encontrada'}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => navigate('/subscriptions')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Suscripciones
            </Button>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => navigate('/subscriptions')} 
            variant="outline" 
            size="sm"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {subscription.name || 'Suscripción sin nombre'}
            </h1>
            <p className="text-gray-600 mt-1">
              ID: {subscription.subscription_id}
            </p>
          </div>
          <Badge variant={getStatusBadgeVariant(subscription.status)} className="ml-4">
            {getStatusText(subscription.status)}
          </Badge>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={loadSubscription}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contenido principal */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="details" className="space-y-4">
            <TabsList>
              <TabsTrigger value="details">Detalles</TabsTrigger>
              <TabsTrigger value="billing">Facturación</TabsTrigger>
              <TabsTrigger value="history">Historial</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-6">
              {/* Información básica */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                    Información de la Suscripción
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Información principal */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Número de Suscripción</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {subscription.subscription_number || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Plan Actual</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {subscription.plan_name || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Código del Plan</span>
                        <span className="text-sm font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded">
                          {subscription.plan_code || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Estado</span>
                        <Badge variant={getStatusBadgeVariant(subscription.status)} className="text-xs">
                          {getStatusText(subscription.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Cantidad</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {subscription.quantity || 1} unidad{(subscription.quantity || 1) > 1 ? 'es' : ''}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Monto Total</span>
                        <span className="text-lg font-bold text-green-600">
                          ${subscription.amount} {subscription.currency_code}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Sub-total</span>
                        <span className="text-sm font-semibold text-gray-900">
                          ${subscription.sub_total || subscription.amount} {subscription.currency_code}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Impuestos</span>
                        <span className="text-sm font-semibold text-gray-900">
                          ${subscription.tax_total || 0} {subscription.currency_code}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Intervalo de Facturación</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {subscription.interval || 1} {subscription.interval_unit || 'mes(es)'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Auto-cobro</span>
                        <span className={`text-sm font-semibold ${
                          subscription.auto_collect ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {subscription.auto_collect ? '✓ Habilitado' : '✗ Deshabilitado'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <Separator className="my-6" />
                  
                  {/* Fechas importantes */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Fechas Importantes</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <span className="text-xs font-medium text-blue-800">Creación</span>
                        </div>
                        <span className="text-sm font-semibold text-blue-900">
                          {formatDate(subscription.created_time)}
                        </span>
                      </div>
                      
                      <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                        <div className="flex items-center gap-2 mb-1">
                          <Play className="h-4 w-4 text-green-600" />
                          <span className="text-xs font-medium text-green-800">Activación</span>
                        </div>
                        <span className="text-sm font-semibold text-green-900">
                          {formatDate(subscription.activated_at)}
                        </span>
                      </div>
                      
                      <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="h-4 w-4 text-purple-600" />
                          <span className="text-xs font-medium text-purple-800">Inicio</span>
                        </div>
                        <span className="text-sm font-semibold text-purple-900">
                          {formatDate(subscription.start_date)}
                        </span>
                      </div>
                      
                      <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                        <div className="flex items-center gap-2 mb-1">
                          <RefreshCw className="h-4 w-4 text-orange-600" />
                          <span className="text-xs font-medium text-orange-800">Última Actualización</span>
                        </div>
                        <span className="text-sm font-semibold text-orange-900">
                          {formatDate(subscription.updated_time)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Información del cliente */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <User className="h-5 w-5 text-indigo-600" />
                    Información del Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">ID del Cliente</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded">
                            {subscription.customer_id || 'N/A'}
                          </span>
                          {subscription.customer_id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 hover:bg-indigo-50"
                              onClick={() => navigate(`/customers/${subscription.customer_id}`)}
                              title="Ver detalles del cliente"
                            >
                              <Eye className="h-3 w-3 text-indigo-600" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Nombre Completo</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {subscription.customer_name || 'N/A'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Correo Electrónico</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {subscription.customer_email || 'N/A'}
                          </span>
                          {subscription.customer_email && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 hover:bg-blue-50"
                              onClick={() => window.open(`mailto:${subscription.customer_email}`, '_blank')}
                              title="Enviar correo"
                            >
                              <Mail className="h-3 w-3 text-blue-600" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Teléfono</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {subscription.customer_phone || 'N/A'}
                          </span>
                          {subscription.customer_phone && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 hover:bg-green-50"
                              onClick={() => window.open(`tel:${subscription.customer_phone}`, '_blank')}
                              title="Llamar"
                            >
                              <Phone className="h-3 w-3 text-green-600" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {subscription.customer_address && (
                        <div className="flex items-start justify-between py-2 border-b border-gray-100">
                          <span className="text-sm font-medium text-gray-600">Dirección</span>
                          <div className="flex items-start gap-2 max-w-xs">
                            <span className="text-sm font-semibold text-gray-900 text-right">
                              {subscription.customer_address}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 hover:bg-red-50 flex-shrink-0"
                              onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(subscription.customer_address)}`, '_blank')}
                              title="Ver en Google Maps"
                            >
                              <MapPin className="h-3 w-3 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {subscription.customer_id && (
                        <div className="pt-3">
                          <Button
                            onClick={() => navigate(`/customers/${subscription.customer_id}`)}
                            variant="outline"
                            size="sm"
                            className="w-full border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                          >
                            <User className="mr-2 h-4 w-4" />
                            Ver Perfil Completo del Cliente
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="billing" className="space-y-6">
              {/* Próximas Fechas Importantes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Próxima Facturación</p>
                        <p className="text-lg font-bold text-blue-600">
                          {subscription.next_billing_at ? 
                            format(parseISO(subscription.next_billing_at), 'dd/MM/yyyy', { locale: es }) : 
                            'N/A'
                          }
                        </p>
                        <p className="text-xs text-gray-500">
                          {subscription.next_billing_at ? 
                            format(parseISO(subscription.next_billing_at), 'HH:mm', { locale: es }) : 
                            ''
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Última Facturación</p>
                        <p className="text-lg font-bold text-green-600">
                          {subscription.last_billing_at ? 
                            format(parseISO(subscription.last_billing_at), 'dd/MM/yyyy', { locale: es }) : 
                            'N/A'
                          }
                        </p>
                        <p className="text-xs text-gray-500">
                          {subscription.last_billing_at ? 
                            format(parseISO(subscription.last_billing_at), 'HH:mm', { locale: es }) : 
                            ''
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Clock className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Fecha de Expiración</p>
                        <p className="text-lg font-bold text-orange-600">
                          {subscription.expiry_at ? 
                            format(parseISO(subscription.expiry_at), 'dd/MM/yyyy', { locale: es }) : 
                            'N/A'
                          }
                        </p>
                        <p className="text-xs text-gray-500">
                          {subscription.trial_remaining_days ? 
                            `${subscription.trial_remaining_days} días de prueba` : 
                            'Sin período de prueba'
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Información de Facturación Detallada */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Información de Facturación
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Columna Izquierda - Fechas y Períodos */}
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Fechas y Períodos
                        </h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-sm text-gray-600">Próxima facturación:</span>
                            <span className="text-sm font-medium">
                              {subscription.next_billing_at ? 
                                format(parseISO(subscription.next_billing_at), 'dd/MM/yyyy HH:mm', { locale: es }) : 
                                'N/A'
                              }
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-sm text-gray-600">Última facturación:</span>
                            <span className="text-sm font-medium">
                              {subscription.last_billing_at ? 
                                format(parseISO(subscription.last_billing_at), 'dd/MM/yyyy HH:mm', { locale: es }) : 
                                'N/A'
                              }
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-sm text-gray-600">Fecha de expiración:</span>
                            <span className="text-sm font-medium">
                              {subscription.expiry_at ? 
                                format(parseISO(subscription.expiry_at), 'dd/MM/yyyy', { locale: es }) : 
                                'N/A'
                              }
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-gray-600">Días de prueba restantes:</span>
                            <span className="text-sm font-medium">
                              <Badge variant={subscription.trial_remaining_days > 0 ? "default" : "secondary"}>
                                {subscription.trial_remaining_days || 0} días
                              </Badge>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Columna Derecha - Montos y Totales */}
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Desglose Financiero
                        </h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-sm text-gray-600">Sub-total:</span>
                            <span className="text-sm font-medium">
                              ${subscription.sub_total || subscription.amount} {subscription.currency_code}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-sm text-gray-600">Impuestos:</span>
                            <span className="text-sm font-medium">
                              ${subscription.tax_total || 0} {subscription.currency_code}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-3 bg-gray-50 px-3 rounded-lg">
                            <span className="text-base font-semibold text-gray-900">Total:</span>
                            <span className="text-xl font-bold text-green-600">
                              ${subscription.amount} {subscription.currency_code}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-gray-600">Frecuencia de cobro:</span>
                            <span className="text-sm font-medium">
                              <Badge variant="outline">
                                {subscription.interval === 'months' ? 'Mensual' : 
                                 subscription.interval === 'years' ? 'Anual' : 
                                 subscription.interval || 'N/A'}
                              </Badge>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Estado de Facturación */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Estado de Facturación
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <p className="text-sm font-medium text-green-900">Estado de Pago</p>
                      <p className="text-lg font-bold text-green-600">
                        {subscription.status === 'live' ? 'Al día' : 'Revisar'}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <Repeat className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm font-medium text-blue-900">Auto-cobro</p>
                      <p className="text-lg font-bold text-blue-600">
                        {subscription.auto_collect ? 'Activado' : 'Desactivado'}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <Calendar className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                      <p className="text-sm font-medium text-purple-900">Próximo Cobro</p>
                      <p className="text-lg font-bold text-purple-600">
                        {subscription.next_billing_at ? 
                          (() => {
                            const nextBilling = parseISO(subscription.next_billing_at);
                            const now = new Date();
                            const diffDays = Math.ceil((nextBilling.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                            return diffDays > 0 ? `${diffDays} días` : 'Vencido';
                          })() : 
                          'N/A'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="history" className="space-y-4">
              {/* Historial de cambios */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Historial de Cambios
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="mx-auto h-12 w-12 mb-4" />
                    <p>El historial de cambios estará disponible próximamente</p>
                  </div>
                </CardContent>
              </Card>
              
              {/* Notas de la suscripción */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Notas y Observaciones
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-900">Suscripción creada</p>
                          <p className="text-xs text-blue-700 mt-1">
                            {formatDate(subscription.created_at)} - Sistema automático
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {subscription.activated_at && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-green-900">Suscripción activada</p>
                            <p className="text-xs text-green-700 mt-1">
                              {formatDate(subscription.activated_at)} - Sistema automático
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {subscription.trial_ends_at && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-yellow-900">Período de prueba</p>
                            <p className="text-xs text-yellow-700 mt-1">
                              Finaliza el {formatDate(subscription.trial_ends_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="border-t pt-3">
                      <Textarea 
                        placeholder="Agregar una nota sobre esta suscripción..."
                        className="min-h-[100px]"
                      />
                      <Button size="sm" className="mt-2">
                        <FileText className="mr-2 h-4 w-4" />
                        Agregar Nota
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Panel lateral de acciones */}
        <div className="space-y-6">
          {/* Acciones principales */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Settings className="h-5 w-5 text-blue-600" />
                </div>
                Acciones
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">Gestiona tu suscripción</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Acciones Principales */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Acciones Principales</p>
                <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full justify-start hover:bg-green-50 hover:border-green-300 transition-colors" variant="outline">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-green-100 rounded">
                          <Edit className="h-3.5 w-3.5 text-green-600" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-green-700">Editar Suscripción</p>
                          <p className="text-xs text-gray-500">Modificar detalles básicos</p>
                        </div>
                      </div>
                    </Button>
                  </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Editar Suscripción</DialogTitle>
                    <DialogDescription>
                      Modifica los datos de la suscripción.
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
                      {actionLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                      Actualizar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
                 <Dialog open={changePlanModalOpen} onOpenChange={setChangePlanModalOpen}>
                   <DialogTrigger asChild>
                     <Button className="w-full justify-start hover:bg-blue-50 hover:border-blue-300 transition-colors" variant="outline">
                       <div className="flex items-center gap-3">
                         <div className="p-1.5 bg-blue-100 rounded">
                           <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
                         </div>
                         <div className="text-left">
                           <p className="font-medium text-blue-700">Cambiar Plan</p>
                           <p className="text-xs text-gray-500">Actualizar o degradar plan</p>
                         </div>
                       </div>
                     </Button>
                   </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Cambiar Plan</DialogTitle>
                    <DialogDescription>
                      Selecciona el nuevo plan para esta suscripción.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="new_plan">Nuevo Plan</Label>
                      <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un plan" />
                        </SelectTrigger>
                        <SelectContent>
                          {plans.filter(plan => plan.plan_code !== subscription.plan_code).map((plan) => (
                            <SelectItem key={plan.plan_code} value={plan.plan_code}>
                              {plan.plan_name} - ${plan.price} {plan.currency_code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setChangePlanModalOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="button" 
                      onClick={handleChangePlan}
                      disabled={actionLoading || !selectedPlan}
                    >
                      {actionLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                      Cambiar Plan
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
               </div>

               {/* Acciones de Control */}
               {subscription.status === 'live' && (
                 <div className="space-y-2 pt-2 border-t border-gray-200">
                   <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Control de Suscripción</p>
                   <Dialog>
                     <DialogTrigger asChild>
                       <Button 
                         className="w-full justify-start hover:bg-orange-50 hover:border-orange-300 transition-colors" 
                         variant="outline"
                         disabled={actionLoading}
                         onClick={(e) => {
                           e.preventDefault();
                           if (window.confirm('⚠️ ¿Estás seguro de que quieres pausar esta suscripción?\n\nEsto detendrá temporalmente los cobros y el acceso al servicio.')) {
                             // El diálogo se abrirá automáticamente
                           } else {
                             e.stopPropagation();
                           }
                         }}
                       >
                         <div className="flex items-center gap-3">
                           <div className="p-1.5 bg-orange-100 rounded">
                             <Pause className="h-3.5 w-3.5 text-orange-600" />
                           </div>
                           <div className="text-left">
                             <p className="font-medium text-orange-700">Pausar Suscripción</p>
                             <p className="text-xs text-gray-500">Suspender temporalmente</p>
                           </div>
                         </div>
                       </Button>
                     </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        Confirmar Pausa de Suscripción
                      </DialogTitle>
                      <DialogDescription>
                        ¿Estás seguro de que deseas pausar esta suscripción? La facturación se detendrá temporalmente y el cliente no podrá acceder a los servicios hasta que se reanude.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div className="text-sm text-yellow-800">
                          <p className="font-medium mb-1">Efectos de pausar la suscripción:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Se suspenderá la facturación automática</li>
                            <li>El cliente perderá acceso a los servicios</li>
                            <li>Se puede reanudar en cualquier momento</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => {}}>
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handlePauseSubscription}
                        disabled={actionLoading}
                        className="bg-yellow-600 hover:bg-yellow-700"
                      >
                        {actionLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                        Pausar Suscripción
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                 </div>
                )}
              
                {subscription.status === 'paused' && (
                  <div className="space-y-2 pt-2 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reactivación</p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          className="w-full justify-start hover:bg-green-50 hover:border-green-300 transition-colors" 
                          variant="outline"
                          disabled={actionLoading}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-green-100 rounded">
                              <Play className="h-3.5 w-3.5 text-green-600" />
                            </div>
                            <div className="text-left">
                              <p className="font-medium text-green-700">Reanudar Suscripción</p>
                              <p className="text-xs text-gray-500">Reactivar facturación</p>
                            </div>
                          </div>
                        </Button>
                      </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-green-500" />
                        Confirmar Reanudación de Suscripción
                      </DialogTitle>
                      <DialogDescription>
                        ¿Estás seguro de que deseas reanudar esta suscripción? La facturación se reanudará y el cliente volverá a tener acceso a los servicios.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-600 mt-0.5" />
                        <div className="text-sm text-green-800">
                          <p className="font-medium mb-1">Efectos de reanudar la suscripción:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Se reanudará la facturación automática</li>
                            <li>El cliente recuperará acceso a los servicios</li>
                            <li>Se aplicarán las tarifas actuales del plan</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => {}}>
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleResumeSubscription}
                        disabled={actionLoading}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {actionLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                        Reanudar Suscripción
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                   </div>
                 )}
              
                {/* Zona de Peligro */}
                {(subscription.status === 'live' || subscription.status === 'paused') && (
                  <div className="space-y-2 pt-2 border-t border-red-200">
                    <p className="text-xs font-medium text-red-500 uppercase tracking-wide">Zona de Peligro</p>
                    <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          className="w-full justify-start hover:bg-red-50 hover:border-red-300 transition-colors border-red-200" 
                          variant="outline"
                          onClick={(e) => {
                            e.preventDefault();
                            if (window.confirm('🚨 ¡ADVERTENCIA!\n\n¿Estás completamente seguro de que quieres CANCELAR esta suscripción?\n\n⚠️ Esta acción puede ser irreversible\n⚠️ Se perderá el acceso al servicio\n⚠️ Los datos pueden eliminarse según la política\n\nEscribe "CANCELAR" para confirmar:')) {
                              const confirmation = prompt('Para confirmar la cancelación, escribe exactamente: CANCELAR');
                              if (confirmation === 'CANCELAR') {
                                setCancelModalOpen(true);
                              } else {
                                alert('Cancelación abortada. La confirmación no coincide.');
                              }
                            }
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-red-100 rounded">
                              <X className="h-3.5 w-3.5 text-red-600" />
                            </div>
                            <div className="text-left">
                              <p className="font-medium text-red-700">Cancelar Suscripción</p>
                              <p className="text-xs text-red-500">⚠️ Acción irreversible</p>
                            </div>
                          </div>
                        </Button>
                      </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        Cancelar Suscripción
                      </DialogTitle>
                      <DialogDescription>
                        Esta acción cancelará la suscripción permanentemente. Puedes elegir si cancelar inmediatamente o al final del período actual.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div className="text-sm text-red-800">
                          <p className="font-medium mb-1">⚠️ Advertencia: Esta acción es irreversible</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>El cliente perderá acceso a todos los servicios</li>
                            <li>Se detendrá toda facturación futura</li>
                            <li>Los datos de la suscripción se mantendrán para historial</li>
                            <li>No se podrá reactivar la misma suscripción</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="cancel_reason">Motivo de cancelación *</Label>
                        <Textarea
                          id="cancel_reason"
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          placeholder="Describe el motivo de la cancelación (requerido)"
                          className="min-h-[80px]"
                        />
                        {!cancelReason.trim() && (
                          <p className="text-xs text-red-600">El motivo de cancelación es requerido</p>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                          <input
                            type="checkbox"
                            id="cancel_at_end"
                            checked={cancelAtEnd}
                            onChange={(e) => setCancelAtEnd(e.target.checked)}
                            className="mt-1 rounded"
                          />
                          <div className="flex-1">
                            <Label htmlFor="cancel_at_end" className="font-medium">
                              Cancelar al final del período actual
                            </Label>
                            <p className="text-xs text-gray-600 mt-1">
                              {cancelAtEnd 
                                ? "La suscripción se cancelará el " + (subscription.next_billing_at ? format(parseISO(subscription.next_billing_at), 'dd/MM/yyyy', { locale: es }) : 'final del período')
                                : "La suscripción se cancelará inmediatamente"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setCancelModalOpen(false);
                          setCancelReason("");
                          setCancelAtEnd(false);
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="button" 
                        variant="destructive"
                        onClick={() => handleCancelSubscription(subscription.subscription_id, cancelAtEnd)}
                        disabled={actionLoading || !cancelReason.trim()}
                      >
                        {actionLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                        {cancelAtEnd ? 'Programar Cancelación' : 'Cancelar Inmediatamente'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                     </Dialog>
                   </div>
                 )}

                 {/* Información de Seguridad */}
                 <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                   <div className="flex items-start gap-2">
                     <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                     <div>
                       <p className="text-xs font-medium text-gray-700">Información de Seguridad</p>
                       <p className="text-xs text-gray-600 mt-1">
                         Las acciones críticas requieren confirmación adicional para proteger tu cuenta.
                       </p>
                     </div>
                   </div>
                 </div>
            </CardContent>
          </Card>

          {/* Resumen Financiero Mejorado */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                Resumen Financiero
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Monto Principal */}
              <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <p className="text-sm text-gray-600 mb-1">Monto {subscription.interval === 'months' ? 'Mensual' : 'del Plan'}</p>
                <p className="text-3xl font-bold text-green-600">
                  ${subscription.amount} {subscription.currency_code}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {subscription.interval === 'months' ? 'Facturado mensualmente' : 
                   subscription.interval === 'years' ? 'Facturado anualmente' : 
                   'Según plan'}
                </p>
              </div>

              {/* Información de Cobro */}
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Próximo cobro:</span>
                  </div>
                  <span className="text-sm font-bold text-blue-700">
                    {subscription.next_billing_at ? 
                      format(parseISO(subscription.next_billing_at), 'dd/MM/yyyy', { locale: es }) : 
                      'N/A'
                    }
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">Estado de pago:</span>
                  </div>
                  <Badge variant={subscription.status === 'live' ? 'default' : 'secondary'} className="font-medium">
                    {subscription.status === 'live' ? 'Al día' : 'Revisar'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2">
                    <Repeat className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-900">Auto-cobro:</span>
                  </div>
                  <Badge variant={subscription.auto_collect ? 'default' : 'outline'} className="font-medium">
                    {subscription.auto_collect ? 'Activado' : 'Desactivado'}
                  </Badge>
                </div>
              </div>

              {/* Días hasta próximo cobro */}
              {subscription.next_billing_at && (
                <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">Días hasta próximo cobro</p>
                  <p className="text-xl font-bold text-gray-800">
                    {(() => {
                      const nextBilling = parseISO(subscription.next_billing_at);
                      const now = new Date();
                      const diffDays = Math.ceil((nextBilling.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                      return diffDays > 0 ? diffDays : 0;
                    })()} días
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Métricas Adicionales */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Receipt className="h-5 w-5 text-blue-600" />
                </div>
                Métricas de Suscripción
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  <p className="text-xs text-indigo-600 font-medium mb-1">CANTIDAD</p>
                  <p className="text-lg font-bold text-indigo-800">{subscription.quantity || 1}</p>
                </div>
                <div className="text-center p-3 bg-teal-50 rounded-lg border border-teal-200">
                  <p className="text-xs text-teal-600 font-medium mb-1">PLAN</p>
                  <p className="text-lg font-bold text-teal-800 truncate">{subscription.plan_name || 'N/A'}</p>
                </div>
              </div>
              
              <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-xs text-amber-600 font-medium mb-1">TOTAL FACTURADO</p>
                <p className="text-xl font-bold text-amber-800">
                  ${(subscription.amount * (subscription.quantity || 1)).toFixed(2)} {subscription.currency_code}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}