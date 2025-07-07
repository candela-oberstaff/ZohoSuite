import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { api } from '@/services/api';
import type { Opportunity, Contact } from '@/types'; // Asegúrate de que Contact esté importado
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Para el selector de contactos
import { ArrowLeft, Save, DollarSign, Calendar, Building2, Tag, User } from 'lucide-react'; // Añadido User icon
import { useToast } from '@/components/ui/use-toast';

interface OpportunityFormProps {
  mode: 'create' | 'edit';
}

interface LocationState {
  contactId?: string;
  accountName?: string;
}

// Eliminado DEFAULT_STAGES para forzar la carga desde el backend
// const DEFAULT_STAGES = [
//   { value: 'Calificación', label: 'Calificación' },
//   ...
// ];

export function OpportunityForm({ mode }: OpportunityFormProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [stages, setStages] = useState<Array<{value: string, label: string}>>([]); // Inicializar vacío
  const [contacts, setContacts] = useState<Contact[]>([]); // Para la lista de contactos
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(mode === 'edit');
  const [pipelineId, setPipelineId] = useState<string>('');
  
  const locationState = location.state as LocationState;
  
  const [formData, setFormData] = useState({
    Deal_Name: '',
    Amount: '',
    Stage: '', // Inicializar vacío, se establecerá desde la API
    Closing_Date: '',
    Account_Name: locationState?.accountName || '',
    Contact_Name: locationState?.contactId || '', // ID del contacto
  });

  // Referencia para controlar si ya se han cargado los datos iniciales
  const initialDataLoadedRef = useRef(false);

  // Cargar stages y contactos
  useEffect(() => {
    // Evitar cargar datos iniciales múltiples veces
    if (initialDataLoadedRef.current) return;
    
    const loadInitialData = async () => {
      setInitialLoading(true);
      try {
        // Detectar si estamos en el contexto de Empresas y Productos
        const isEmpresasProductosContext = location.pathname.includes('/empresas-productos');
        
        // Cargar Stages según el contexto
        console.log('Cargando stages del pipeline...', isEmpresasProductosContext ? 'Empresas y Productos' : 'General');
        const pipelineResponse = isEmpresasProductosContext 
          ? await api.getEmpresasProductosPipelineFields()
          : await api.getPipelineFields();
        console.log('Respuesta de pipeline fields:', pipelineResponse);
        
        if (pipelineResponse.success && pipelineResponse.data?.stages && pipelineResponse.data.stages.length > 0) {
          const apiStages = pipelineResponse.data.stages.map((stage: any) => ({
            value: stage.actual_value || stage.display_value,
            label: stage.display_value
          }));
          
          console.log('Stages del pipeline obtenidos:', apiStages);
          setStages(apiStages);
          setPipelineId(pipelineResponse.data.pipeline_id);
          
          if (mode === 'create' && apiStages.length > 0 && !formData.Stage) {
             setFormData(prev => ({ ...prev, Stage: apiStages[0].value }));
          }
        } else {
          console.error('No se encontraron stages específicos del pipeline o hubo un error:', pipelineResponse.error);
          setStages([]); // Dejar vacío si no hay stages desde la API
          toast({
            title: 'Error al cargar etapas',
            description: pipelineResponse.error || 'No se pudieron cargar las etapas del pipeline.',
            variant: 'destructive',
          });
        }

        // Cargar Contactos
        console.log('Cargando contactos...');
        const contactsResponse = await api.getContacts({ limit: 200 }); // Cargar hasta 200 contactos
        if (contactsResponse.success && contactsResponse.data?.items) {
          setContacts(contactsResponse.data.items);
          console.log('Contactos cargados:', contactsResponse.data.items);
        } else {
          console.error('Error al cargar contactos:', contactsResponse.error);
          toast({
            title: 'Error al cargar contactos',
            description: contactsResponse.error || 'No se pudieron cargar los contactos.',
            variant: 'destructive',
          });
        }

        // Marcar que los datos iniciales ya se han cargado
        initialDataLoadedRef.current = true;
      } catch (error) {
        console.error('Error al cargar datos iniciales:', error);
        setStages([]); // Dejar vacío en caso de error general
        toast({
          title: 'Error Crítico',
          description: 'No se pudieron cargar los datos necesarios para el formulario.',
          variant: 'destructive',
        });
      } finally {
        setInitialLoading(false);
      }
    };

    loadInitialData();
  }, [mode]); // Quitado formData.Stage de las dependencias para evitar recargas innecesarias

  // Referencia para controlar si ya se ha cargado la oportunidad
  const opportunityLoadedRef = useRef(false);

  useEffect(() => {
    // Solo cargar la oportunidad si estamos en modo edición, tenemos un ID, hay stages disponibles
    // y aún no se ha cargado la oportunidad
    if (mode === 'edit' && id && stages.length > 0 && !opportunityLoadedRef.current) {
      const fetchOpportunity = async () => {
        setInitialLoading(true);
        try {
          // Usar getOpportunityById para obtener directamente la oportunidad específica
          console.log('Obteniendo oportunidad con ID:', id);
          const response = await api.getOpportunityById(id);
          console.log('Respuesta de getOpportunityById:', response);
          
          if (response.success && response.data) {
            const opportunity = response.data;
            console.log('Oportunidad obtenida:', opportunity);
            
            setFormData({
              Deal_Name: opportunity.Deal_Name || '',
              Amount: opportunity.Amount?.toString() || '',
              Stage: opportunity.Stage || (stages.length > 0 ? stages[0].value : ''),
              Closing_Date: opportunity.Closing_Date ? 
                new Date(opportunity.Closing_Date).toISOString().split('T')[0] : '',
              Account_Name: opportunity.Account_Name?.name || '',
              Contact_Name: opportunity.Contact_Name?.id || '' // Asumiendo que Contact_Name tiene un id
            });
            
            if (opportunity.Pipeline?.id) {
              setPipelineId(opportunity.Pipeline.id);
            }
            
            // Marcar que la oportunidad ya se ha cargado
            opportunityLoadedRef.current = true;
          } else {
            console.error('Error al obtener la oportunidad:', response.error);
            toast({
              title: 'Error',
              description: response.error || 'Oportunidad no encontrada',
              variant: 'destructive'
            });
            navigate('/opportunities');
          }
        } catch (error) {
          console.error('Error al cargar la oportunidad:', error);
          toast({
            title: 'Error',
            description: 'Error al cargar la oportunidad para editar.',
            variant: 'destructive'
          });
          navigate('/opportunities');
        } finally {
          setInitialLoading(false);
        }
      };

      fetchOpportunity();
    }
  }, [mode, id, navigate, toast, stages]); // Mantenemos stages como dependencia pero usamos ref para controlar la carga

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.Deal_Name.trim()) {
      toast({ title: 'Error de validación', description: 'El nombre del negocio es obligatorio', variant: 'destructive' });
      return;
    }
    if (!formData.Stage) {
      toast({ title: 'Error de validación', description: 'La etapa es obligatoria.', variant: 'destructive' });
      return;
    }
    if (!formData.Contact_Name || formData.Contact_Name === 'none') {
      toast({ title: 'Error de validación', description: 'El contacto asociado es obligatorio. Por favor, seleccione un contacto existente o cree uno nuevo.', variant: 'destructive' });
      return;
    }
    // Más validaciones si son necesarias...

    setLoading(true);
    console.log('Iniciando creación de oportunidad...');
    
    try {
      // Limpiar el valor de Amount para asegurar que solo contenga números y punto decimal
      const cleanAmount = formData.Amount ? formData.Amount.replace(/[^\d.]/g, '') : '';
      const numericAmount = cleanAmount ? Number(cleanAmount) : undefined;
      
      console.log('Amount original:', formData.Amount);
      console.log('Amount limpio:', cleanAmount);
      console.log('Amount numérico:', numericAmount);
      
      const opportunityData: any = {
        Deal_Name: formData.Deal_Name,
        Stage: formData.Stage,
        Amount: numericAmount, // Usar el valor numérico limpio
        Closing_Date: formData.Closing_Date || undefined, // Enviar undefined si está vacío
        Account_Name: formData.Account_Name || undefined,
        Pipeline: pipelineId, // Usar el pipeline ID obtenido de la API
      };

      if (formData.Contact_Name && formData.Contact_Name !== 'none') { // Si se seleccionó un contacto
        opportunityData.Contact_Name = formData.Contact_Name; // Enviar el ID del contacto con el nombre correcto
      }
      
      console.log('Datos de oportunidad a enviar:', opportunityData);
      
      if (mode === 'create') {
        console.log('Enviando datos para crear oportunidad:', opportunityData);
        
        try {
          console.log('Iniciando llamada a api.createOpportunity...');
          const response = await api.createOpportunity(opportunityData);
          console.log('Respuesta completa de creación de oportunidad:', response);
          
          // Verificar explícitamente que la respuesta existe y tiene success=true
          if (response && response.success === true) {
            console.log('Oportunidad creada exitosamente con respuesta:', response);
            toast({ 
              title: 'Éxito', 
              description: 'Oportunidad creada exitosamente',
              variant: 'default'
            });
            
            // Pequeña pausa para asegurar que el toast se muestre antes de la redirección
            setTimeout(() => {
              // Detectar si estamos en el contexto de Empresas y Productos para redirigir correctamente
              const isEmpresasProductosContext = location.pathname.includes('/empresas-productos');
              const redirectPath = isEmpresasProductosContext ? '/empresas-productos' : '/opportunities';
              console.log('Redirigiendo a', redirectPath, 'después de crear oportunidad');
              navigate(redirectPath);
            }, 1000); // Aumentado a 1 segundo para dar más tiempo
          } else {
            // Respuesta existe pero success no es true
            console.error('Error en la respuesta del servidor:', response);
            toast({ 
              title: 'Error al crear', 
              description: (response && response.error) 
                ? response.error 
                : 'El servidor no pudo crear la oportunidad. Por favor, inténtelo de nuevo.', 
              variant: 'destructive' 
            });
            setLoading(false); // Asegurar que se desactiva el estado de carga
          }
        } catch (apiError) {
          // Error en la llamada a la API
          console.error('Error en la llamada a la API createOpportunity:', apiError);
          toast({ 
            title: 'Error de conexión', 
            description: 'No se pudo conectar con el servidor. Por favor, verifique su conexión e inténtelo de nuevo.', 
            variant: 'destructive' 
          });
          setLoading(false); // Asegurar que se desactiva el estado de carga
        }
      } else if (mode === 'edit' && id) {
        console.log('Enviando datos para actualizar oportunidad:', { ...opportunityData, id });
        try {
          const response = await api.updateOpportunity(id, opportunityData);
          console.log('Respuesta completa de actualización de oportunidad:', response);
          
          if (response && response.success === true) {
            console.log('Oportunidad actualizada exitosamente con respuesta:', response);
            toast({ 
              title: 'Éxito', 
              description: 'Oportunidad actualizada exitosamente',
              variant: 'default'
            });
            
            // Pequeña pausa para asegurar que el toast se muestre antes de la redirección
            setTimeout(() => {
              // Detectar si estamos en el contexto de Empresas y Productos para redirigir correctamente
              const isEmpresasProductosContext = location.pathname.includes('/empresas-productos');
              const redirectPath = isEmpresasProductosContext ? '/empresas-productos' : '/opportunities';
              console.log('Redirigiendo a', redirectPath, 'después de actualizar oportunidad');
              navigate(redirectPath);
            }, 1000);
          } else {
            console.error('Error en la respuesta del servidor:', response);
            toast({ 
              title: 'Error al actualizar', 
              description: (response && response.error) 
                ? response.error 
                : 'El servidor no pudo actualizar la oportunidad. Por favor, inténtelo de nuevo.', 
              variant: 'destructive' 
            });
            setLoading(false);
          }
        } catch (apiError) {
          console.error('Error en la llamada a la API updateOpportunity:', apiError);
          toast({ 
            title: 'Error de conexión', 
            description: 'No se pudo conectar con el servidor. Por favor, verifique su conexión e inténtelo de nuevo.', 
            variant: 'destructive' 
          });
          setLoading(false);
        }
      }
    } catch (error) {
      // Error general en el proceso
      console.error('Error general al procesar la oportunidad:', error);
      toast({ 
        title: 'Error inesperado', 
        description: `Se produjo un error inesperado al ${mode === 'create' ? 'crear' : 'actualizar'} la oportunidad. Por favor, inténtelo de nuevo.`, 
        variant: 'destructive' 
      });
      setLoading(false); // Asegurar que se desactiva el estado de carga en caso de error
    }
  };

  const formatAmount = (value: string) => {
    // Remove non-numeric characters except decimal point
    const numericValue = value.replace(/[^\d.]/g, '');
    
    // Format with thousands separator
    if (numericValue) {
      const number = parseFloat(numericValue);
      if (!isNaN(number)) {
        return number.toLocaleString('es-ES');
      }
    }
    return numericValue;
  };

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button onClick={() => {
            const isEmpresasProductosContext = location.pathname.includes('/empresas-productos');
            const backPath = isEmpresasProductosContext ? '/empresas-productos' : '/opportunities';
            navigate(backPath);
          }} variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Cargando Formulario...</h1>
        </div>
        <Card><CardContent className="p-6"><div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div><div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div><div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div><div className="h-10 bg-gray-200 rounded"></div>
        </div></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button onClick={() => {
          const isEmpresasProductosContext = location.pathname.includes('/empresas-productos');
          const backPath = isEmpresasProductosContext ? '/empresas-productos' : '/opportunities';
          navigate(backPath);
        }} variant="outline" size="icon">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">
          {mode === 'create' ? 'Crear Nueva Oportunidad' : 'Editar Oportunidad'}
        </h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />Información de la Oportunidad</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nombre del Negocio */}
              <div className="space-y-2">
                <label htmlFor="dealName" className="text-sm font-medium text-gray-700">Nombre del Negocio *</label>
                <Input id="dealName" type="text" value={formData.Deal_Name} onChange={(e) => handleInputChange('Deal_Name', e.target.value)} placeholder="Ingrese el nombre del negocio" required />
              </div>

              {/* Monto */}
              <div className="space-y-2">
                <label htmlFor="amount" className="text-sm font-medium text-gray-700">Monto</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input id="amount" type="text" value={formData.Amount} onChange={(e) => handleInputChange('Amount', e.target.value.replace(/[^\d.]/g, ''))} placeholder="0" className="pl-10" />
                </div>
              </div>

              {/* Etapa */}
              <div className="space-y-2">
                <label htmlFor="stage" className="text-sm font-medium text-gray-700">Etapa *</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Select value={formData.Stage} onValueChange={(value) => handleInputChange('Stage', value)} required>
                    <SelectTrigger className="pl-10">
                      <SelectValue placeholder="Seleccione una etapa" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.length > 0 ? stages.map((stage) => (
                        <SelectItem key={stage.value} value={stage.value}>
                          {stage.label}
                        </SelectItem>
                      )) : <SelectItem value="no_stages" disabled>No hay etapas disponibles</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Fecha de Cierre */}
              <div className="space-y-2">
                <label htmlFor="closingDate" className="text-sm font-medium text-gray-700">Fecha de Cierre</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input id="closingDate" type="date" value={formData.Closing_Date} onChange={(e) => handleInputChange('Closing_Date', e.target.value)} className="pl-10" />
                </div>
              </div>

              {/* Empresa (Account_Name) */}
              <div className="space-y-2">
                <label htmlFor="accountName" className="text-sm font-medium text-gray-700">Empresa</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input id="accountName" type="text" value={formData.Account_Name} onChange={(e) => handleInputChange('Account_Name', e.target.value)} placeholder="Nombre de la empresa" className="pl-10" />
                </div>
              </div>
              
              {/* Contacto (Contact_Name como ID) */}
              <div className="space-y-2">
                <label htmlFor="contactName" className="text-sm font-medium text-gray-700">Contacto Asociado *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Select value={formData.Contact_Name} onValueChange={(value) => handleInputChange('Contact_Name', value)}>
                    <SelectTrigger className="pl-10">
                      <SelectValue placeholder="Seleccione un contacto" />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id!}>
                          {contact.First_Name} {contact.Last_Name} ({contact.Email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                 <Button type="button" variant="link" onClick={() => navigate('/contacts/create')} className="mt-1 text-sm">Crear Nuevo Contacto</Button>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-4 pt-6 border-t">
              <Button type="button" variant="outline" onClick={() => navigate('/opportunities')} disabled={loading}>Cancelar</Button>
              <Button type="submit" disabled={loading || initialLoading} className="min-w-[140px]">
                {loading ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>{mode === 'create' ? 'Creando...' : 'Guardando...'}</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" />{mode === 'create' ? 'Crear Oportunidad' : 'Guardar Cambios'}</>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-gray-600">
            <p className="font-medium mb-2">Información importante:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Los campos marcados con * son obligatorios.</li>
              <li>Asegúrese de que las etapas del pipeline estén configuradas correctamente en Zoho Bigin.</li>
              <li>Puede asociar un contacto existente o crear uno nuevo.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}