import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import type { Contact, Opportunity } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Mail, Phone, User, Building2, Calendar, Edit, Plus } from 'lucide-react';
import { OpportunityCard } from '@/components/opportunities/OpportunityCard';

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      navigate('/contacts');
      return;
    }

    const fetchContactData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch contact details using the specific ID endpoint
        const contactResponse = await api.getContactById(id);
        
        if (!contactResponse.success || !contactResponse.data) {
          setError(contactResponse.error || 'Contacto no encontrado');
          return;
        }
        
        const foundContact = contactResponse.data;
        setContact(foundContact);

        // Fetch related opportunities only after we have the contact
        const opportunitiesResponse = await api.getOpportunities();
        if (opportunitiesResponse.success && opportunitiesResponse.data?.opportunities) {
          // Filter opportunities related to this specific contact
          // Check Account_Name match, Contact_Name match, or if Deal_Name contains contact name
          const relatedOpportunities = opportunitiesResponse.data.opportunities.filter(
            opp => {
              // 1. Check if the opportunity has the same Account_Name as the contact
              if (foundContact.Account_Name?.id && opp.Account_Name?.id) {
                return opp.Account_Name.id === foundContact.Account_Name.id;
              }
              
              // 2. Check if the opportunity has Contact_Name that matches this contact's ID
              if (opp.Contact_Name && opp.Contact_Name.id === foundContact.id) {
                return true;
              }
              
              // 3. Check if opportunity name contains contact name (as fallback)
              const contactFullName = foundContact.Full_Name || 
                `${foundContact.First_Name || ''} ${foundContact.Last_Name || ''}`.trim();
              
              if (contactFullName && opp.Deal_Name) {
                return opp.Deal_Name.toLowerCase().includes(contactFullName.toLowerCase());
              }
              
              return false;
            }
          );
          setOpportunities(relatedOpportunities);
        }
      } catch (err) {
        setError('Error al cargar los datos del contacto');
        console.error('Error fetching contact data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContactData();
  }, [id, navigate]);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'No definida';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  if (error || !contact) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
        <div className="text-destructive text-lg">{error || 'Contacto no encontrado'}</div>
        <Button onClick={() => navigate('/contacts')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Contactos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate('/contacts')}
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center border-2 border-gray-400 dark:border-gray-500 hover:border-blue-500 dark:hover:border-blue-400 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            <ArrowLeft className="h-6 w-6 text-gray-800 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
              {contact.Full_Name || `${contact.First_Name || ''} ${contact.Last_Name || ''}`.trim() || 'Sin nombre'}
            </h1>
            <p className="text-sm text-muted-foreground dark:text-white">
              {contact.Account_Name?.name || 'Sin empresa'}
            </p>
          </div>
        </div>
        <Button 
          onClick={() => navigate(`/contacts/${id}/edit`)}
          className="h-10 px-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 bg-green-600 hover:bg-green-700 text-white font-medium text-sm flex items-center justify-center"
        >
          <Edit className="h-4 w-4 mr-2" />
          Editar Contacto
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Information */}
        <div className="lg:col-span-2">
          <Card className="shadow-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/30 rounded-t-lg border-b border-blue-200 dark:border-blue-800 p-4">
              <CardTitle className="flex items-center gap-3 text-base font-semibold text-foreground">
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                  <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                Información del Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Nombre Completo
                  </label>
                  <p className="text-xs font-medium text-foreground">
                    {contact.Full_Name || `${contact.First_Name || ''} ${contact.Last_Name || ''}`.trim() || 'No especificado'}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Email
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-md flex items-center justify-center">
                      <Mail className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-xs font-medium text-foreground break-all">
                      {contact.Email || 'No especificado'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Teléfono
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-md flex items-center justify-center">
                      <Phone className="h-3 w-3 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-xs font-medium text-foreground">
                      {contact.Phone || 'No especificado'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Móvil
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-md flex items-center justify-center">
                      <Phone className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                    </div>
                    <p className="text-xs font-medium text-foreground">
                      {contact.Mobile || 'No especificado'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Empresa
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 w-6 h-6 bg-orange-100 dark:bg-orange-900/30 rounded-md flex items-center justify-center">
                      <Building2 className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                    </div>
                    <p className="text-xs font-medium text-foreground">
                      {contact.Account_Name?.name || 'No especificado'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Fecha de Creación
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 w-6 h-6 bg-muted rounded-md flex items-center justify-center">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <p className="text-xs font-medium text-foreground">
                      {formatDate(contact.Created_Time)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Related Opportunities */}
        <div>
          <Card className="shadow-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/30 rounded-t-lg border-b border-blue-200 dark:border-blue-800 p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-base font-semibold text-foreground">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  Oportunidades Relacionadas
                </CardTitle>
                <Button
                  onClick={() => navigate('/opportunities/create', { 
                    state: { contactId: contact.id, accountName: contact.Account_Name?.name } 
                  })}
                  className="h-8 px-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 bg-green-600 hover:bg-green-700 text-white font-medium text-sm flex items-center justify-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nueva
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {opportunities.length > 0 ? (
                <div className="space-y-4">
                  {opportunities.map((opportunity) => (
                    <div 
                      key={opportunity.id} 
                      className="cursor-pointer transform hover:scale-[1.02] transition-transform duration-200" 
                      onClick={() => navigate(`/opportunities/${opportunity.id}`)}
                    >
                      <OpportunityCard opportunity={opportunity} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Building2 className="h-6 w-6 opacity-50" />
                  </div>
                  <h3 className="text-base font-medium text-foreground mb-2">No hay oportunidades relacionadas</h3>
                  <p className="text-sm text-muted-foreground mb-4">Crea la primera oportunidad para este contacto</p>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/opportunities/create', { 
                      state: { contactId: contact.id, accountName: contact.Account_Name?.name } 
                    })}
                    className="px-4 h-9 text-sm font-medium flex items-center justify-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Primera Oportunidad
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}