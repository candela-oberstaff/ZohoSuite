import React, { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../services/api";
import type { Opportunity } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from "@/components/ui/pagination";
import { Loader2, Search, DollarSign, Filter, X, AlertCircle, ChevronLeft, ChevronRight, Plus, RefreshCw, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { OpportunityCard } from "../components/opportunities/OpportunityCard";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const ITEMS_PER_PAGE = 50; // Aumentamos para mostrar más oportunidades por fase

export default function Opportunities() {
  const navigate = useNavigate();
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [pipeline, setPipeline] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Función para cargar datos específicamente del embudo Oberstaff
  const fetchOpportunities = useCallback(async () => {
    if (isInitialLoad) setIsInitialLoad(false);
    setLoading(true);
    setError(null);
    
    console.log('🔄 Iniciando carga de oportunidades Oberstaff...');
    
    try {
      const res = await api.getOberstaffOpportunities({ useCache: true });
      
      console.log('📡 Respuesta de API recibida:', {
        success: res.success,
        hasData: !!res.data,
        error: res.error,
        dataKeys: res.data ? Object.keys(res.data) : [],
        opportunitiesCount: res.data?.opportunities?.length || 0
      });
      
      if (res.success && res.data) {
        setOpps(res.data.opportunities || []);
        setPipeline(res.data.pipeline?.name || "Oberstaff");
        console.log(`✅ Cargadas ${res.data.opportunities?.length || 0} oportunidades del embudo ${res.data.pipeline?.name}`);
      } else {
        console.error('❌ Error en respuesta de API:', res.error);
        setError(res.error || "Error al cargar oportunidades del embudo Oberstaff");
        setOpps([]);
      }
    } catch (err) {
      console.error('💥 Error en catch:', err);
      setError("Error al conectar con el servidor");
      setOpps([]);
    } finally {
      setLoading(false);
    }
  }, [isInitialLoad]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  // Función para cambiar de página
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filtrar oportunidades por término de búsqueda
  const filteredOpps = opps.filter(opp => 
    opp.Deal_Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opp.Stage?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opp.Account_Name?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Agrupar oportunidades por Stage (fase)
  const groupedByStage = filteredOpps.reduce((acc, opp) => {
    const stage = opp.Stage || 'Sin Fase';
    if (!acc[stage]) {
      acc[stage] = [];
    }
    acc[stage].push(opp);
    return acc;
  }, {} as Record<string, Opportunity[]>);

  // Obtener las fases ordenadas
  const stages = Object.keys(groupedByStage).sort();
  
  // Calcular totales por fase
  const stageStats = stages.map(stage => ({
    name: stage,
    count: groupedByStage[stage].length,
    total: groupedByStage[stage].reduce((sum, opp) => sum + (opp.Amount || 0), 0)
  }));

  const totalPages = Math.ceil(filteredOpps.length / ITEMS_PER_PAGE);
  const paginated = filteredOpps.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Resetear la página cuando cambia el término de búsqueda
  useEffect(() => {
    if (!isInitialLoad) {
      setPage(1);
    }
  }, [searchTerm, isInitialLoad]);
  
  // Limpiar búsqueda
  const clearSearch = () => {
    setSearchTerm("");
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };
  
  // Función para generar el rango de páginas a mostrar
  const getPageRange = () => {
    const delta = 1; // Número de páginas a mostrar antes y después de la página actual
    const range = [];
    const rangeWithDots = [];
    let l;
    
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
        range.push(i);
      }
    }
    
    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }
    
    return rangeWithDots;
  };

  return (
    <div className="space-y-4">
      {/* Header Section - Compact like Bigin */}
      <div className="mb-4">
        {/* Title Row */}
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-green-600 rounded-lg">
            <DollarSign className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">
              Oportunidades
            </h1>
            <p className="text-sm text-gray-600">
              {pipeline ? `Pipeline: ${pipeline}` : 'Gestiona tus oportunidades de ventas'}
            </p>
          </div>
        </div>
        
        {/* Controls Row - Search and Buttons in same line */}
        <div className="flex items-center justify-between">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar oportunidades por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 bg-white border-gray-300"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400 hover:text-gray-600"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-xl font-semibold text-green-600">{filteredOpps.length}</p>
            </div>
            <Button
              onClick={() => navigate('/opportunities/create')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Oportunidad
            </Button>
            <Button
              onClick={() => fetchOpportunities()}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="flex items-center gap-3 p-6">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              <div className="space-y-1">
                <p className="font-medium text-destructive">Error al cargar oportunidades</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && !error && filteredOpps.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-gray-100 p-4 mb-4">
                {searchTerm ? (
                  <Search className="h-8 w-8 text-muted-foreground" />
                ) : (
                  <DollarSign className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? 'No se encontraron resultados' : 'No hay oportunidades'}
              </h3>
              <p className="text-muted-foreground max-w-md mb-4">
                {searchTerm 
                  ? `No hay oportunidades que coincidan con "${searchTerm}". Intenta con otros términos de búsqueda.`
                  : 'No hay oportunidades disponibles en este momento. Las nuevas oportunidades aparecerán aquí cuando se creen.'
                }
              </p>
              {searchTerm && (
                <Button variant="outline" onClick={clearSearch}>
                  <X className="h-4 w-4 mr-2" />
                  Limpiar búsqueda
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Content */}
        {!loading && !error && filteredOpps.length > 0 && (
         <div className="space-y-4">
           {/* Vista por fases estilo Zoho Bigin - Layout en grid responsive */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
             {stages.map((stage, stageIndex) => (
               <motion.div
                 key={stage}
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: stageIndex * 0.1 }}
                 className="flex flex-col"
               >
                 {/* Header de la fase */}
                 <div className="bg-gray-100 rounded-t-lg p-4 border-b">
                   <div className="flex items-center justify-between">
                     <h3 className="font-semibold text-sm text-foreground">{stage}</h3>
                     <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                       <Plus className="h-3 w-3" />
                     </Button>
                   </div>
                   <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                     <span>{stageStats.find(s => s.name === stage)?.count || 0} Tratos</span>
                     <span>${(stageStats.find(s => s.name === stage)?.total || 0).toLocaleString()}</span>
                   </div>
                 </div>
                 
                 {/* Lista de oportunidades en esta fase */}
                 <div className="bg-background rounded-b-lg border border-t-0 flex-1">
                   <div className="p-2 space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                     {groupedByStage[stage]?.map((opp, index) => (
                       <motion.div
                         key={opp.id}
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: index * 0.05 }}
                         className="group"
                         onClick={() => navigate(`/opportunities/${opp.id}`)}
                       >
                         <Card className="hover:shadow-sm transition-shadow cursor-pointer border-l-4 border-l-blue-500/30 relative">
                           <CardContent className="p-3">
                             <div className="space-y-2">
                               <h4 className="font-medium text-sm truncate" title={opp.Deal_Name}>
                                 {opp.Deal_Name || 'Sin nombre'}
                               </h4>
                               <div className="flex items-center justify-between text-xs text-muted-foreground">
                                 <span className="truncate" title={opp.Account_Name?.name}>
                                   {opp.Account_Name?.name || 'Sin cuenta'}
                                 </span>
                                 <span className="font-medium text-foreground">
                                   ${(opp.Amount || 0).toLocaleString()}
                                 </span>
                               </div>
                               {opp.Closing_Date && (
                                 <div className="text-xs text-muted-foreground">
                                   Cierre: {new Date(opp.Closing_Date).toLocaleDateString()}
                                 </div>
                               )}
                             </div>
                             <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <Button
                                 size="sm"
                                 variant="outline"
                                 className="bg-white shadow-md h-6 w-6 p-0"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   navigate(`/opportunities/${opp.id}`);
                                 }}
                               >
                                 <Eye className="h-3 w-3" />
                               </Button>
                             </div>
                           </CardContent>
                         </Card>
                       </motion.div>
                     ))}
                     {(!groupedByStage[stage] || groupedByStage[stage].length === 0) && (
                       <div className="text-center py-8 text-muted-foreground text-sm">
                         No hay oportunidades en esta fase
                       </div>
                     )}
                   </div>
                 </div>
               </motion.div>
             ))}
           </div>
           
           {/* Información de totales */}
           <div className="flex justify-center items-center mt-6">
             <div className="text-sm text-muted-foreground bg-gray-100 px-4 py-2 rounded-lg">
               Total: {filteredOpps.length} oportunidades • ${filteredOpps.reduce((sum, opp) => sum + (opp.Amount || 0), 0).toLocaleString()}
             </div>
           </div>
          </div>
        )}
    </div>
  );
}
