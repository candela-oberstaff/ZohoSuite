import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, Briefcase, MapPin, DollarSign, Calendar, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Position } from '@/types'
import { api } from '@/services/api'

const Positions = () => {
  const navigate = useNavigate()
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchPositions()
  }, [currentPage, statusFilter, typeFilter])

  const fetchPositions = async () => {
    try {
      setLoading(true)
      const response = await api.getPositions({ 
        page: currentPage.toString(), 
        per_page: '10',
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        search: searchTerm || undefined
      })
      
      if (response.success && response.data) {
        setPositions(response.data.items || [])
        setTotalPages(response.data.total_pages || 1)
      } else {
        console.error('Error en la respuesta:', response.error)
        setPositions([])
        setTotalPages(1)
      }
    } catch (error) {
      console.error('Error fetching positions:', error)
      setPositions([])
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800'
      case 'closed': return 'bg-red-100 text-red-800'
      case 'on-hold': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return 'Abierta'
      case 'closed': return 'Cerrada'
      case 'on-hold': return 'En pausa'
      default: return status
    }
  }

  const getEmploymentTypeText = (type: string) => {
    switch (type) {
      case 'full-time': return 'Tiempo completo'
      case 'part-time': return 'Tiempo parcial'
      case 'contract': return 'Contrato'
      case 'internship': return 'Prácticas'
      default: return type
    }
  }

  const formatSalary = (salary_range?: { min: number; max: number; currency: string }) => {
    if (!salary_range) return 'Salario no especificado'
    return `${salary_range.min.toLocaleString()} - ${salary_range.max.toLocaleString()} ${salary_range.currency}`
  }

  const filteredPositions = positions.filter(position => {
    const matchesSearch = 
      position.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      position.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      position.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (position.department?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    
    const matchesStatus = statusFilter === 'all' || position.status === statusFilter
    const matchesType = typeFilter === 'all' || position.employment_type === typeFilter
    
    return matchesSearch && matchesStatus && matchesType
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600">Cargando posiciones...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Posiciones</h1>
          <p className="text-gray-600">Gestiona las posiciones abiertas y el proceso de contratación</p>
        </div>
        <Button 
          className="flex items-center gap-2"
          onClick={() => navigate('/positions/new')}
        >
          <Plus className="h-4 w-4" />
          Nueva Posición
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar posiciones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="open">Abierta</SelectItem>
                <SelectItem value="closed">Cerrada</SelectItem>
                <SelectItem value="on-hold">En pausa</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Briefcase className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="full-time">Tiempo completo</SelectItem>
                <SelectItem value="part-time">Tiempo parcial</SelectItem>
                <SelectItem value="contract">Contrato</SelectItem>
                <SelectItem value="internship">Prácticas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Positions List */}
      <div className="space-y-4">
        {filteredPositions.map((position) => (
          <Card key={position.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-xl">{position.title}</CardTitle>
                    <Badge className={getStatusColor(position.status)}>
                      {getStatusText(position.status)}
                    </Badge>
                  </div>
                  <p className="text-gray-600 mb-3 line-clamp-2">{position.description}</p>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{position.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Briefcase className="h-4 w-4" />
                      <span>{getEmploymentTypeText(position.employment_type)}</span>
                    </div>
                    {position.salary_range && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        <span>{formatSalary(position.salary_range)}</span>
                      </div>
                    )}
                    {position.department && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Depto:</span>
                        <span>{position.department}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2 mb-4">
                {position.requirements.slice(0, 4).map((req, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {req}
                  </Badge>
                ))}
                {position.requirements.length > 4 && (
                  <Badge variant="secondary" className="text-xs">
                    +{position.requirements.length - 4} más
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {position.hiring_manager && (
                    <span>Responsable: {position.hiring_manager}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link to={`/positions/${position.id}`}>
                    <Button variant="outline" size="sm">
                      Ver Detalles
                    </Button>
                  </Link>
                  {position.status === 'open' && (
                    <Link to={`/positions/${position.id}/candidates`}>
                      <Button size="sm">
                        Ver Candidatos
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPositions.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron posiciones</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Comienza agregando tu primera posición'}
            </p>
            {!searchTerm && statusFilter === 'all' && typeFilter === 'all' && (
              <Link to="/positions/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Posición
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default Positions