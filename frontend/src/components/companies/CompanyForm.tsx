import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/services/api';
import type { Company } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Building2, Mail, Phone, Globe, MapPin, DollarSign } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface CompanyFormProps {
  mode: 'create' | 'edit';
}

export function CompanyForm({ mode }: CompanyFormProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(mode === 'edit');
  const [formData, setFormData] = useState({
    Account_Name: '',
    Website: '',
    Phone: '',
    Email: '',
    Billing_Street: '',
    Billing_City: '',
    Billing_State: '',
    Billing_Code: '',
    Billing_Country: '',
    Annual_Revenue: '',
    Description: ''
  });

  useEffect(() => {
    if (mode === 'edit' && id) {
      const fetchCompany = async () => {
        setInitialLoading(true);
        try {
          const response = await api.getCompanyById(id);
          if (response.success && response.data) {
            const company = response.data;
            setFormData({
              Account_Name: company.Account_Name || '',
              Website: company.Website || '',
              Phone: company.Phone || '',
              Email: company.Email || '',
              Billing_Street: company.Billing_Street || '',
              Billing_City: company.Billing_City || '',
              Billing_State: company.Billing_State || '',
              Billing_Code: company.Billing_Code || '',
              Billing_Country: company.Billing_Country || '',
              Annual_Revenue: company.Annual_Revenue?.toString() || '',
              Description: company.Description || ''
            });
          } else {
            toast({
              title: 'Error',
              description: 'Cliente no encontrado',
              variant: 'destructive'
            });
            navigate('/companies');
          }
        } catch (error) {
          toast({
            title: 'Error',
            description: 'Error al cargar el cliente',
            variant: 'destructive'
          });
          navigate('/companies');
        } finally {
          setInitialLoading(false);
        }
      };

      fetchCompany();
    }
  }, [mode, id]);

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.Account_Name.trim()) {
      toast({
        title: 'Error de validación',
        description: 'El nombre de la empresa es obligatorio',
        variant: 'destructive'
      });
      return;
    }

    if (formData.Email && !isValidEmail(formData.Email)) {
      toast({
        title: 'Error de validación',
        description: 'El formato del email no es válido',
        variant: 'destructive'
      });
      return;
    }

    if (formData.Website && !isValidWebsite(formData.Website)) {
      toast({
        title: 'Error de validación',
        description: 'El formato del sitio web no es válido',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    
    try {
      const submitData = {
        ...formData,
        Annual_Revenue: formData.Annual_Revenue ? parseFloat(formData.Annual_Revenue) : undefined
      };

      if (mode === 'create') {
        const response = await api.createCompany(submitData);
        if (response.success) {
          toast({
            title: 'Éxito',
            description: 'Cliente creado exitosamente',
          });
          navigate('/companies');
        } else {
          throw new Error(response.error || 'Error al crear el cliente');
        }
      } else {
        const response = await api.updateCompany(id!, submitData);
        if (response.success) {
          toast({
            title: 'Éxito',
            description: 'Cliente actualizado exitosamente',
          });
          navigate('/companies');
        } else {
          throw new Error(response.error || 'Error al actualizar el cliente');
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : `Error al ${mode === 'create' ? 'crear' : 'actualizar'} el cliente`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidWebsite = (website: string) => {
    try {
      new URL(website.startsWith('http') ? website : `https://${website}`);
      return true;
    } catch {
      return false;
    }
  };

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate('/companies')}
            variant="outline"
            size="icon"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Cargando...
          </h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          onClick={() => navigate('/companies')}
          variant="outline"
          size="icon"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {mode === 'create' ? 'Crear Nuevo Cliente' : 'Editar Cliente'}
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información Básica */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Información Básica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nombre de la Empresa *
                </label>
                <Input
                  type="text"
                  value={formData.Account_Name}
                  onChange={(e) => handleInputChange('Account_Name', e.target.value)}
                  placeholder="Ingrese el nombre de la empresa"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sitio Web
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    value={formData.Website}
                    onChange={(e) => handleInputChange('Website', e.target.value)}
                    placeholder="www.ejemplo.com"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Teléfono
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="tel"
                    value={formData.Phone}
                    onChange={(e) => handleInputChange('Phone', e.target.value)}
                    placeholder="+1 234 567 8900"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="email"
                    value={formData.Email}
                    onChange={(e) => handleInputChange('Email', e.target.value)}
                    placeholder="contacto@empresa.com"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Ingresos Anuales
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="number"
                  value={formData.Annual_Revenue}
                  onChange={(e) => handleInputChange('Annual_Revenue', e.target.value)}
                  placeholder="1000000"
                  className="pl-10"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dirección de Facturación */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Dirección de Facturación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Dirección
              </label>
              <Input
                type="text"
                value={formData.Billing_Street}
                onChange={(e) => handleInputChange('Billing_Street', e.target.value)}
                placeholder="Calle, número, colonia"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ciudad
                </label>
                <Input
                  type="text"
                  value={formData.Billing_City}
                  onChange={(e) => handleInputChange('Billing_City', e.target.value)}
                  placeholder="Ciudad"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Estado/Provincia
                </label>
                <Input
                  type="text"
                  value={formData.Billing_State}
                  onChange={(e) => handleInputChange('Billing_State', e.target.value)}
                  placeholder="Estado o Provincia"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Código Postal
                </label>
                <Input
                  type="text"
                  value={formData.Billing_Code}
                  onChange={(e) => handleInputChange('Billing_Code', e.target.value)}
                  placeholder="12345"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  País
                </label>
                <Input
                  type="text"
                  value={formData.Billing_Country}
                  onChange={(e) => handleInputChange('Billing_Country', e.target.value)}
                  placeholder="País"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Descripción */}
        <Card>
          <CardHeader>
            <CardTitle>Descripción</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Notas adicionales
              </label>
              <Textarea
                value={formData.Description}
                onChange={(e) => handleInputChange('Description', e.target.value)}
                placeholder="Información adicional sobre el cliente..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Botones de acción */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/companies')}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {mode === 'create' ? 'Creando...' : 'Actualizando...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {mode === 'create' ? 'Crear Cliente' : 'Actualizar Cliente'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}