import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Users, Mail, Phone, Calendar, ChevronLeft, ChevronRight, Plus, Search, User, Award, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { IntelliscreenCandidate, CandidatesApiResponse } from '@/types'
import { api } from '@/services/api'

const CandidatesPage = () => {
  const navigate = useNavigate()
  const [candidatesData, setCandidatesData] = useState<CandidatesApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchCandidates(currentPage)
  }, [currentPage])

  const fetchCandidates = async (page: number) => {
    try {
      setLoading(true)
      const response = await api.getIntelliscreenCandidates(page)
      if (response.success && response.data) {
        setCandidatesData(response.data)
      } else {
        console.error('Error en respuesta de candidatos:', response.error || 'Respuesta inválida')
      }
    } catch (error) {
      console.error('Error fetching candidates data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'in_progress': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'failed': return 'bg-red-50 text-red-700 border-red-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return <CheckCircle className="h-3 w-3" />
      case 'pending': return <Clock className="h-3 w-3" />
      case 'in_progress': return <AlertCircle className="h-3 w-3" />
      case 'failed': return <XCircle className="h-3 w-3" />
      default: return <Clock className="h-3 w-3" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'Completado'
      case 'pending': return 'Pendiente'
      case 'in_progress': return 'En Progreso'
      case 'failed': return 'Fallido'
      default: return status
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredCandidates = candidatesData?.candidates?.filter(candidate =>
    (candidate.name && candidate.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (candidate.email && candidate.email.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || []

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && candidatesData && newPage <= candidatesData.num_pages) {
      setCurrentPage(newPage)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600">Cargando candidatos...</div>
      </div>
    )
  }

  if (!candidatesData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-600">Error al cargar los datos de candidatos</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidatos</h1>
          <p className="text-gray-600">
            {candidatesData.total} candidatos encontrados
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/candidates/create">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Candidato
            </Button>
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar candidatos por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Candidatos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{candidatesData.total}</div>
            <p className="text-xs text-muted-foreground">
              Página {candidatesData.page} de {candidatesData.num_pages}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Esta Página</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{candidatesData.candidates.length}</div>
            <p className="text-xs text-muted-foreground">
              de {candidatesData.page_size} por página
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Candidatos Filtrados</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredCandidates.length}</div>
            <p className="text-xs text-muted-foreground">
              {searchTerm ? 'resultados de búsqueda' : 'sin filtros'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Candidates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCandidates.length > 0 ? (
          filteredCandidates.map((candidate) => (
            <Card key={candidate.id} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-md hover:scale-[1.02] bg-gradient-to-br from-white to-gray-50">
              <CardContent className="p-0">
                {/* Header with gradient */}
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30">
                        <User className="h-8 w-8 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold truncate">
                          {candidate.name || 'Sin nombre'}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Mail className="h-4 w-4" />
                          <span className="text-sm text-white/90 truncate">
                            {candidate.email || 'Sin email'}
                          </span>
                        </div>
                        {candidate.phone && (
                          <div className="flex items-center gap-2 mt-1">
                            <Phone className="h-4 w-4" />
                            <span className="text-sm text-white/90">
                              {candidate.phone}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Assessments Section */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Award className="h-5 w-5 text-green-600" />
                        Assessments
                      </h4>
                      <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                        {candidate.assessments?.length || 0}
                      </Badge>
                    </div>
                    
                    {candidate.assessments && candidate.assessments.length > 0 ? (
                      <div className="space-y-3">
                        {candidate.assessments.slice(0, 2).map((assessment) => (
                          <div key={assessment.id} className="bg-green-50 rounded-lg p-4 border border-green-100">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate text-sm">
                                  {assessment.name}
                                </p>
                                <p className="text-xs text-gray-600 truncate mt-1">
                                  {assessment.job_title}
                                </p>
                                <div className="flex items-center gap-1 mt-2">
                                  <Calendar className="h-3 w-3 text-gray-400" />
                                  <span className="text-xs text-gray-500">
                                    {formatDate(assessment.created_at)}
                                  </span>
                                </div>
                              </div>
                              <Badge className={`${getStatusColor(assessment.status)} border flex items-center gap-1 text-xs px-2 py-1`}>
                                {getStatusIcon(assessment.status)}
                                {getStatusText(assessment.status)}
                              </Badge>
                            </div>
                          </div>
                        ))}
                        {candidate.assessments.length > 2 && (
                          <div className="text-center">
                            <Badge variant="outline" className="text-xs">
                              +{candidate.assessments.length - 2} assessments más
                            </Badge>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Award className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">Sin assessments</p>
                        <p className="text-xs text-gray-400 mt-1">Aún no hay assessments registrados</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 group-hover:border-green-300 group-hover:text-green-600 transition-colors"
                      onClick={() => navigate(`/candidates/${candidate.id}`)}
                    >
                      Ver Detalles
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 border-0"
                    >
                      Nuevo Assessment
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-50 to-white">
              <CardContent className="p-12 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                   <Users className="h-12 w-12 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {searchTerm ? 'No se encontraron candidatos' : 'No hay candidatos'}
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {searchTerm 
                    ? `No hay candidatos que coincidan con "${searchTerm}". Intenta con otros términos de búsqueda.`
                    : 'Aún no hay candidatos registrados en el sistema. Comienza agregando tu primer candidato.'
                  }
                </p>
                {!searchTerm && (
                   <Link to="/candidates/create">
                     <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 border-0 px-6 py-3">
                       <Plus className="h-5 w-5 mr-2" />
                       Agregar Primer Candidato
                     </Button>
                   </Link>
                 )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Pagination */}
      {candidatesData.num_pages > 1 && (
        <Card className="border-0 shadow-md bg-gradient-to-r from-white to-gray-50">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-700 font-medium">
                Mostrando página <span className="font-bold text-green-600">{candidatesData.page}</span> de <span className="font-bold text-green-600">{candidatesData.num_pages}</span>
                <span className="text-gray-500 ml-2">({candidatesData.total} candidatos total)</span>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="hover:bg-green-50 hover:border-green-300 hover:text-green-600 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, candidatesData.num_pages) }, (_, i) => {
                    const pageNum = i + 1
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-10 h-10 p-0 transition-all ${
                          currentPage === pageNum 
                            ? 'bg-gradient-to-r from-green-600 to-emerald-600 border-0 text-white shadow-md' 
                            : 'hover:bg-green-50 hover:border-green-300 hover:text-green-600'
                        }`}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                  {candidatesData.num_pages > 5 && (
                    <>
                      <span className="text-gray-400 px-2">...</span>
                      <Button
                        variant={currentPage === candidatesData.num_pages ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(candidatesData.num_pages)}
                        className={`w-10 h-10 p-0 transition-all ${
                          currentPage === candidatesData.num_pages 
                            ? 'bg-gradient-to-r from-green-600 to-emerald-600 border-0 text-white shadow-md' 
                            : 'hover:bg-green-50 hover:border-green-300 hover:text-green-600'
                        }`}
                      >
                        {candidatesData.num_pages}
                      </Button>
                    </>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === candidatesData.num_pages}
                  className="hover:bg-green-50 hover:border-green-300 hover:text-green-600 transition-colors"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default CandidatesPage