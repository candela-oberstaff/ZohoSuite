import { Button } from '@/components/ui/button'
import { MenuIcon, Users, TrendingUp, Building2 } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface NavbarProps {
  onMenuToggle: () => void
}

export default function Navbar({ onMenuToggle }: NavbarProps) {
  const location = useLocation()

  const navItems = [
    { path: '/contacts', name: 'Contactos', icon: Users },
    { path: '/opportunities', name: 'Oportunidades', icon: TrendingUp },
    { path: '/companies', name: 'Empresas', icon: Building2 }
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onMenuToggle} 
            className="md:hidden hover:bg-muted"
          >
            <MenuIcon className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">Z</span>
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Zoho Bigin
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200",
                    "text-sm font-medium",
                    isActive
                      ? "bg-blue-600 text-white shadow-sm dark:bg-blue-500"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
        
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
