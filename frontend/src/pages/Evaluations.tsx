import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Filter, ClipboardList, Star, Calendar, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Evaluation } from '@/types'
import { api } from '@/services/api'

const Evaluations = () => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [recommendationFilter, setRecommendationFilter] = useState<string>('all')
  const [interviewTypeFilter, setInterviewTypeFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchEvaluations()
  }, [currentPage, recommendationFilter, interviewTypeFilter])

  const fetchEvaluations = async () => {
    try {
      setLoading(true)
      const response = await api.getEvaluations({ 
        page: currentPage, 
        recommendation: recommendationFilter !== 'all' ? recommendationFilter : undefined, 
        type: interviewTypeFilter !== 'all' ? interviewTypeFilter : undefined 
      })
      setEvaluations(response.items)
      setTotalPages(response.totalPages)
    } catch (error) {
      console.error('Error fetching evaluations:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'hire': return 'bg-green-100 text-green-800'
      case 'consider': return 'bg-yellow-100 text-yellow-800'
      case 'reject': return 'bg-red-100 text-red-800'
      case 'interview_again': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRecommendationText = (recommendation: string) => {
    switch (recommendation) {
      case 'hire': return 'Contratar'
      case 'consider': return 'Considerar'
      case 'reject': return 'Rechazar'
      case 'interview_again': return 'Entrevistar de nuevo'
      default: return recommendation
    }
  }

  const getInterviewTypeText = (type: string) => {
    switch (type) {
      case 'phone': return 'Telefónica'
      case 'video': return 'Videollamada'
      case 'in-person': return 'Presencial'
      case 'technical': return 'Técnica'
      case 'hr': return 'RRHH'
      default: return type
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    return 'text-red-600'
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

  const filteredEvaluations = evaluations.filter(evaluation => {
    const matchesSearch = 
      evaluation.evaluator_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evaluation.comments.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRecommendation = recommendationFilter === 'all' || evaluation.recommendation === recommendationFilter
    const matchesType = interviewTypeFilter === 'all' || evaluation.interview_type === interviewTypeFilter
    
    return matchesSearch && matchesRecommendation && matchesType
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600">Cargando evaluaciones...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Evaluaciones</h1>
          <p className="text-gray-600">Gestiona las evaluaciones de candidatos y entrevistas</p>
        </div>
        <Link to="/evaluations/create">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nueva Evaluación
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar evaluaciones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={recommendationFilter} onValueChange={setRecommendationFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Recomendación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las recomendaciones</SelectItem>
                <SelectItem value="hire">Contratar</SelectItem>
                <SelectItem value="consider">Considerar</SelectItem>
                <SelectItem value="reject">Rechazar</SelectItem>
                <SelectItem value="interview_again">Entrevistar de nuevo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={interviewTypeFilter} onValueChange={setInterviewTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <ClipboardList className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="phone">Telefónica</SelectItem>
                <SelectItem value="video">Videollamada</SelectItem>
                <SelectItem value="in-person">Presencial</SelectItem>
                <SelectItem value="technical">Técnica</SelectItem>
                <SelectItem value="hr">RRHH</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Evaluations List */}
      <div className="space-y-4">
        {filteredEvaluations.map((evaluation) => (
          <Card key={evaluation.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-lg">Evaluación #{evaluation.id}</CardTitle>
                    <Badge className={getRecommendationColor(evaluation.recommendation)}>
                      {getRecommendationText(evaluation.recommendation)}
                    </Badge>
                    <Badge variant="outline">
                      {getInterviewTypeText(evaluation.interview_type)}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>Evaluador: {evaluation.evaluator_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(evaluation.evaluation_date)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Scores */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium">Técnico</span>
                  </div>
                  <div className={`text-xl font-bold ${getScoreColor(evaluation.technical_score)}`}>
                    {evaluation.technical_score.toFixed(1)}
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Star className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Soft Skills</span>
                  </div>
                  <div className={`text-xl font-bold ${getScoreColor(evaluation.soft_skills_score)}`}>
                    {evaluation.soft_skills_score.toFixed(1)}
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Star className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">General</span>
                  </div>
                  <div className={`text-xl font-bold ${getScoreColor(evaluation.overall_score)}`}>
                    {evaluation.overall_score.toFixed(1)}
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <Link to={`/evaluations/${evaluation.id}`}>
                    <Button variant="outline" size="sm">
                      Ver Detalles
                    </Button>
                  </Link>
                </div>
              </div>
              
              {/* Comments */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Comentarios:</h4>
                <p className="text-sm text-gray-600 line-clamp-2">{evaluation.comments}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEvaluations.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron evaluaciones</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || recommendationFilter !== 'all' || interviewTypeFilter !== 'all'
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Comienza agregando tu primera evaluación'}
            </p>
            {!searchTerm && recommendationFilter === 'all' && interviewTypeFilter === 'all' && (
              <Link to="/evaluations/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Evaluación
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default Evaluations