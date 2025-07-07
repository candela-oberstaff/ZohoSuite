import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import type { Opportunity, Contact } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, DollarSign, Calendar, Building2, User, Tag, Clock, Edit, CreditCard, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function OpportunityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [relatedContacts, setRelatedContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingPaymentLink, setSendingPaymentLink] = useState(false);

  useEffect(() => {
    if (!id) {
      navigate('/opportunities');
      return;
    }

    const fetchOpportunityData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch opportunity details from Oberstaff pipeline
        const opportunitiesResponse = await api.getOberstaffOpportunities();
        if (opportunitiesResponse.success && opportunitiesResponse.data?.opportunities) {
          const foundOpportunity = opportunitiesResponse.data.opportunities.find(opp => opp.id === id);
          if (foundOpportunity) {
            setOpportunity(foundOpportunity);
            
            // Fetch all contacts to find related ones
            const contactsResponse = await api.getContacts();
            if (contactsResponse.success && contactsResponse.data?.items) {
              // Filter contacts related to this opportunity
              const relatedContacts = contactsResponse.data.items.filter(contact => {
                // 1. Check if contact is directly associated with the opportunity via Contact_Name
                if (foundOpportunity.Contact_Name?.id === contact.id) {
                  return true;
                }
                
                // 2. Check if contact belongs to the same company as the opportunity
                if (foundOpportunity.Account_Name?.id && contact.Account_Name?.id) {
                  return contact.Account_Name.id === foundOpportunity.Account_Name.id;
                }
                
                return false;
              });
              
              setRelatedContacts(relatedContacts);
            }
          } else {
            setError('Oportunidad no encontrada');
          }
        }
      } catch (err) {
        setError('Error al cargar los datos de la oportunidad');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOpportunityData();
  }, [id, navigate]);

  const formatAmount = (amount: number | undefined) => {
    if (!amount) return '$0';
    return `$${amount.toLocaleString('es-ES')}`;
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'No definida';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return 'No definida';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Función para manejar el envío del enlace de actualización de datos bancarios
  const handleSendPaymentLink = async () => {
    if (!id || !opportunity) return;
    
    setSendingPaymentLink(true);
    try {
      // Primero creamos el cliente en Zoho Billing a partir de la oportunidad
      const createResponse = await api.createCustomerFromOpportunity(id);
      
      if (!createResponse.success) {
        // Verificar si es el error específico de cliente existente antes de lanzar la excepción
        const errorMessage = createResponse.error || 'Error al crear el cliente';
        console.log('Error detectado:', errorMessage);
        
        const isCustomerExistsError = errorMessage.toLowerCase().includes('already exists') || 
                                     errorMessage.toLowerCase().includes('ya existe') ||
                                     errorMessage.includes('3062') ||
                                     (errorMessage.toLowerCase().includes('customer') && errorMessage.toLowerCase().includes('exists'));
        
        console.log('¿Es error de cliente existente?', isCustomerExistsError);
        
        if (isCustomerExistsError) {
          // Mostrar alerta nativa más visible para cliente existente
          console.log('Mostrando alerta de cliente existente');
          alert('⚠️ CLIENTE YA REGISTRADO\n\nEsta oportunidad ya fue convertida a cliente en Zoho Billing.\n\nEl cliente ya existe en el sistema de facturación. No es necesario crear un nuevo registro.');
          return; // Salir de la función sin continuar
        }
        
        throw new Error(errorMessage);
      }
      
      // Obtenemos el ID del cliente creado
      const customerId = createResponse.data?.customer_id;
      
      if (!customerId) {
        throw new Error('No se pudo obtener el ID del cliente');
      }
      
      // Generamos el enlace de actualización de datos bancarios
      const linkResponse = await api.generatePaymentMethodUpdateLink(customerId);
      
      if (!linkResponse.success) {
        throw new Error(linkResponse.error || 'Error al generar el enlace');
      }
      
      // Mostramos un mensaje de éxito con el enlace
      toast({
        title: 'Enlace generado exitosamente',
        description: 'Se ha generado el enlace para actualizar los datos bancarios.'
      });
      
      // Mostramos un segundo toast con un botón para copiar el enlace
      toast({
        title: 'Copiar enlace',
        description: (
          <Button 
            variant="outline" 
            onClick={() => {
              navigator.clipboard.writeText(linkResponse.data?.url || '');
              toast({
                title: 'Enlace copiado',
                description: 'El enlace ha sido copiado al portapapeles.'
              });
            }}
          >
            Copiar enlace
          </Button>
        )
      });
      
    } catch (error) {
      console.error('Error al enviar enlace de pago:', error);
      
      // Verificar si es el error específico de cliente existente
      let errorMessage = 'Error al procesar la solicitud';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        // Si el error es un objeto, intentar extraer el mensaje
        const errorObj = error as any;
        if (errorObj.error) {
          errorMessage = errorObj.error;
        } else if (errorObj.message) {
          errorMessage = errorObj.message;
        }
      }
      
      // Mostrar mensaje de error genérico
      toast({
        title: 'Error al procesar solicitud',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setSendingPaymentLink(false);
    }
  };

  const getStageColor = (stage: string | undefined) => {
    if (!stage) return 'bg-slate-100 text-slate-700 border border-slate-200';
    
    switch(stage) {
      case 'Closed Won':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'Closed Lost':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'Propuesta':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'Negociación':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'Seguimiento':
        return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-96 w-full" />
          </div>
          <div>
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
        <div className="text-red-600 dark:text-red-400 text-lg">{error || 'Oportunidad no encontrada'}</div>
        <Button onClick={() => navigate('/opportunities')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Oportunidades
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button
              onClick={() => navigate('/opportunities')}
              variant="outline"
              size="sm"
              className="border-slate-300 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="space-y-2">
              <div>
                <h1 className="text-xl font-semibold text-slate-900 leading-tight">
                  {opportunity.Deal_Name || 'Sin nombre'}
                </h1>
                <p className="text-slate-600 text-sm">
                  Información detallada de la oportunidad
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-md text-xs font-medium ${getStageColor(opportunity.Stage)}`}>
                  {opportunity.Stage || 'Sin etapa'}
                </span>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <span className="text-lg font-bold text-slate-900">
                    {formatAmount(opportunity.Amount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSendPaymentLink} 
              disabled={sendingPaymentLink}
            >
              {sendingPaymentLink ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-1" />
                  Enviar enlace
                </>
              )}
            </Button>
            <Button size="sm" onClick={() => navigate(`/opportunities/${id}/edit`)}>
              <Edit className="h-4 w-4 mr-1" />
              Editar
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Opportunity Information */}
        <div className="lg:col-span-2">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <div className="p-1.5 bg-slate-100 rounded-md">
                  <DollarSign className="h-4 w-4 text-slate-700" />
                </div>
                Información de la Oportunidad
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2 p-3 bg-slate-50/50 rounded-md border border-slate-100">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Nombre del Negocio
                  </label>
                  <p className="text-slate-900 font-medium text-sm">
                    {opportunity.Deal_Name || 'No especificado'}
                  </p>
                </div>
                
                <div className="space-y-2 p-3 bg-emerald-50/50 rounded-md border border-emerald-100">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Monto
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 rounded-md">
                      <DollarSign className="h-3 w-3 text-emerald-700" />
                    </div>
                    <p className="text-lg font-bold text-slate-900">
                      {formatAmount(opportunity.Amount)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 p-3 bg-slate-50/50 rounded-md border border-slate-100">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Etapa
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-slate-100 rounded-md">
                      <Tag className="h-3 w-3 text-slate-700" />
                    </div>
                    <span className={`px-3 py-1 rounded-md text-xs font-medium ${getStageColor(opportunity.Stage)}`}>
                      {opportunity.Stage || 'Sin etapa'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 p-3 bg-slate-50/50 rounded-md border border-slate-100">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Fecha de Cierre
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-slate-100 rounded-md">
                      <Calendar className="h-3 w-3 text-slate-700" />
                    </div>
                    <p className="text-slate-900 font-medium text-sm">
                      {formatDate(opportunity.Closing_Date)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 p-3 bg-slate-50/50 rounded-md border border-slate-100">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Empresa
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-slate-100 rounded-md">
                      <Building2 className="h-3 w-3 text-slate-700" />
                    </div>
                    <p className="text-slate-900 font-medium text-sm">
                      {opportunity.Account_Name?.name || 'No especificado'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 p-3 bg-slate-50/50 rounded-md border border-slate-100">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Contacto Principal
                  </label>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-slate-100 rounded-md">
                        <User className="h-3 w-3 text-slate-700" />
                      </div>
                      {opportunity.Contact_Name ? (
                        <p 
                          className="text-slate-900 font-medium text-sm cursor-pointer hover:text-blue-600 transition-colors"
                          onClick={() => navigate(`/contacts/${opportunity.Contact_Name.id}`)}
                        >
                          {opportunity.Contact_Name.name || 'Sin nombre'}
                        </p>
                      ) : (
                        <p className="text-slate-500 text-sm">No especificado</p>
                      )}
                    </div>
                    {opportunity.Contact_Email && (
                      <div className="ml-8">
                        <p className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-sm inline-block">
                          {opportunity.Contact_Email}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 p-3 bg-slate-50/50 rounded-md border border-slate-100">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Pipeline
                  </label>
                  <p className="text-slate-900 font-medium text-sm">
                    {opportunity.Pipeline?.name || 'No especificado'}
                  </p>
                </div>

                <div className="space-y-2 p-3 bg-slate-50/50 rounded-md border border-slate-100">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Fecha de Creación
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-slate-100 rounded-md">
                      <Clock className="h-3 w-3 text-slate-700" />
                    </div>
                    <p className="text-slate-900 font-medium text-sm">
                      {formatDateTime(opportunity.Created_Time)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 p-3 bg-slate-50/50 rounded-md border border-slate-100">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Última Modificación
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-slate-100 rounded-md">
                      <Clock className="h-3 w-3 text-slate-700" />
                    </div>
                    <p className="text-slate-900 font-medium text-sm">
                      {formatDateTime(opportunity.Modified_Time)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Related Contacts */}
        <div>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <div className="p-1.5 bg-slate-100 rounded-md">
                  <User className="h-4 w-4 text-slate-700" />
                </div>
                Contactos Relacionados
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {relatedContacts.length > 0 ? (
                <div className="space-y-3">
                  {relatedContacts.map((contact) => {
                    // Determinar si este es el contacto principal de la oportunidad
                    const isPrimaryContact = opportunity.Contact_Name?.id === contact.id;
                    
                    return (
                      <div 
                        key={contact.id} 
                        className={`p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-all duration-200 hover:shadow-sm ${
                          isPrimaryContact 
                            ? 'border-emerald-200 bg-emerald-50/50' 
                            : 'border-slate-200 bg-white'
                        }`}
                        onClick={() => navigate(`/contacts/${contact.id}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-md ${
                                isPrimaryContact ? 'bg-emerald-100' : 'bg-slate-100'
                              }`}>
                                <User className={`h-3 w-3 ${
                                  isPrimaryContact ? 'text-emerald-700' : 'text-slate-700'
                                }`} />
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900 text-sm">
                                  {contact.Full_Name || `${contact.First_Name || ''} ${contact.Last_Name || ''}`.trim() || 'Sin nombre'}
                                </p>
                                {isPrimaryContact && (
                                  <span className="inline-block mt-0.5 px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                                    Principal
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="ml-8">
                              <p className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-sm inline-block">
                                {contact.Email || 'Sin email'}
                              </p>
                            </div>
                          </div>
                          <ArrowLeft className="h-4 w-4 text-slate-400 rotate-180" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="p-3 bg-slate-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <User className="h-6 w-6 text-slate-500" />
                  </div>
                  <p className="text-slate-600 font-medium text-sm">No hay contactos relacionados</p>
                  <p className="text-xs text-slate-500 mt-1">Los contactos aparecerán aquí cuando estén asociados a esta oportunidad</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}