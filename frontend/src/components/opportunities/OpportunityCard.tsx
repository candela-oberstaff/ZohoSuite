import type { Opportunity, Contact } from '../../types';
import { useState, useEffect } from 'react';
import { Building2, Calendar, DollarSign, Clock, Tag, User } from 'lucide-react';
import { api } from '../../services/api';

interface OpportunityCardProps {
  opportunity: Opportunity;
}

export function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [contactInfo, setContactInfo] = useState<Contact | null>(null);
  const [loadingContact, setLoadingContact] = useState(false);

  // Efecto para cargar el contacto si solo tenemos el ID
  useEffect(() => {
    // Si tenemos un contacto asociado pero solo tenemos el ID y no el nombre
    if (opportunity.Contact_Name?.id && (!opportunity.Contact_Name.name || opportunity.Contact_Name.name === opportunity.Contact_Name.id)) {
      setLoadingContact(true);
      
      // Obtener los detalles del contacto usando el ID
      api.getContactById(opportunity.Contact_Name.id, { useCache: true })
        .then(response => {
          if (response.success && response.data) {
            setContactInfo(response.data);
          }
        })
        .catch(error => {
          console.error('Error al cargar el contacto:', error);
        })
        .finally(() => {
          setLoadingContact(false);
        });
    }
  }, [opportunity.Contact_Name]);

  // Función para formatear el monto con separador de miles
  const formatAmount = (amount: number | undefined) => {
    if (!amount) return '$0';
    return `$${amount.toLocaleString('es-ES')}`;
  };

  // Función para formatear la fecha
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'No definida';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Función para obtener el nombre del contacto
  const getContactName = () => {
    // Si hemos cargado la información del contacto, usarla
    if (contactInfo) {
      return contactInfo.Full_Name || `${contactInfo.First_Name || ''} ${contactInfo.Last_Name || ''}`.trim() || 'Sin nombre';
    }
    
    // Si tenemos el nombre del contacto en la oportunidad y no es igual al ID
    if (opportunity.Contact_Name?.name && opportunity.Contact_Name.name !== opportunity.Contact_Name.id) {
      return opportunity.Contact_Name.name;
    }
    
    // Si estamos cargando el contacto
    if (loadingContact) {
      return 'Cargando...';
    }
    
    // Si no hay contacto asociado
    if (!opportunity.Contact_Name) {
      return 'Sin Contactar Outbound';
    }
    
    // Si solo tenemos el ID
    return 'Sin Contactar Outbound';
  };

  // Determinar el color y estilo según la etapa - Tema fijo verde y blanco
  const getStageStyles = (stage: string | undefined) => {
    if (!stage) return {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      border: 'border-gray-200',
      icon: '❓'
    };
    
    switch(stage) {
      case 'Closed Won':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          border: 'border-green-200',
          icon: '✅'
        };
      case 'Closed Lost':
        return {
          bg: 'bg-red-100',
          text: 'text-red-800',
          border: 'border-red-200',
          icon: '❌'
        };
      case 'Calificación':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          border: 'border-green-200',
          icon: '🎯'
        };
      case 'Propuesta':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-800',
          border: 'border-blue-200',
          icon: '📋'
        };
      case 'Negociación':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          border: 'border-green-200',
          icon: '🤝'
        };
      case 'Contrato Enviado':
        return {
          bg: 'bg-blue-50',
          text: 'text-blue-800',
          border: 'border-blue-200',
          icon: '📄'
        };
      case 'Despachado':
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          border: 'border-gray-200',
          icon: '📦'
        };
      case 'Firmado':
        return {
          bg: 'bg-emerald-100',
          text: 'text-emerald-800',
          border: 'border-emerald-200',
          icon: '✍️'
        };
      case 'Contrato Firmado':
        return {
          bg: 'bg-cyan-50',
          text: 'text-cyan-800',
          border: 'border-cyan-200',
          icon: '📝'
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          border: 'border-gray-200',
          icon: '📊'
        };
    }
  };

  const stageStyles = getStageStyles(opportunity.Stage);

  return (
    <div className="card-hover bg-white border border-gray-200 rounded-lg p-4">
      {/* Header con nombre del negocio */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-800 truncate">
            {opportunity.Deal_Name || 'Sin nombre'}
          </h3>
          <p className="text-sm text-gray-600 flex items-center mt-1">
            <Building2 className="w-4 h-4 mr-1" />
            {opportunity.Account_Name?.name || 'Sin cuenta'}
          </p>
          {/* Añadimos la información del contacto */}
          <p className="text-sm text-gray-600 flex items-center mt-1">
            <User className="w-4 h-4 mr-1" />
            {getContactName()}
          </p>
        </div>
        
        {/* Badge de etapa */}
        <div className={`
          px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1
          ${stageStyles.bg} ${stageStyles.text} ${stageStyles.border}
        `}>
          <span>{stageStyles.icon}</span>
          <span>{opportunity.Stage || 'Sin etapa'}</span>
        </div>
      </div>

      {/* Información principal */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Monto */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="text-xs text-gray-600 font-medium">
              Monto
            </span>
          </div>
          <p className="text-base font-semibold text-gray-800">
            {formatAmount(opportunity.Amount)}
          </p>
        </div>

        {/* Fecha de cierre */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-gray-600 font-medium">
              Cierre
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-800">
            {formatDate(opportunity.Closing_Date)}
          </p>
        </div>
      </div>

      {/* Footer con timestamps */}
      <div className="pt-3 border-t border-gray-200">
        <div className="flex justify-between items-center text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Creado: {formatDate(opportunity.Created_Time)}</span>
          </div>
          {opportunity.Modified_Time && (
            <div className="flex items-center gap-1">
              <Tag className="w-3 h-3" />
              <span>Modificado: {formatDate(opportunity.Modified_Time)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}