import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, User, Mail, Phone, FileText, Linkedin, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { CandidateCreate } from '@/types'
import { api } from '@/services/api'

const CreateCandidate = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<CandidateCreate>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    position_applied: '',
    resume_url: '',
    linkedin_url: '',
    skills: [],
    experience_years: 0,
    education: '',
    notes: ''
  })
  const [skillsInput, setSkillsInput] = useState('')

  const handleInputChange = (field: keyof CandidateCreate, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSkillsChange = (value: string) => {
    setSkillsInput(value)
    const skillsArray = value.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0)
    handleInputChange('skills', skillsArray)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.first_name || !formData.last_name || !formData.email) {
      alert('Por favor completa los campos obligatorios')
      return
    }

    try {
      setLoading(true)
      const response = await api.createCandidate(formData)
      
      if (response.success) {
        navigate('/candidates')
      } else {
        alert(`Error al crear el candidato: ${response.error}`)
      }
    } catch (error) {
      console.error('Error creating candidate:', error)
      alert('Error al crear el candidato')
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
          onClick={() => navigate('/candidates')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo Candidato</h1>
          <p className="text-gray-600">Agrega un nuevo candidato al proceso de reclutamiento</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información Personal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">Nombre *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  placeholder="Nombre del candidato"
                  required
                />
              </div>
              <div>
                <Label htmlFor="last_name">Apellidos *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  placeholder="Apellidos del candidato"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="email@ejemplo.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Teléfono
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+34 123 456 789"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Professional Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Información Profesional
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="position_applied">Posición Aplicada</Label>
              <Input
                id="position_applied"
                value={formData.position_applied}
                onChange={(e) => handleInputChange('position_applied', e.target.value)}
                placeholder="Ej: Desarrollador Frontend Senior"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="experience_years">Años de Experiencia</Label>
                <Input
                  id="experience_years"
                  type="number"
                  min="0"
                  max="50"
                  value={formData.experience_years}
                  onChange={(e) => handleInputChange('experience_years', parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="education" className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Educación
                </Label>
                <Input
                  id="education"
                  value={formData.education}
                  onChange={(e) => handleInputChange('education', e.target.value)}
                  placeholder="Ej: Ingeniería en Sistemas"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="skills">Habilidades</Label>
              <Input
                id="skills"
                value={skillsInput}
                onChange={(e) => handleSkillsChange(e.target.value)}
                placeholder="Ej: React, TypeScript, Node.js (separadas por comas)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Separa las habilidades con comas
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="resume_url">URL del CV</Label>
                <Input
                  id="resume_url"
                  type="url"
                  value={formData.resume_url}
                  onChange={(e) => handleInputChange('resume_url', e.target.value)}
                  placeholder="https://ejemplo.com/cv.pdf"
                />
              </div>
              <div>
                <Label htmlFor="linkedin_url" className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4" />
                  LinkedIn
                </Label>
                <Input
                  id="linkedin_url"
                  type="url"
                  value={formData.linkedin_url}
                  onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
                  placeholder="https://linkedin.com/in/usuario"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="notes">Notas Adicionales</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Información adicional sobre el candidato..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/candidates')}
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
            {loading ? 'Guardando...' : 'Guardar Candidato'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default CreateCandidate