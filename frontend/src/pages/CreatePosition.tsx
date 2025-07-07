import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Briefcase, MapPin, DollarSign, Calendar, Users, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { PositionCreate } from '@/types'
import { api } from '@/services/api'

const CreatePosition = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<PositionCreate>({
    title: '',
    department: '',
    location: '',
    employment_type: 'full_time',
    salary_min: 0,
    salary_max: 0,
    currency: 'EUR',
    description: '',
    requirements: '',
    benefits: '',
    posted_date: new Date().toISOString().split('T')[0],
    closing_date: '',
    status: 'open',
    hiring_manager: '',
    required_skills: [],
    experience_level: 'mid'
  })
  const [skillsInput, setSkillsInput] = useState('')

  const handleInputChange = (field: keyof PositionCreate, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSkillsChange = (value: string) => {
    setSkillsInput(value)
    const skillsArray = value.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0)
    handleInputChange('required_skills', skillsArray)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title || !formData.department || !formData.description) {
      alert('Por favor completa los campos obligatorios')
      return
    }

    try {
      setLoading(true)
      await api.createPosition(formData)
      console.log('Position created successfully')
      navigate('/positions')
    } catch (error) {
      console.error('Error creating position:', error)
      alert('Error al crear la posición')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/positions')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva Posición</h1>
          <p className="text-gray-600">Crea una nueva posición de trabajo</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Información Básica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Título del Puesto *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Ej: Desarrollador Frontend Senior"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="department">Departamento *</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  placeholder="Ej: Tecnología"
                  required
                />
              </div>
              <div>
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Ubicación
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="Ej: Madrid, España"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="employment_type">Tipo de Empleo</Label>
                <Select
                  value={formData.employment_type}
                  onValueChange={(value) => handleInputChange('employment_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Tiempo Completo</SelectItem>
                    <SelectItem value="part_time">Tiempo Parcial</SelectItem>
                    <SelectItem value="contract">Contrato</SelectItem>
                    <SelectItem value="freelance">Freelance</SelectItem>
                    <SelectItem value="internship">Prácticas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="experience_level">Nivel de Experiencia</Label>
                <Select
                  value={formData.experience_level}
                  onValueChange={(value) => handleInputChange('experience_level', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">Junior</SelectItem>
                    <SelectItem value="mid">Mid-Level</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="executive">Ejecutivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="hiring_manager" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Responsable de Contratación
              </Label>
              <Input
                id="hiring_manager"
                value={formData.hiring_manager}
                onChange={(e) => handleInputChange('hiring_manager', e.target.value)}
                placeholder="Nombre del responsable"
              />
            </div>
          </CardContent>
        </Card>

        {/* Salary Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Información Salarial
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="salary_min">Salario Mínimo</Label>
                <Input
                  id="salary_min"
                  type="number"
                  min="0"
                  value={formData.salary_min}
                  onChange={(e) => handleInputChange('salary_min', parseInt(e.target.value) || 0)}
                  placeholder="30000"
                />
              </div>
              <div>
                <Label htmlFor="salary_max">Salario Máximo</Label>
                <Input
                  id="salary_max"
                  type="number"
                  min="0"
                  value={formData.salary_max}
                  onChange={(e) => handleInputChange('salary_max', parseInt(e.target.value) || 0)}
                  placeholder="50000"
                />
              </div>
              <div>
                <Label htmlFor="currency">Moneda</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => handleInputChange('currency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Fechas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="posted_date">Fecha de Publicación</Label>
                <Input
                  id="posted_date"
                  type="date"
                  value={formData.posted_date}
                  onChange={(e) => handleInputChange('posted_date', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="closing_date">Fecha de Cierre</Label>
                <Input
                  id="closing_date"
                  type="date"
                  value={formData.closing_date}
                  onChange={(e) => handleInputChange('closing_date', e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="status">Estado</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Abierta</SelectItem>
                  <SelectItem value="closed">Cerrada</SelectItem>
                  <SelectItem value="on_hold">En Pausa</SelectItem>
                  <SelectItem value="filled">Cubierta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Job Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalles del Puesto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="description">Descripción del Puesto *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe las responsabilidades y funciones del puesto..."
                rows={4}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="requirements">Requisitos</Label>
              <Textarea
                id="requirements"
                value={formData.requirements}
                onChange={(e) => handleInputChange('requirements', e.target.value)}
                placeholder="Lista los requisitos necesarios para el puesto..."
                rows={4}
              />
            </div>
            
            <div>
              <Label htmlFor="required_skills">Habilidades Requeridas</Label>
              <Input
                id="required_skills"
                value={skillsInput}
                onChange={(e) => handleSkillsChange(e.target.value)}
                placeholder="Ej: React, TypeScript, Node.js (separadas por comas)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Separa las habilidades con comas
              </p>
            </div>
            
            <div>
              <Label htmlFor="benefits">Beneficios</Label>
              <Textarea
                id="benefits"
                value={formData.benefits}
                onChange={(e) => handleInputChange('benefits', e.target.value)}
                placeholder="Describe los beneficios y ventajas del puesto..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/positions')}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="flex items-center gap-2">
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {loading ? 'Guardando...' : 'Guardar Posición'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default CreatePosition