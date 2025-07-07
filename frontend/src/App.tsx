import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import RootLayout from '@/layouts/RootLayout'
import ContactsPage from '@/pages/Contacts'
import OpportunitiesPage from '@/pages/Opportunities'
import EmpresasProductosPage from '@/pages/EmpresasProductos'
import ContactDetail from '@/pages/ContactDetail'
import OpportunityDetail from '@/pages/OpportunityDetail'
import EmpresasProductosDetail from '@/pages/EmpresasProductosDetail'
import CreateContact from '@/pages/CreateContact'
import EditContact from '@/pages/EditContact'
import CreateOpportunity from '@/pages/CreateOpportunity'
import EditOpportunity from '@/pages/EditOpportunity'
import CompaniesPage from '@/pages/Companies'
import CompanyDetail from '@/pages/CompanyDetail'
import CreateCompany from '@/pages/CreateCompany'
import EditCompany from '@/pages/EditCompany'
import Customers from '@/pages/Customers'
import CustomerDetail from '@/pages/CustomerDetail'
import CreateCustomer from '@/pages/CreateCustomer'
import EditCustomer from '@/pages/EditCustomer'
import Subscriptions from '@/pages/Subscriptions'
import SubscriptionDetail from '@/pages/SubscriptionDetail'
import CandidatesPage from '@/pages/CandidatesPage'
import CreateCandidate from '@/pages/CreateCandidate'
import CandidateDetail from '@/pages/CandidateDetail'
import { useState, useEffect } from 'react'
import './App.css'
import { api } from './services/api'
import type { Contact, Opportunity } from './types'

const App = () => {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [pipelineName, setPipelineName] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Obtener contactos
        const contactsResponse = await api.getContacts()
        if (contactsResponse.success && contactsResponse.data) {
          setContacts(contactsResponse.data.items || [])
        }
        
        // Obtener oportunidades automáticamente (sin necesidad de ID)
        const opportunitiesResponse = await api.getOpportunities()
        if (opportunitiesResponse.success && opportunitiesResponse.data) {
          setOpportunities(opportunitiesResponse.data.opportunities || [])
          if (opportunitiesResponse.data.pipeline) {
            setPipelineName(opportunitiesResponse.data.pipeline.name || '')
          }
        }
        
        setError(null)
      } catch (err) {
        setError('Error al cargar los datos')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Cargando...</div>
      </div>
  )
  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">Error: {error}</div>
      </div>
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={<Navigate to="/contacts" replace />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/contacts/create" element={<CreateContact />} />
          <Route path="/contacts/:id" element={<ContactDetail />} />
          <Route path="/contacts/:id/edit" element={<EditContact />} />
          <Route path="/opportunities" element={<OpportunitiesPage />} />
          <Route path="/opportunities/create" element={<CreateOpportunity />} />
          <Route path="/opportunities/:id" element={<OpportunityDetail />} />
          <Route path="/opportunities/:id/edit" element={<EditOpportunity />} />
          
          {/* Companies Routes */}
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/companies/create" element={<CreateCompany />} />
          <Route path="/companies/:id" element={<CompanyDetail />} />
          <Route path="/companies/:id/edit" element={<EditCompany />} />
          
          {/* Empresas y Productos Routes */}
          <Route path="/empresas-productos" element={<EmpresasProductosPage />} />
          <Route path="/empresas-productos/:id" element={<EmpresasProductosDetail />} />
          <Route path="/empresas-productos/create" element={<CreateOpportunity />} />
          <Route path="/empresas-productos/:id/edit" element={<EditOpportunity />} />
        
        {/* Zoho Billing Customer Routes */}
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/customers/create" element={<CreateCustomer />} />
        <Route path="/customers/:id/edit" element={<EditCustomer />} />
        
        {/* Zoho Billing Subscription Routes */}
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/subscriptions/:id" element={<SubscriptionDetail />} />
        
        {/* Candidates Routes */}
        <Route path="/candidates" element={<CandidatesPage />} />
        <Route path="/candidates/create" element={<CreateCandidate />} />
        <Route path="/candidates/:id" element={<CandidateDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
