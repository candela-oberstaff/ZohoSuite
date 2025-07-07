import React from 'react'
import { Button } from '@/components/ui/button'
import { Menu, Bell, Search, Plus, Settings, User } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface ZohoNavbarProps {
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
}

const ZohoNavbar: React.FC<ZohoNavbarProps> = ({ sidebarCollapsed, setSidebarCollapsed }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-background border-b border-border shadow-sm">
      <div className="flex items-center justify-between h-full px-4">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {/* Sidebar Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hover:bg-accent hover:text-accent-foreground"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">Z</span>
            </div>
            <span className="font-semibold text-lg text-foreground">
              Zoho Bigin
            </span>
          </div>
        </div>

        {/* Center Section - Search */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar contactos, oportunidades..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Add Button */}
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            Crear
          </Button>
          
          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-accent hover:text-accent-foreground"
          >
            <Bell className="h-5 w-5" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
          </Button>

          {/* Settings */}
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-accent hover:text-accent-foreground"
          >
            <Settings className="h-5 w-5" />
          </Button>

          {/* User Menu */}
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-accent hover:text-accent-foreground"
          >
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}

export default ZohoNavbar