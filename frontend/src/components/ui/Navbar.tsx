import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const location = useLocation();
  return (
    <nav className="flex items-center justify-between px-4 py-3 border-b bg-background">
      <div className="flex items-center gap-2">
        {onMenuClick && (
          <Button variant="ghost" size="icon" onClick={onMenuClick}>
            <Menu className="w-5 h-5" />
          </Button>
        )}
        <span className="font-bold text-lg">Zoho Bigin Dashboard</span>
      </div>
      <div className="flex gap-2">
        <Button asChild variant={location.pathname === "/contacts" ? "default" : "ghost"}>
          <Link to="/contacts">Contactos</Link>
        </Button>
        <Button asChild variant={location.pathname === "/opportunities" ? "default" : "ghost"}>
          <Link to="/opportunities">Oportunidades</Link>
        </Button>
      </div>
    </nav>
  );
}
