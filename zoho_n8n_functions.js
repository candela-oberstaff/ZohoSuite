// Funciones JavaScript para n8n - Integración con Zoho Bigin
// Versión corregida que asegura que la propiedad 'response' siempre sea un string

// Función auxiliar para validar y formatear respuestas
function validateResponse(data) {
  if (!data) {
    return {
      success: false,
      response: "Error: No se recibió respuesta del servidor",
      data: null
    };
  }
  
  // Asegurar que response siempre sea un string
  let responseMessage = "";
  
  if (typeof data === 'string') {
    responseMessage = data;
  } else if (data.message) {
    responseMessage = String(data.message);
  } else if (data.error) {
    responseMessage = String(data.error);
  } else {
    responseMessage = "Operación completada";
  }
  
  return {
    success: data.success !== false,
    response: responseMessage,
    data: data.data || data
  };
}

// Función para crear query string
function createQueryString(params) {
  return Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
}

// Función para renovar el token de acceso de Zoho
async function getAccessToken() {
  try {
    const response = await fetch('http://localhost:8001/api/refresh-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success || !data.access_token) {
      return validateResponse({
        success: false,
        message: data.error || 'Error al obtener token de acceso'
      });
    }
    
    return validateResponse({
      success: true,
      message: 'Token obtenido exitosamente',
      access_token: data.access_token
    });
    
  } catch (error) {
    return validateResponse({
      success: false,
      message: `Error de conexión: ${error.message}`
    });
  }
}

// Función para crear un contacto en Zoho Bigin
async function createContact(contactData) {
  try {
    // Validar datos requeridos
    if (!contactData.First_Name || !contactData.Last_Name) {
      return validateResponse({
        success: false,
        message: 'First_Name y Last_Name son campos obligatorios'
      });
    }
    
    // Obtener token de acceso
    const tokenResult = await getAccessToken();
    if (!tokenResult.success) {
      return tokenResult;
    }
    
    // Preparar datos del contacto
    const contactPayload = {
      data: [{
        First_Name: contactData.First_Name,
        Last_Name: contactData.Last_Name,
        Email: contactData.Email || '',
        Phone: contactData.Phone || '',
        Mobile: contactData.Mobile || '',
        Account_Name: contactData.Account_Name || ''
      }]
    };
    
    // Crear contacto en Zoho
    const response = await fetch('https://www.zohoapis.com/bigin/v1/Contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${tokenResult.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contactPayload)
    });
    
    if (!response.ok) {
      return validateResponse({
        success: false,
        message: `Error HTTP: ${response.status} - ${response.statusText}`
      });
    }
    
    const result = await response.json();
    
    // Verificar si la creación fue exitosa
    if (result.data && result.data.length > 0 && result.data[0].details) {
      return validateResponse({
        success: true,
        message: `Contacto creado exitosamente con ID: ${result.data[0].details.id}`,
        data: {
          contact_id: result.data[0].details.id,
          contact_data: result.data[0]
        }
      });
    } else {
      return validateResponse({
        success: false,
        message: result.message || 'Error al crear contacto en Zoho'
      });
    }
    
  } catch (error) {
    return validateResponse({
      success: false,
      message: `Error al crear contacto: ${error.message}`
    });
  }
}

// Función para crear una oportunidad (Deal) en Zoho Bigin
async function createDeal(dealData) {
  try {
    // Validar datos requeridos
    if (!dealData.Deal_Name) {
      return validateResponse({
        success: false,
        message: 'Deal_Name es un campo obligatorio'
      });
    }
    
    // Obtener token de acceso
    const tokenResult = await getAccessToken();
    if (!tokenResult.success) {
      return tokenResult;
    }
    
    // Configurar Pipeline y Sub_Pipeline
    let pipelineId = "5725832000000006001"; // Pipeline por defecto
    let subPipelineId = dealData.Pipeline || "5725832000000006001";
    
    // Lógica especial para rutas específicas
    if (dealData.route === "empresas-productos") {
      pipelineId = "5725832000000006001";
      subPipelineId = "5725832000000006001";
    }
    
    // Preparar datos de la oportunidad
    const dealPayload = {
      data: [{
        Deal_Name: dealData.Deal_Name,
        Stage: dealData.Stage || "Qualification",
        Amount: dealData.Amount || 0,
        Closing_Date: dealData.Closing_Date || new Date().toISOString().split('T')[0],
        Pipeline: pipelineId,
        Sub_Pipeline: subPipelineId,
        Account_Name: dealData.Account_Name || '',
        Description: dealData.Description || ''
      }]
    };
    
    // Asociar contacto si se proporciona
    if (dealData.Contact_Name && dealData.Contact_Name.id) {
      dealPayload.data[0].Contact_Name = dealData.Contact_Name.id;
    }
    
    // Crear oportunidad en Zoho
    const response = await fetch('https://www.zohoapis.com/bigin/v1/Deals', {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${tokenResult.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dealPayload)
    });
    
    if (!response.ok) {
      return validateResponse({
        success: false,
        message: `Error HTTP: ${response.status} - ${response.statusText}`
      });
    }
    
    const result = await response.json();
    
    // Verificar si la creación fue exitosa
    if (result.data && result.data.length > 0 && result.data[0].details) {
      return validateResponse({
        success: true,
        message: `Oportunidad creada exitosamente con ID: ${result.data[0].details.id}`,
        data: {
          deal_id: result.data[0].details.id,
          deal_data: result.data[0]
        }
      });
    } else {
      return validateResponse({
        success: false,
        message: result.message || 'Error al crear oportunidad en Zoho'
      });
    }
    
  } catch (error) {
    return validateResponse({
      success: false,
      message: `Error al crear oportunidad: ${error.message}`
    });
  }
}

// Función combinada para crear contacto y oportunidad
async function createContactAndDeal(contactData, dealData) {
  try {
    let contactId = null;
    
    // Paso 1: Crear contacto si se proporciona información
    if (contactData && contactData.First_Name && contactData.Last_Name) {
      const contactResult = await createContact(contactData);
      if (!contactResult.success) {
        return contactResult;
      }
      contactId = contactResult.data.contact_id;
    }
    
    // Paso 2: Crear oportunidad
    if (contactId) {
      dealData.Contact_Name = { id: contactId };
    }
    
    const dealResult = await createDeal(dealData);
    
    if (dealResult.success) {
      return validateResponse({
        success: true,
        message: contactId ? 
          `Contacto y oportunidad creados exitosamente. Contact ID: ${contactId}, Deal ID: ${dealResult.data.deal_id}` :
          `Oportunidad creada exitosamente. Deal ID: ${dealResult.data.deal_id}`,
        data: {
          contact_id: contactId,
          deal_id: dealResult.data.deal_id,
          contact_data: contactId ? 'Creado' : null,
          deal_data: dealResult.data.deal_data
        }
      });
    } else {
      return dealResult;
    }
    
  } catch (error) {
    return validateResponse({
      success: false,
      message: `Error en el proceso: ${error.message}`
    });
  }
}

// Ejemplo de uso para n8n
// Esta función puede ser llamada desde un nodo de n8n
async function processZohoRequest(inputData) {
  try {
    const { action, contactData, dealData } = inputData;
    
    switch (action) {
      case 'createContact':
        return await createContact(contactData);
        
      case 'createDeal':
        return await createDeal(dealData);
        
      case 'createContactAndDeal':
        return await createContactAndDeal(contactData, dealData);
        
      default:
        return validateResponse({
          success: false,
          message: 'Acción no válida. Use: createContact, createDeal, o createContactAndDeal'
        });
    }
  } catch (error) {
    return validateResponse({
      success: false,
      message: `Error en processZohoRequest: ${error.message}`
    });
  }
}

// Exportar funciones para uso en n8n
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getAccessToken,
    createContact,
    createDeal,
    createContactAndDeal,
    processZohoRequest,
    validateResponse
  };
}

// Para uso directo en n8n, las funciones están disponibles globalmente
if (typeof global !== 'undefined') {
  global.getAccessToken = getAccessToken;
  global.createContact = createContact;
  global.createDeal = createDeal;
  global.createContactAndDeal = createContactAndDeal;
  global.processZohoRequest = processZohoRequest;
  global.validateResponse = validateResponse;
}