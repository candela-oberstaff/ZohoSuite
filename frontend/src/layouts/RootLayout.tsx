import { Outlet } from 'react-router-dom'
import { Toaster, Toast } from '@/components/ui/toaster'
import { useToast } from '@/components/ui/use-toast'
import ZohoNavbar from '@/components/navigation/ZohoNavbar'
import ZohoSidebar from '@/components/navigation/ZohoSidebar'
import { useState } from 'react'

export default function RootLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { toasts } = useToast()

  return (
    <div className="min-h-screen bg-white">
        {/* Top Navigation */}
        <ZohoNavbar 
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
        />
        
        <div className="flex">
          {/* Sidebar */}
          <ZohoSidebar collapsed={sidebarCollapsed} />
          
          {/* Main Content */}
          <main className={`flex-1 transition-all duration-300 ${
            sidebarCollapsed ? 'ml-16' : 'ml-64'
          } pt-16`}>
            <div className="p-6">
              <Outlet />
            </div>
          </main>
        </div>
        
        <Toaster>
          {toasts.map((toast) => (
            <Toast key={toast.id}>
              <div className={`${toast.variant === 'destructive' ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'} rounded-lg p-4`}>
                {toast.title && (
                  <div className={`font-semibold ${toast.variant === 'destructive' ? 'text-red-800' : 'text-green-800'}`}>
                    {toast.title}
                  </div>
                )}
                {toast.description && (
                  <div className={`text-sm ${toast.variant === 'destructive' ? 'text-red-600' : 'text-green-600'} mt-1`}>
                    {toast.description}
                  </div>
                )}
              </div>
            </Toast>
          ))}
        </Toaster>
      </div>
  )
}
