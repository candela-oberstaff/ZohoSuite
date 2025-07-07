import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { Users, TrendingUp, BarChart3, Settings, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

const ModernNavbar = () => {
  const location = useLocation()

  const navItems = [
    { path: '/contacts', name: 'Contactos', icon: Users, color: 'text-green-600 dark:text-green-400' },
    { path: '/opportunities', name: 'Oportunidades', icon: TrendingUp, color: 'text-purple-600 dark:text-purple-400' },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-effect border-b border-white/20 dark:border-slate-700/50 shadow-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo y marca */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 zoho-gradient rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">Z</span>
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></div>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl zoho-text-gradient">
                Zoho Bigin
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                CRM Profesional
              </span>
            </div>
          </div>

          {/* Navegación central */}
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 font-medium text-sm",
                    "hover:bg-white/60 dark:hover:bg-slate-800/60 hover:shadow-md",
                    isActive
                      ? "bg-white dark:bg-slate-800 shadow-lg border border-white/40 dark:border-slate-700/40 " + item.color
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <Icon className={cn(
                    "h-4 w-4 transition-colors",
                    isActive ? item.color : "text-current"
                  )} />
                  {item.name}
                  {isActive && (
                    <div className="w-2 h-2 rounded-full bg-current opacity-60 animate-pulse"></div>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Acciones de la derecha */}
          <div className="flex items-center gap-3">
            {/* Notificaciones */}
            <Button
              variant="ghost"
              size="icon"
              className="relative hover:bg-white/60 dark:hover:bg-slate-800/60 rounded-xl"
            >
              <Bell className="h-4 w-4" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white dark:border-slate-900"></div>
            </Button>

            {/* Toggle de tema */}
            <ThemeToggle />

            {/* Avatar del usuario */}
            <div className="flex items-center gap-2 pl-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                <span className="text-white font-semibold text-sm">U</span>
              </div>
              <div className="hidden lg:block">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Usuario</p>
                <p className="text-xs text-muted-foreground">Administrador</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navegación móvil */}
      <div className="md:hidden border-t border-white/20 dark:border-slate-700/50 bg-white/40 dark:bg-slate-900/40">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200",
                  isActive
                    ? "" + item.color
                    : "text-slate-500 dark:text-slate-400"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.name}</span>
                {isActive && (
                  <div className="w-1 h-1 rounded-full bg-current animate-pulse"></div>
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </header>
  )
}

export default ModernNavbar