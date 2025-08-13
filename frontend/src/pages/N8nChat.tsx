import React, { useEffect, useState } from 'react';
import '@n8n/chat/style.css';
import '../styles/n8n-chat-custom.css';
import { createChat } from '@n8n/chat';

const N8nChat: React.FC = () => {
  const [webhookUrl, setWebhookUrl] = useState<string>(
    localStorage.getItem('n8n-webhook-url') || 'https://n8n.obertrack.com/webhook/f8d4bfd1-2901-44c9-a7d3-d492cfe1c4c6/chat'
  );
  const [isConfigured, setIsConfigured] = useState<boolean>(true);
  const [chatInstance, setChatInstance] = useState<any>(null);

  useEffect(() => {
    if (webhookUrl) {
      setIsConfigured(true);
      // Limpiar instancia anterior si existe
      if (chatInstance) {
        const chatContainer = document.getElementById('n8n-chat');
        if (chatContainer) {
          chatContainer.innerHTML = '';
        }
      }

      // Crear nueva instancia del chat
      const newChatInstance = createChat({
        webhookUrl: webhookUrl,
        target: '#n8n-chat',
        mode: 'fullscreen',
        showWelcomeScreen: false,
        loadPreviousSession: true,
        chatInputKey: 'chatInput',
        chatSessionKey: 'sessionId',
        allowFileUploads: true,
        allowedFilesMimeTypes: 'image/*,application/pdf,text/*,.doc,.docx,.xls,.xlsx',
        metadata: {
          source: 'zoho-crm',
          version: '1.0',
          userId: 'zoho-user'
        },
        webhookConfig: {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Source': 'Zoho-CRM'
          }
        },
        initialMessages: [
          '¡Hola! 👋',
          'Soy tu asistente de IA de Zoho. ¿En qué puedo ayudarte hoy?',
          'Puedes preguntarme sobre contactos, oportunidades, empresas y más.'
        ],
        i18n: {
          en: {
            title: '🤖 Asistente Zoho IA',
            subtitle: 'Tu asistente inteligente para CRM. Conversación continua habilitada.',
            footer: 'Powered by n8n & Zoho CRM',
            getStarted: 'Comenzar Nueva Conversación',
            inputPlaceholder: 'Escribe tu pregunta sobre CRM, contactos, oportunidades...',
          },
        },
        theme: {
          primaryColor: '#22c55e',
          textColor: '#1f2937',
          backgroundColor: '#ffffff',
        },
      });

      // SOLUCIÓN AGRESIVA: Interceptar y modificar el HTML del widget
      setTimeout(() => {
        const chatContainer = document.getElementById('n8n-chat');
        if (chatContainer) {
          // Crear estilos con máxima especificidad
          const style = document.createElement('style');
          style.id = 'force-left-align';
          style.textContent = `
            /* FORZAR ALINEACIÓN CON ESPECIFICIDAD EXTREMA */
            #n8n-chat #n8n-chat .message.bot,
            #n8n-chat #n8n-chat .message.assistant,
            #n8n-chat .message.bot,
            #n8n-chat .message.assistant {
              text-align: left !important;
              display: block !important;
              width: 100% !important;
            }
            
            #n8n-chat #n8n-chat .message.bot *,
            #n8n-chat #n8n-chat .message.assistant *,
            #n8n-chat .message.bot *,
            #n8n-chat .message.assistant * {
              text-align: left !important;
              display: block !important;
              width: 100% !important;
            }
            
            /* Sobrescribir cualquier estilo inline */
            #n8n-chat [style] {
              text-align: left !important;
            }
            
            /* Forzar en elementos específicos del widget */
            .n8n-chat-widget .message.bot,
            .n8n-chat-widget .message.assistant,
            [class*="message"][class*="bot"],
            [class*="message"][class*="assistant"] {
              text-align: left !important;
            }
          `;
          document.head.appendChild(style);
          
          // Función para procesar elementos agresivamente
          const forceLeftAlign = (element: Element) => {
            // Remover cualquier estilo de centrado
            if (element.getAttribute('style')) {
              let style = element.getAttribute('style') || '';
              style = style.replace(/text-align\s*:\s*center/gi, 'text-align: left');
              style = style.replace(/justify-content\s*:\s*center/gi, 'justify-content: flex-start');
              style = style.replace(/align-items\s*:\s*center/gi, 'align-items: flex-start');
              element.setAttribute('style', style + '; text-align: left !important;');
            } else {
              element.setAttribute('style', 'text-align: left !important;');
            }
            
            // Aplicar a todos los hijos
            Array.from(element.children).forEach(child => {
              forceLeftAlign(child);
            });
          };
          
          // Observador más agresivo
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              // Procesar nodos agregados
              mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  const element = node as Element;
                  
                  // Si es un mensaje del bot, procesarlo
                  if (element.classList.contains('message') && 
                      (element.classList.contains('bot') || element.classList.contains('assistant'))) {
                    forceLeftAlign(element);
                  }
                  
                  // Buscar mensajes del bot en el elemento
                  const botMessages = element.querySelectorAll('.message.bot, .message.assistant, [class*="message"][class*="bot"], [class*="message"][class*="assistant"]');
                  botMessages.forEach(msg => forceLeftAlign(msg));
                }
              });
              
              // Procesar cambios de atributos
              if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const element = mutation.target as Element;
                if (element.classList.contains('message') && 
                    (element.classList.contains('bot') || element.classList.contains('assistant'))) {
                  forceLeftAlign(element);
                }
              }
            });
          });
          
          observer.observe(chatContainer, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
          });
          
          // Procesar elementos existentes
          const existingMessages = chatContainer.querySelectorAll('.message.bot, .message.assistant, [class*="message"][class*="bot"], [class*="message"][class*="assistant"]');
          existingMessages.forEach(msg => forceLeftAlign(msg));
          
          // Intervalo para forzar estilos cada segundo
          const interval = setInterval(() => {
            const messages = chatContainer.querySelectorAll('.message.bot, .message.assistant, [class*="message"][class*="bot"], [class*="message"][class*="assistant"]');
            messages.forEach(msg => forceLeftAlign(msg));
          }, 1000);
          
          // Limpiar intervalo cuando se desmonte el componente
          return () => {
            clearInterval(interval);
            observer.disconnect();
          };
        }
      }, 500);

      setChatInstance(newChatInstance);
    }
  }, [webhookUrl]);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (webhookUrl.trim()) {
      localStorage.setItem('n8n-webhook-url', webhookUrl.trim());
      setIsConfigured(true);
    }
  };

  const handleReset = () => {
    localStorage.removeItem('n8n-webhook-url');
    setWebhookUrl('');
    setIsConfigured(false);
    setChatInstance(null);
    const chatContainer = document.getElementById('n8n-chat');
    if (chatContainer) {
      chatContainer.innerHTML = '';
    }
  };

  const handleResetConversation = () => {
    // Limpiar la sesión del chat almacenada
    localStorage.removeItem('sessionId');
    localStorage.removeItem('chatInput');
    
    // Recrear la instancia del chat
    if (chatInstance) {
      const chatContainer = document.getElementById('n8n-chat');
      if (chatContainer) {
        chatContainer.innerHTML = '';
      }
    }
    
    // Forzar recreación del chat
    const currentUrl = webhookUrl;
    setWebhookUrl('');
    setTimeout(() => {
      setWebhookUrl(currentUrl);
    }, 100);
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full border border-border">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold zoho-text mb-2">🤖 Chat con n8n</h1>
            <p className="zoho-text-light">
              Conecta con tu workflow de n8n para chatear con IA
            </p>
          </div>

          <form onSubmit={handleUrlSubmit} className="space-y-6">
            <div>
              <label htmlFor="webhook-url" className="block text-sm font-medium text-gray-700 mb-2">
                URL del Webhook de n8n
              </label>
              <input
                id="webhook-url"
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://tu-n8n.com/webhook/tu-webhook-id"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full zoho-primary hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Conectar Chat
            </button>
          </form>

          <div className="mt-8 p-6 bg-green-50 rounded-lg border border-green-200">
            <h3 className="font-semibold zoho-text mb-3">📋 Configuración Requerida en n8n:</h3>
            <ol className="text-sm zoho-text-light space-y-2">
              <li className="flex items-start">
                <span className="font-semibold mr-2">1.</span>
                Crea un workflow con un nodo <strong>Chat Trigger</strong>
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">2.</span>
                Configura tu lógica de IA (OpenAI, Claude, etc.)
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">3.</span>
                En el Chat Trigger, añade tu dominio a <strong>Allowed Origins (CORS)</strong>
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">4.</span>
                Activa el workflow y copia la URL del webhook
              </li>
            </ol>
          </div>

          <div className="mt-6 p-4 bg-green-50 border-l-4 border-green-500">
            <p className="text-sm zoho-text-light">
              <strong>💡 Tip:</strong> El Chat Trigger de n8n maneja automáticamente la comunicación bidireccional, 
              eliminando la necesidad de configuraciones complejas.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full relative">
      {/* Botón de Nueva Conversación - Sticky */}
      <div className="sticky top-16 z-50 bg-white border-b border-gray-200 p-3 shadow-sm">
        <div className="flex justify-center">
          <button
            onClick={handleResetConversation}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors duration-200 shadow-lg flex items-center gap-2"
            title="Iniciar nueva conversación"
          >
            🔄 Nueva Conversación
          </button>
        </div>
      </div>
      
      {/* Contenedor del chat */}
      <div id="n8n-chat" className="w-full" style={{height: 'calc(100vh - 120px)'}}></div>
    </div>
  );
};

export default N8nChat;