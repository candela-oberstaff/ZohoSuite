import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Utility function to merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
import { Users, TrendingUp, BarChart3, Home, Calendar, Mail, FileText, Settings, Building, CreditCard, Factory, Building2, UserCheck, Bot } from 'lucide-react'

interface ZohoSidebarProps {
  collapsed: boolean
}

const ZohoSidebar: React.FC<ZohoSidebarProps> = ({ collapsed }) => {
  const location = useLocation()

  const navItems = [
    { path: '/dashboard', name: 'Dashboard', icon: Home },
    { path: '/contacts', name: 'Contactos', icon: Users },
    { path: '/opportunities', name: 'Oportunidades', icon: TrendingUp },
    { path: '/companies', name: 'Empresas', icon: Building2 },
    { path: '/empresas-productos', name: 'Empresas y Productos', icon: Factory },
    { path: '/candidates', name: 'Candidatos', icon: UserCheck },
    { path: '/customers', name: 'Clientes Billing', icon: Building },
    { path: '/subscriptions', name: 'Suscripciones', icon: CreditCard },
    { path: '/n8n-chat', name: 'Chat n8n', icon: Bot },
    { path: '/reports', name: 'Reportes', icon: BarChart3 },
    { path: '/calendar', name: 'Calendario', icon: Calendar },
    { path: '/emails', name: 'Emails', icon: Mail },
    { path: '/documents', name: 'Documentos', icon: FileText },
  ]

  const bottomItems = [
    { path: '/settings', name: 'Configuración', icon: Settings },
  ]

  return (
    <aside className={cn(
      "fixed left-0 top-16 h-[calc(100vh-4rem)] bg-background border-r border-border transition-all duration-300 z-40",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="flex flex-col h-full">
        {/* Main Navigation */}
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                  "hover:bg-accent hover:text-accent-foreground",
                  isActive
                    ? "bg-green-50 text-green-600 border-r-2 border-green-600"
                    : "text-foreground"
                )}
                title={collapsed ? item.name : undefined}
              >
                <Icon className={cn(
                  "h-5 w-5 flex-shrink-0",
                  isActive ? "text-green-600" : "text-muted-foreground"
                )} />
                {!collapsed && (
                  <span className="font-medium text-sm truncate">
                    {item.name}
                  </span>
                )}
                {isActive && !collapsed && (
                  <div className="ml-auto w-2 h-2 bg-green-600 rounded-full"></div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom Navigation */}
        <div className="p-2 border-t border-border">
          {bottomItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  "hover:bg-accent hover:text-accent-foreground",
                  isActive
                    ? "bg-green-50 text-green-600"
                    : "text-foreground"
                )}
                title={collapsed ? item.name : undefined}
              >
                <Icon className={cn(
                  "h-5 w-5 flex-shrink-0",
                  isActive ? "text-green-600" : "text-muted-foreground"
                )} />
                {!collapsed && (
                  <span className="font-medium text-sm truncate">
                    {item.name}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </aside>
  )
}

export default ZohoSidebar