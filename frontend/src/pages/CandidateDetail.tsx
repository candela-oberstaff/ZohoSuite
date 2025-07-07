import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, User, Mail, Phone, GraduationCap, Briefcase, Award, MapPin, Calendar, Star } from 'lucide-react';
import { api } from '../services/api';
import { CandidateDetail as CandidateDetailType } from '../types';

const CandidateDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<CandidateDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCandidateDetail = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await api.getIntelliscreenCandidateDetail(id);
        console.log('API Response:', response);
        
        if (response.success && response.data) {
          setCandidate(response.data);
        } else {
          setError(response.error || 'Error al cargar el detalle del candidato');
        }
      } catch (err) {
        console.error('Error fetching candidate detail:', err);
        setError('Error al cargar el detalle del candidato');
      } finally {
        setLoading(false);
      }
    };

    fetchCandidateDetail();
  }, [id]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'completado':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
      case 'en_progreso':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Cargando detalle del candidato...</div>
        </div>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">{error || 'Candidato no encontrado'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/candidates')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver a Candidatos</span>
          </Button>
          <h1 className="text-3xl font-bold">Detalle del Candidato</h1>
        </div>
      </div>

      {/* Información Personal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Información Personal</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-xl font-semibold">{candidate.name}</h3>
              <div className="flex items-center space-x-2 text-gray-600 mt-2">
                <Mail className="h-4 w-4" />
                <span>{candidate.email}</span>
              </div>
              {candidate.phone && (
                <div className="flex items-center space-x-2 text-gray-600 mt-1">
                  <Phone className="h-4 w-4" />
                  <span>{candidate.phone}</span>
                </div>
              )}
            </div>
            {candidate.resume_properties && (
              <div className="space-y-2">
                {candidate.resume_properties.location_country && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{candidate.resume_properties.location_country}</span>
                  </div>
                )}
                {candidate.resume_properties.latest_job_title && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Briefcase className="h-4 w-4" />
                    <span>{candidate.resume_properties.latest_job_title}</span>
                  </div>
                )}
                {candidate.resume_properties.language && (
                  <div className="text-gray-600">
                    <strong>Idioma:</strong> {candidate.resume_properties.language}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assessments */}
      {candidate.assessments && candidate.assessments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5" />
              <span>Evaluaciones</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {candidate.assessments.map((assessment, index) => (
                <div key={assessment.id || index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">{assessment.name}</h4>
                      <p className="text-gray-600">{assessment.job_title}</p>
                    </div>
                    <Badge className={getStatusColor(assessment.status)}>
                      {assessment.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        Creado: {formatDate(assessment.created_at)}
                      </span>
                    </div>
                    {assessment.completed_at && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          Completado: {formatDate(assessment.completed_at)}
                        </span>
                      </div>
                    )}
                    {assessment.ai_score && (
                      <div className="flex items-center space-x-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-medium">
                          Puntuación IA: {assessment.ai_score}
                        </span>
                      </div>
                    )}
                  </div>

                  {assessment.avg_score && (
                    <div className="mb-3">
                      <span className="text-sm font-medium">
                        Puntuación Promedio: {assessment.avg_score.toFixed(1)}
                      </span>
                    </div>
                  )}

                  {assessment.tests && assessment.tests.length > 0 && (
                    <div>
                      <h5 className="font-medium mb-2">Tests:</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {assessment.tests.map((test, testIndex) => (
                          <div key={test.test_id || testIndex} className="bg-gray-50 p-2 rounded">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">{test.test_name}</span>
                              <span className="text-sm font-bold text-blue-600">{test.score}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Habilidades */}
      {candidate.skills && candidate.skills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5" />
              <span>Habilidades</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {candidate.skills.map((skill, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded-lg">
                  <div className="font-medium">{skill.skill}</div>
                  <div className="text-sm text-gray-600">
                    Experiencia: {skill.years_experience}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial Laboral */}
      {candidate.work_history && candidate.work_history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Briefcase className="h-5 w-5" />
              <span>Historial Laboral</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {candidate.work_history.map((work, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-semibold">{work.title}</h4>
                  <p className="text-gray-600">{work.company}</p>
                  <div className="text-sm text-gray-500">
                    Desde: {formatDate(work.start_date)}
                    {work.end_date && ` - Hasta: ${formatDate(work.end_date)}`}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Educación */}
      {candidate.education && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <GraduationCap className="h-5 w-5" />
              <span>Educación</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {candidate.education.education_level && (
                <div>
                  <strong>Nivel de Educación:</strong> {candidate.education.education_level}
                </div>
              )}
              
              {candidate.education.undergraduate_degree && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Pregrado</h4>
                  <div className="space-y-1">
                    <div><strong>Título:</strong> {candidate.education.undergraduate_degree}</div>
                    {candidate.education.undergraduate_school && (
                      <div><strong>Universidad:</strong> {candidate.education.undergraduate_school}</div>
                    )}
                    {candidate.education.undergraduate_gpa && (
                      <div><strong>GPA:</strong> {candidate.education.undergraduate_gpa}</div>
                    )}
                  </div>
                </div>
              )}
              
              {candidate.education.graduate_degree && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Posgrado</h4>
                  <div className="space-y-1">
                    <div><strong>Título:</strong> {candidate.education.graduate_degree}</div>
                    {candidate.education.graduate_school && (
                      <div><strong>Universidad:</strong> {candidate.education.graduate_school}</div>
                    )}
                    {candidate.education.graduate_gpa && (
                      <div><strong>GPA:</strong> {candidate.education.graduate_gpa}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CandidateDetail;