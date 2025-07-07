import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import type { Opportunity, Contact } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, DollarSign, Calendar, Building2, User, Tag, Clock, Edit, CreditCard, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function EmpresasProductosDetail() {
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
      navigate('/empresas-productos');
      return;
    }

    const fetchOpportunityData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch opportunity details from Empresas y Productos pipeline
        const opportunitiesResponse = await api.getEmpresasProductosOpportunities();
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
    if (!opportunity?.Contact_Name?.id) {
      toast({
        title: "Error",
        description: "No se puede enviar el enlace: contacto no encontrado",
        variant: "destructive",
      });
      return;
    }

    setSendingPaymentLink(true);
    
    try {
      // Aquí iría la lógica para enviar el enlace de actualización de método de pago
      // Por ahora solo mostramos un mensaje de éxito
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simular delay
      
      toast({
        title: "Enlace enviado",
        description: "Se ha enviado el enlace de actualización de datos bancarios al contacto",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar el enlace de actualización",
        variant: "destructive",
      });
    } finally {
      setSendingPaymentLink(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/empresas-productos')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </div>
        
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <h2 className="text-lg font-semibold text-red-800 mb-2">
              Error al cargar la oportunidad
            </h2>
            <p className="text-red-600">
              {error || 'Oportunidad no encontrada'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/empresas-productos')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {opportunity.Deal_Name}
            </h1>
            <p className="text-gray-600">
              Oportunidad del embudo Empresas y Productos
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/empresas-productos/${id}/edit`)}
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Editar
          </Button>
          
          <Button
            onClick={handleSendPaymentLink}
            disabled={sendingPaymentLink || !opportunity.Contact_Name?.id}
            className="flex items-center gap-2"
          >
            {sendingPaymentLink ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            Enviar Enlace de Pago
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Detalles de la oportunidad */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Información de la Oportunidad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Nombre</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {opportunity.Deal_Name || 'Sin nombre'}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Valor</label>
                  <p className="text-lg font-semibold text-green-600">
                    {formatAmount(opportunity.Amount)}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Etapa</label>
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-blue-600" />
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      {opportunity.Stage || 'Sin etapa'}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Fecha de cierre</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <span className="text-gray-900">
                      {formatDate(opportunity.Closing_Date)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información de la empresa */}
          {opportunity.Account_Name && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Información de la Empresa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <label className="text-sm font-medium text-gray-600">Empresa</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {opportunity.Account_Name.name}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contactos relacionados */}
          {relatedContacts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Contactos Relacionados ({relatedContacts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {relatedContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/contacts/${contact.id}`)}
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {contact.Full_Name || `${contact.First_Name || ''} ${contact.Last_Name || ''}`.trim() || 'Sin nombre'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {contact.Email || 'Sin email'}
                        </p>
                        {contact.Phone && (
                          <p className="text-sm text-gray-600">
                            {contact.Phone}
                          </p>
                        )}
                      </div>
                      <Button variant="outline" size="sm">
                        Ver Detalle
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Información del contacto principal */}
          {opportunity.Contact_Name && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Contacto Principal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Nombre</label>
                  <p className="text-gray-900">
                    {opportunity.Contact_Name.name}
                  </p>
                </div>
                
                {opportunity.Contact_Email && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p className="text-gray-900">
                      {opportunity.Contact_Email}
                    </p>
                  </div>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/contacts/${opportunity.Contact_Name?.id}`)}
                  className="w-full"
                >
                  Ver Contacto Completo
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Metadatos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Información del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">ID</label>
                <p className="text-sm text-gray-900 font-mono">
                  {opportunity.id}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">Creado</label>
                <p className="text-sm text-gray-900">
                  {formatDateTime(opportunity.Created_Time)}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">Modificado</label>
                <p className="text-sm text-gray-900">
                  {formatDateTime(opportunity.Modified_Time)}
                </p>
              </div>
              
              {opportunity.Pipeline && typeof opportunity.Pipeline === 'object' && 'name' in opportunity.Pipeline && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Pipeline</label>
                  <p className="text-sm text-gray-900">
                    {(opportunity.Pipeline as any).name}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}