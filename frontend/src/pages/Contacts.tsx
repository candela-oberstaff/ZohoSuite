import { useEffect, useState, useCallback } from "react";
import { Contact } from "@/types";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import { useNavigate } from "react-router-dom";
import { Loader2, Search, Mail, Phone, User, X, Plus, Eye } from "lucide-react";

const ITEMS_PER_PAGE = 12;

export default function ContactsPage() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalContacts, setTotalContacts] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  // Resetear la página cuando cambia la búsqueda
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getContacts({
        page,
        limit: ITEMS_PER_PAGE,
        search: debouncedSearch,
      }, { useCache: true });
      
      if (response.success) {
        setContacts(response.data?.items || []);
        setTotalContacts(response.data?.total || 0);
        setTotalPages(Math.ceil((response.data?.total || 0) / ITEMS_PER_PAGE));
      } else {
        setError(response.error || "Error al cargar los contactos");
        setContacts([]);
      }
    } catch (error) {
      console.error(error);
      setError("Error al conectar con el servidor");
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-600 rounded-lg">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">
                Contactos
              </h1>
              <p className="text-sm text-gray-600">
                Gestiona tus contactos de Zoho Bigin
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate('/contacts/create')} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Contacto
            </Button>
            <div className="text-right">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-xl font-semibold text-green-600">{totalContacts}</p>
            </div>
          </div>
        </div>
      </div>
        
        {/* Search Section */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar contactos por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-10 bg-white border-gray-300"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400 hover:text-gray-600"
                onClick={() => setSearch('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-center gap-2 text-destructive">
            <div className="rounded-full bg-destructive/20 p-1">
              <X className="h-4 w-4" />
            </div>
            <p className="font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-5 w-32" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-full" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-gray-50 rounded-lg border border-border p-8">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No se encontraron contactos</h3>
          <p className="text-muted-foreground max-w-md">
            {debouncedSearch ? 
              `No hay resultados para "${debouncedSearch}". Intenta con otro término de búsqueda.` : 
              'No hay contactos disponibles en este momento.'}
          </p>
          {debouncedSearch && (
            <Button 
              className="mt-6"
              variant="secondary"
              onClick={() => setSearch('')}
            >
              <X className="h-4 w-4 mr-2" />
              Limpiar búsqueda
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Grid de contactos moderno */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {contacts.map((contact, index) => (
              <Card key={contact.id} className="group relative overflow-hidden bg-white border border-gray-200 hover:border-green-300 transition-all duration-300 hover:shadow-lg hover:shadow-green-100 cursor-pointer transform hover:-translate-y-1">
                <div className="p-3">
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between min-w-0">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                          <User className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-sm text-gray-800 group-hover:text-green-600 transition-colors duration-200 truncate">
                            {contact.Full_Name || 
                             ((contact.First_Name || contact.Last_Name) ? 
                              `${contact.First_Name || ''} ${contact.Last_Name || ''}`.trim() : 
                              'Sin nombre')}
                          </h3>
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 hover:bg-green-50 border border-green-200 shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/contacts/${contact.id}`);
                          }}
                        >
                          <Eye className="h-3 w-3 text-green-600" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-1" onClick={() => navigate(`/contacts/${contact.id}`)}>
                      {contact.Email && (
                        <div className="flex items-center gap-1.5 text-gray-600 min-w-0">
                          <Mail className="h-3 w-3 text-green-600 flex-shrink-0" />
                          <span className="text-xs truncate min-w-0 flex-1" title={contact.Email}>{contact.Email}</span>
                        </div>
                      )}
                      {contact.Phone && (
                        <div className="flex items-center gap-1.5 text-gray-600 min-w-0">
                          <Phone className="h-3 w-3 text-green-600 flex-shrink-0" />
                          <span className="text-xs truncate min-w-0 flex-1" title={contact.Phone}>{contact.Phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination Section */}
          <div className="mt-10 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  Mostrando <span className="font-semibold text-green-600">{contacts.length}</span> de <span className="font-semibold text-green-600">{totalContacts}</span> contactos
                </p>
              </div>

              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="gap-2 min-w-[100px] bg-white hover:bg-green-50 border-green-200 text-green-700"
                  >
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Anterior
                  </Button>
                  
                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                    {Array.from({ length: Math.min(4, totalPages) }).map((_, i) => {
                      // Calcular qué páginas mostrar basado en la página actual
                      let pageNum;
                      if (totalPages <= 4) {
                        // Si hay 4 o menos páginas, mostrarlas todas
                        pageNum = i + 1;
                      } else if (page <= 2) {
                        // Si estamos en las primeras páginas
                        pageNum = i + 1;
                      } else if (page >= totalPages - 1) {
                        // Si estamos en las últimas páginas
                        pageNum = totalPages - 3 + i;
                      } else {
                        // Si estamos en el medio, mostrar la página actual en el centro
                        pageNum = page - 1 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === page ? "default" : "ghost"}
                          size="sm"
                          className={`w-10 h-10 p-0 rounded-lg font-semibold transition-all duration-200 ${
                            page === pageNum 
                              ? 'bg-green-600 text-white shadow-md hover:bg-green-700' 
                              : 'text-gray-600 hover:bg-white hover:text-green-600'
                          }`}
                          onClick={() => pageNum !== page && setPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="gap-2 min-w-[100px] bg-white hover:bg-green-50 border-green-200 text-green-700"
                  >
                    Siguiente
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
