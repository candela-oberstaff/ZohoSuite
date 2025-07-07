import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, Mail, Phone, Calendar, ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { IntelliscreenCandidate, CandidatesApiResponse } from '@/types'
import { api } from '@/services/api'

const CandidatesPage = () => {
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
      case 'completed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
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

      {/* Candidates List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredCandidates.length > 0 ? (
          filteredCandidates.map((candidate) => (
            <Card key={candidate.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Candidate Info */}
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-6 w-6 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {candidate.name || 'Sin nombre'}
                        </h3>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                          <div className="flex items-center text-gray-600">
                            <Mail className="h-4 w-4 mr-1" />
                            <span className="text-sm truncate">{candidate.email || 'Sin email'}</span>
                          </div>
                          {candidate.phone && (
                            <div className="flex items-center text-gray-600">
                              <Phone className="h-4 w-4 mr-1" />
                              <span className="text-sm">{candidate.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Assessments */}
                  <div className="lg:flex-shrink-0">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">
                        Evaluaciones ({candidate.assessments?.length || 0})
                      </h4>
                      {candidate.assessments && candidate.assessments.length > 0 ? (
                        <div className="space-y-1">
                          {candidate.assessments.slice(0, 2).map((assessment) => (
                            <div key={assessment.id} className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {assessment.name}
                                </p>
                                <p className="text-xs text-gray-600 truncate">
                                  {assessment.job_title}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatDate(assessment.created_at)}
                                </p>
                              </div>
                              <Badge className={getStatusColor(assessment.status)}>
                                {getStatusText(assessment.status)}
                              </Badge>
                            </div>
                          ))}
                          {candidate.assessments.length > 2 && (
                            <p className="text-xs text-gray-500">
                              +{candidate.assessments.length - 2} más
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Sin evaluaciones</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="lg:flex-shrink-0">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Ver Detalles
                      </Button>
                      <Button variant="outline" size="sm">
                        Nueva Evaluación
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No se encontraron candidatos' : 'No hay candidatos'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm 
                  ? `No hay candidatos que coincidan con "${searchTerm}"`
                  : 'Aún no hay candidatos registrados en el sistema'
                }
              </p>
              {!searchTerm && (
                <Link to="/candidates/create">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Primer Candidato
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pagination */}
      {candidatesData.num_pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Mostrando página {candidatesData.page} de {candidatesData.num_pages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
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
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                )
              })}
              {candidatesData.num_pages > 5 && (
                <>
                  <span className="text-gray-500">...</span>
                  <Button
                    variant={currentPage === candidatesData.num_pages ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(candidatesData.num_pages)}
                    className="w-8 h-8 p-0"
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
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CandidatesPage