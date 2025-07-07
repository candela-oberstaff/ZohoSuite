import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, Briefcase, ClipboardList, TrendingUp, Plus, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RecruitmentDashboard } from '@/types'
import { api } from '@/services/api'

const RecruitmentDashboardPage = () => {
  const [dashboardData, setDashboardData] = useState<RecruitmentDashboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await api.getRecruitmentDashboard()
      if (response.success && response.data) {
        setDashboardData(response.data)
      } else {
        console.error('Error en respuesta del dashboard:', response.error || 'Respuesta inválida')
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string, type: 'candidate' | 'position') => {
    if (type === 'candidate') {
      switch (status) {
        case 'active': return 'bg-blue-100 text-blue-800'
        case 'hired': return 'bg-green-100 text-green-800'
        case 'rejected': return 'bg-red-100 text-red-800'
        case 'inactive': return 'bg-gray-100 text-gray-800'
        default: return 'bg-gray-100 text-gray-800'
      }
    } else {
      switch (status) {
        case 'open': return 'bg-green-100 text-green-800'
        case 'closed': return 'bg-red-100 text-red-800'
        case 'on-hold': return 'bg-yellow-100 text-yellow-800'
        default: return 'bg-gray-100 text-gray-800'
      }
    }
  }

  const getStatusText = (status: string, type: 'candidate' | 'position') => {
    if (type === 'candidate') {
      switch (status) {
        case 'active': return 'Activo'
        case 'hired': return 'Contratado'
        case 'rejected': return 'Rechazado'
        case 'inactive': return 'Inactivo'
        default: return status
      }
    } else {
      switch (status) {
        case 'open': return 'Abierta'
        case 'closed': return 'Cerrada'
        case 'on-hold': return 'En pausa'
        default: return status
      }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600">Cargando dashboard...</div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-600">Error al cargar los datos del dashboard</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard de Reclutamiento</h1>
          <p className="text-gray-600">Resumen general del proceso de reclutamiento</p>
        </div>
        <div className="flex gap-2">
          <Link to="/candidates/create">
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Candidato
            </Button>
          </Link>
          <Link to="/positions/create">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Posición
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Candidatos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.total_candidates}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.active_candidates} activos
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posiciones Abiertas</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.active_positions}</div>
            <p className="text-xs text-muted-foreground">
              de {dashboardData.total_positions} totales
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Evaluaciones Pendientes</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.pending_evaluations}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.completed_evaluations} completadas
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Métricas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.performance_metrics.success_rate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              tasa de éxito
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Positions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Posiciones Más Populares</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboardData.top_positions && dashboardData.top_positions.length > 0 ? (
              dashboardData.top_positions.map((position) => (
                <div key={position.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{position.title}</span>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">
                    {position.candidate_count} candidatos
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                No hay posiciones disponibles
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Métricas de Rendimiento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Tiempo promedio de contratación</span>
              <span className="font-bold">{dashboardData.performance_metrics.average_time_to_hire} días</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Tasa de éxito</span>
              <span className="font-bold">{dashboardData.performance_metrics.success_rate.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Satisfacción del candidato</span>
              <span className="font-bold">{dashboardData.performance_metrics.candidate_satisfaction.toFixed(1)}/5</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dashboardData.recent_activity && dashboardData.recent_activity.length > 0 ? (
            dashboardData.recent_activity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-sm">{activity.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-gray-100 text-gray-800 text-xs">
                      {activity.type}
                    </Badge>
                    {activity.candidate_name && (
                      <span className="text-xs text-gray-600">Candidato: {activity.candidate_name}</span>
                    )}
                    {activity.position_title && (
                      <span className="text-xs text-gray-600">Posición: {activity.position_title}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{formatDate(activity.timestamp)}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              No hay actividad reciente
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default RecruitmentDashboardPage