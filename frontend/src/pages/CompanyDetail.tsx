import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import type { Company, Opportunity } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Mail, Phone, Building2, Calendar, Edit, Plus, Globe, MapPin, DollarSign } from 'lucide-react';
import { OpportunityCard } from '@/components/opportunities/OpportunityCard';

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      navigate('/companies');
      return;
    }

    const fetchCompanyData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch company details using the specific ID endpoint
        const companyResponse = await api.getCompanyById(id);
        
        if (!companyResponse.success || !companyResponse.data) {
          setError(companyResponse.error || 'Cliente no encontrado');
          return;
        }
        
        const foundCompany = companyResponse.data;
        setCompany(foundCompany);

        // Fetch related opportunities only after we have the company
        const opportunitiesResponse = await api.getOpportunities();
        if (opportunitiesResponse.success && opportunitiesResponse.data?.opportunities) {
          // Filter opportunities related to this company
          const relatedOpportunities = opportunitiesResponse.data.opportunities.filter(
            (opp: Opportunity) => 
              opp.Account_Name?.id === foundCompany.id || 
              opp.Account_Name?.name === foundCompany.Account_Name
          );
          setOpportunities(relatedOpportunities);
        }
      } catch (error) {
        console.error('Error fetching company data:', error);
        setError('Error al cargar los datos del cliente');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyData();
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

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return 'No especificado';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
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

  if (error || !company) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
        <div className="text-destructive text-lg">{error || 'Cliente no encontrado'}</div>
        <Button onClick={() => navigate('/companies')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Clientes
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
            onClick={() => navigate('/companies')}
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center border-2 border-gray-400 dark:border-gray-500 hover:border-blue-500 dark:hover:border-blue-400 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            <ArrowLeft className="h-6 w-6 text-gray-800 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
              {company.Account_Name || 'Sin nombre'}
            </h1>
            <p className="text-sm text-muted-foreground dark:text-white">
              Cliente de Zoho Bigin
            </p>
          </div>
        </div>
        <Button 
          onClick={() => navigate(`/companies/${id}/edit`)}
          className="h-10 px-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm flex items-center justify-center"
        >
          <Edit className="h-4 w-4 mr-2" />
          Editar Cliente
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card className="shadow-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/30 rounded-t-lg border-b border-blue-200 dark:border-blue-800 p-4">
              <CardTitle className="flex items-center gap-3 text-base font-semibold text-foreground">
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                Información Básica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Nombre de la Empresa
                  </label>
                  <p className="text-xs font-medium text-foreground">
                    {company.Account_Name || 'No especificado'}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Sitio Web
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-md flex items-center justify-center">
                      <Globe className="h-3 w-3 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-xs font-medium text-foreground break-all">
                      {company.Website ? (
                        <a 
                          href={company.Website.startsWith('http') ? company.Website : `https://${company.Website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          {company.Website}
                        </a>
                      ) : 'No especificado'}
                    </p>
                  </div>
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
                      {company.Email || 'No especificado'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Teléfono
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-md flex items-center justify-center">
                      <Phone className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                    </div>
                    <p className="text-xs font-medium text-foreground">
                      {company.Phone || 'No especificado'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Ingresos Anuales
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 w-6 h-6 bg-yellow-100 dark:bg-yellow-900/30 rounded-md flex items-center justify-center">
                      <DollarSign className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <p className="text-xs font-medium text-foreground">
                      {formatCurrency(company.Annual_Revenue)}
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
                      {formatDate(company.Created_Time)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Billing Address */}
          {(company.Billing_Street || company.Billing_City || company.Billing_State || company.Billing_Country) && (
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/30 rounded-t-lg border-b border-blue-200 dark:border-blue-800 p-4">
                <CardTitle className="flex items-center gap-3 text-base font-semibold text-foreground">
                  <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  Dirección de Facturación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {company.Billing_Street && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Dirección
                      </label>
                      <p className="text-xs font-medium text-foreground">
                        {company.Billing_Street}
                      </p>
                    </div>
                  )}
                  {company.Billing_City && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Ciudad
                      </label>
                      <p className="text-xs font-medium text-foreground">
                        {company.Billing_City}
                      </p>
                    </div>
                  )}
                  {company.Billing_State && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Estado/Provincia
                      </label>
                      <p className="text-xs font-medium text-foreground">
                        {company.Billing_State}
                      </p>
                    </div>
                  )}
                  {company.Billing_Code && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Código Postal
                      </label>
                      <p className="text-xs font-medium text-foreground">
                        {company.Billing_Code}
                      </p>
                    </div>
                  )}
                  {company.Billing_Country && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        País
                      </label>
                      <p className="text-xs font-medium text-foreground">
                        {company.Billing_Country}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          {company.Description && (
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/30 rounded-t-lg border-b border-blue-200 dark:border-blue-800 p-4">
                <CardTitle className="text-base font-semibold text-foreground">
                  Descripción
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {company.Description}
                </p>
              </CardContent>
            </Card>
          )}
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
                    state: { accountName: company.Account_Name } 
                  })}
                  className="h-8 px-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm flex items-center justify-center"
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
                  <p className="text-sm text-muted-foreground mb-4">Crea la primera oportunidad para este cliente</p>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/opportunities/create', { 
                      state: { accountName: company.Account_Name } 
                    })}
                    className="px-4 h-9 text-sm font-medium flex items-center justify-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Oportunidad
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