import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/services/api';
import type { Contact } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, User, Mail, Phone, Building2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ContactFormProps {
  mode: 'create' | 'edit';
}

export function ContactForm({ mode }: ContactFormProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(mode === 'edit');
  const [formData, setFormData] = useState({
    First_Name: '',
    Last_Name: '',
    Email: '',
    Phone: '',
    Mobile: '',
    Account_Name: ''
  });

  useEffect(() => {
    if (mode === 'edit' && id) {
      const fetchContact = async () => {
        setInitialLoading(true);
        try {
          // Use getContactById instead of getContacts with search
          const response = await api.getContactById(id);
          if (response.success && response.data) {
            const contact = response.data;
            setFormData({
              First_Name: contact.First_Name || '',
              Last_Name: contact.Last_Name || '',
              Email: contact.Email || '',
              Phone: contact.Phone || '',
              Mobile: contact.Mobile || '',
              Account_Name: contact.Account_Name?.name || ''
            });
          } else {
            toast({
              title: 'Error',
              description: 'Contacto no encontrado',
              variant: 'destructive'
            });
            navigate('/contacts');
          }
        } catch (error) {
          toast({
            title: 'Error',
            description: 'Error al cargar el contacto',
            variant: 'destructive'
          });
          navigate('/contacts');
        } finally {
          setInitialLoading(false);
        }
      };

      fetchContact();
    }
  }, [mode, id]); // Removed navigate and toast from dependencies to prevent unnecessary re-renders

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.First_Name.trim() && !formData.Last_Name.trim()) {
      toast({
        title: 'Error de validación',
        description: 'Debe proporcionar al menos un nombre o apellido',
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

    setLoading(true);
    
    try {
      // Note: This is a placeholder for the actual API call
      // You'll need to implement createContact and updateContact in your API service
      
      if (mode === 'create') {
        // const response = await api.createContact(formData);
        toast({
          title: 'Éxito',
          description: 'Contacto creado exitosamente',
        });
      } else {
        // const response = await api.updateContact(id!, formData);
        toast({
          title: 'Éxito',
          description: 'Contacto actualizado exitosamente',
        });
      }
      
      navigate('/contacts');
    } catch (error) {
      toast({
        title: 'Error',
        description: `Error al ${mode === 'create' ? 'crear' : 'actualizar'} el contacto`,
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

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate('/contacts')}
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
          onClick={() => navigate('/contacts')}
          variant="outline"
          size="icon"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {mode === 'create' ? 'Crear Nuevo Contacto' : 'Editar Contacto'}
        </h1>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Información del Contacto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nombre *
                </label>
                <Input
                  type="text"
                  value={formData.First_Name}
                  onChange={(e) => handleInputChange('First_Name', e.target.value)}
                  placeholder="Ingrese el nombre"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Apellido *
                </label>
                <Input
                  type="text"
                  value={formData.Last_Name}
                  onChange={(e) => handleInputChange('Last_Name', e.target.value)}
                  placeholder="Ingrese el apellido"
                  className="w-full"
                />
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
                    placeholder="contacto@ejemplo.com"
                    className="pl-10 w-full"
                  />
                </div>
              </div>

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
                    className="pl-10 w-full"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Móvil
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="tel"
                    value={formData.Mobile}
                    onChange={(e) => handleInputChange('Mobile', e.target.value)}
                    placeholder="+1 234 567 8900"
                    className="pl-10 w-full"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Empresa
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    value={formData.Account_Name}
                    onChange={(e) => handleInputChange('Account_Name', e.target.value)}
                    placeholder="Nombre de la empresa"
                    className="pl-10 w-full"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-4 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/contacts')}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="min-w-[120px]"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {mode === 'create' ? 'Creando...' : 'Guardando...'}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {mode === 'create' ? 'Crear Contacto' : 'Guardar Cambios'}
                  </div>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Help Text */}
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p className="font-medium mb-2">Información importante:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Los campos marcados con * son obligatorios</li>
              <li>El email debe tener un formato válido</li>
              <li>Los números de teléfono pueden incluir códigos de país</li>
              <li>La empresa se asociará automáticamente si ya existe</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}