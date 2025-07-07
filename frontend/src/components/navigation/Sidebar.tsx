import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Users, TrendingUp, Building, Building2, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

const Sidebar = ({ open, onClose }: SidebarProps) => {
  const location = useLocation()

  const menuItems = [
    { path: '/contacts', name: 'Contactos', icon: Users },
    { path: '/opportunities', name: 'Oportunidades', icon: TrendingUp },
    { path: '/companies', name: 'Empresas', icon: Building2 },
    { path: '/customers', name: 'Clientes', icon: Building },
    { path: '/subscriptions', name: 'Suscripciones', icon: CreditCard }
  ]

  return (
    <>
      {/* Overlay para móvil */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-16 left-0 z-40 w-64 h-[calc(100vh-4rem)] transition-transform duration-300 ease-in-out",
          "bg-card border-r border-border shadow-lg",
          "md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-full px-4 py-6 overflow-y-auto">
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                    "text-sm font-medium",
                    isActive
                      ? "bg-blue-600 text-white shadow-sm dark:bg-blue-500"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  onClick={() => onClose()}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
