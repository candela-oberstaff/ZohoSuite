// Simple EventEmitter implementation for browser compatibility
class SimpleEventEmitter {
  private events: { [key: string]: Function[] } = {}

  on(event: string, listener: Function) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(listener)
  }

  off(event: string, listener: Function) {
    if (!this.events[event]) return
    this.events[event] = this.events[event].filter(l => l !== listener)
  }

  emit(event: string, ...args: any[]) {
    if (!this.events[event]) return
    this.events[event].forEach(listener => listener(...args))
  }
}

interface WebhookMessage {
  id: string
  content: string
  timestamp: Date
  userId?: string
  sessionId?: string
}

interface WebhookResponse {
  id: string
  content: string
  timestamp: Date
  success: boolean
  error?: string
}

class WebhookService extends SimpleEventEmitter {
  private webhookUrl: string = ''
  private sessionId: string
  private userId: string = 'user-001'
  private pendingMessages: Map<string, {
    resolve: (response: WebhookResponse) => void
    reject: (error: Error) => void
    timeout: NodeJS.Timeout
  }> = new Map()

  constructor() {
    super()
    this.sessionId = this.generateSessionId()
    this.setupWebhookListener()
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  setWebhookUrl(url: string) {
    this.webhookUrl = url
    console.log('Webhook URL set to:', url)
  }

  getWebhookUrl(): string {
    return this.webhookUrl
  }

  private setupWebhookListener() {
    // Setup listener for incoming webhook responses
    // This would typically be handled by your backend or a webhook endpoint
    console.log('Webhook listener setup for session:', this.sessionId)
  }

  async sendMessage(content: string): Promise<WebhookResponse> {
    if (!this.webhookUrl) {
      throw new Error('Webhook URL not configured')
    }

    const messageId = this.generateMessageId()
    const message: WebhookMessage = {
      id: messageId,
      content,
      timestamp: new Date(),
      userId: this.userId,
      sessionId: this.sessionId
    }

    console.log('Sending webhook message:', message)

    try {
      // Enviar mensaje a n8n
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 segundos para envío
      
      // Use proxy URL to avoid CORS issues
      const proxyUrl = this.getProxyUrl(this.webhookUrl)
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          message: message.content,
          userId: message.userId,
          sessionId: message.sessionId,
          messageId: message.id,
          timestamp: message.timestamp.toISOString()
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      if (!response.ok) {
        let errorMessage = `Webhook request failed: ${response.status} ${response.statusText}`
        try {
          const contentType = response.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json()
            console.warn('Webhook error response:', errorData)
            
            // Handle specific n8n workflow errors
            if (response.status === 500 && errorData.message) {
              if (errorData.message.includes('Workflow could not be started')) {
                errorMessage = 'El workflow de n8n no pudo iniciarse. Verifica que el workflow esté activo y configurado correctamente.'
              } else {
                errorMessage = `Error del workflow: ${errorData.message}`
              }
            }
          } else {
             const errorText = await response.text()
             console.warn('Webhook returned non-JSON response:', errorText.substring(0, 200))
             if (response.status === 500) {
               if (errorText.includes('Internal Server Error')) {
                 errorMessage = 'Error 500: El workflow de n8n tiene errores de configuración. Posibles causas:\n' +
                   '• El workflow no está activo\n' +
                   '• Faltan nodos requeridos (ej: Respond to Webhook)\n' +
                   '• Error en la lógica del workflow\n' +
                   '• Problemas de conectividad con servicios externos'
               } else {
                 errorMessage = 'Error interno del servidor webhook. Verifica la configuración del workflow.'
               }
             } else {
               errorMessage += `. Response: ${errorText.substring(0, 100)}...`
             }
           }
        } catch (parseError) {
          console.warn('Could not parse webhook error response:', parseError)
          errorMessage += '. Error de comunicación con el webhook.'
        }
        
        throw new Error(errorMessage)
      }

      console.log('Mensaje enviado a n8n exitosamente, esperando respuesta...')

      // Ahora hacer polling para obtener la respuesta del backend
      const webhookResponse = await this.pollForResponse(this.sessionId, 30000) // 30 segundos de timeout
      
      this.emit('response', webhookResponse)
      return webhookResponse

    } catch (error) {
      console.error('Webhook send error:', error)
      
      let errorMessage = error instanceof Error ? error.message : String(error)
      if (error instanceof Error && error.name === 'AbortError') {
        errorMessage = 'Timeout: El webhook no respondió en 10 segundos. Posibles causas:\n• El servidor n8n no está disponible\n• Problemas de conectividad de red\n• El workflow está procesando pero tarda mucho\n• El servidor n8n está sobrecargado'
      }
      
      const errorResponse: WebhookResponse = {
        id: messageId,
        content: `Error: ${errorMessage}`,
        timestamp: new Date(),
        success: false,
        error: errorMessage
      }
      
      this.emit('error', errorResponse)
      throw new Error(errorMessage)
    }
  }

  // Método para hacer polling y obtener la respuesta del backend
  private async pollForResponse(sessionId: string, timeout: number = 30000): Promise<WebhookResponse> {
    const startTime = Date.now()
    const pollInterval = 1000 // 1 segundo
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(`/api/webhook/response/${sessionId}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            console.log('Respuesta recibida del backend:', data.data)
            return {
              id: data.data.id || this.generateMessageId(),
              content: data.data.response || data.data.content || 'Respuesta recibida',
              timestamp: new Date(data.data.timestamp || Date.now()),
              success: true
            }
          }
        } else if (response.status === 404) {
          // No hay respuesta aún, continuar polling
          await new Promise(resolve => setTimeout(resolve, pollInterval))
          continue
        } else {
          console.warn('Error al obtener respuesta del backend:', response.status)
        }
      } catch (error) {
        console.warn('Error en polling:', error)
      }
      
      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }
    
    throw new Error('Timeout: No se recibió respuesta del agente en 30 segundos')
  }

  // Method to handle incoming webhook responses (for future use)
  handleIncomingWebhook(data: any) {
    console.log('Incoming webhook data:', data)
    
    const response: WebhookResponse = {
      id: data.messageId || data.id || this.generateMessageId(),
      content: data.response || data.content || data.message || 'Respuesta recibida',
      timestamp: new Date(data.timestamp || Date.now()),
      success: true
    }

    this.emit('response', response)
    return response
  }

  // Helper method to convert webhook URL to proxy URL
  private getProxyUrl(webhookUrl: string): string {
    // Convert n8n webhook URL to use local proxy
    if (webhookUrl.includes('n8n.obertrack.com/webhook/')) {
      const webhookId = webhookUrl.split('/webhook/')[1]
      return `/api/webhook/${webhookId}`
    }
    return webhookUrl
  }

  // Test connection to webhook
  async testConnection(): Promise<boolean> {
    if (!this.webhookUrl) {
      throw new Error('Webhook URL not configured')
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      // Use proxy URL to avoid CORS issues
      const proxyUrl = this.getProxyUrl(this.webhookUrl)
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          test: true,
          message: 'Test connection',
          timestamp: new Date().toISOString()
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      
      // Handle different response scenarios
      if (response.ok) {
        return true
      } else {
        // Try to get error details from response
        try {
          const contentType = response.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json()
            console.warn(`Webhook responded with ${response.status}:`, errorData)
            
            // Check if it's a workflow error but webhook is reachable
            if (response.status === 500 && errorData.message && errorData.message.includes('Workflow')) {
              console.log('Webhook is reachable but workflow has issues:', errorData.message)
              // Consider this as a successful connection to the webhook endpoint
              return true
            }
          } else {
            console.warn('Webhook returned non-JSON response for test connection')
            // If we get a non-JSON response but status 500, webhook is reachable
            if (response.status === 500) {
              console.log('Webhook is reachable but has server issues')
              return true
            }
          }
        } catch (parseError) {
          console.warn('Could not parse test connection response:', parseError)
          // If we get here with status 500, webhook is likely reachable
          if (response.status === 500) {
            return true
          }
        }
        
        return false
      }
    } catch (error) {
      console.error('Webhook test connection failed:', error)
      // Don't throw error, just return false to prevent loops
      return false
    }
  }

  getSessionId(): string {
    return this.sessionId
  }

  getUserId(): string {
    return this.userId
  }

  setUserId(userId: string) {
    this.userId = userId
  }
}

// Export singleton instance
export const webhookService = new WebhookService()
export default webhookService