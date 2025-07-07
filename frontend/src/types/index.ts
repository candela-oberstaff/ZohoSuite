// Interfaces para los datos de Zoho Bigin

export interface Contact {
  id: string;
  Full_Name?: string;
  First_Name?: string;
  Last_Name?: string;
  Email?: string;
  Phone?: string;
  Mobile?: string;
  Created_Time?: string;
  Account_Name?: {
    name: string;
    id: string;
  } | null;
}

export interface Company {
  id: string;
  Account_Name: string;
  Website?: string;
  Phone?: string;
  Email?: string;
  Industry?: string;
  Annual_Revenue?: number;
  Employees?: number;
  Description?: string;
  Billing_Street?: string;
  Billing_City?: string;
  Billing_State?: string;
  Billing_Code?: string;
  Billing_Country?: string;
  Created_Time?: string;
  Modified_Time?: string;
}

export interface CompanyCreate {
  Account_Name: string;
  Website?: string;
  Phone?: string;
  Email?: string;
  Industry?: string;
  Annual_Revenue?: number;
  Employees?: number;
  Description?: string;
  Billing_Street?: string;
  Billing_City?: string;
  Billing_State?: string;
  Billing_Code?: string;
  Billing_Country?: string;
}

export interface Opportunity {
  id: string;
  Deal_Name?: string;
  Stage?: string;
  Amount?: number;
  Closing_Date?: string;
  Modified_Time?: string;
  Created_Time?: string;
  Account_Name?: {
    name: string;
    id: string;
  };
  Contact_Name?: {
    name: string;
    id: string;
  };
  Contact_Email?: string;
  Pipeline?: {
    id: string;
    name: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface OpportunitiesResponse {
  pipeline: {
    id: string;
    name: string;
  };
  opportunities: Opportunity[];
}

export interface Module {
  id: string;
  api_name: string;
  module_name: string;
  [key: string]: unknown;
}

export interface TeamPipeline {
  id: string;
  name: string;
  type?: string;
  [key: string]: unknown;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

// Interfaces para los datos de Zoho Billing

export interface BillingAddress {
  attention?: string;
  address?: string;
  street2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
  fax?: string;
}

export interface Customer {
  customer_id: string;
  display_name: string;
  company_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  website?: string;
  billing_address?: BillingAddress;
  shipping_address?: BillingAddress;
  currency_id?: string;
  currency_code?: string;
  notes?: string;
  created_time?: string;
  last_modified_time?: string;
  status?: string;
  payment_terms?: number;
  payment_terms_label?: string;
  custom_fields?: Record<string, any>[];
}

export interface CustomerCreate {
  display_name: string;
  company_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  website?: string;
  billing_address?: BillingAddress;
  shipping_address?: BillingAddress;
  notes?: string;
}

export interface CustomersResponse {
  customers: Customer[];
  total: number;
}

// Interfaz para transacciones de Zoho Billing
export interface Transaction {
  transaction_id: string;
  reference_id: string;
  date: string;
  type: string;
  status: string;
  amount: string;
}

// Interfaces para suscripciones de Zoho Billing
export interface Subscription {
  subscription_id: string;
  name: string;
  status: string;
  subscription_number: string;
  amount: string;
  currency_code?: string;
  created_time: string;
  next_billing_at?: string;
  last_billing_at?: string;
  expiry_at?: string;
  plan_name?: string;
  plan_code?: string;
  interval?: number;
  interval_unit?: string;
  customer_id?: string;
  customer_name?: string;
}

export interface CustomerDetailData {
  customer: Customer;
  subscriptions?: Subscription[];
  transactions?: Transaction[];
}

// Interfaces para planes de suscripción
export interface Plan {
  plan_code: string;
  plan_name: string;
  description?: string;
  price: number;
  currency_code?: string;
  interval: number;
  interval_unit: string;
  trial_period?: number;
  trial_period_unit?: string;
  setup_fee?: number;
  status?: string;
  created_time?: string;
  updated_time?: string;
}

// Interfaces para crear/actualizar suscripciones
export interface SubscriptionCreate {
  customer_id: string;
  plan_code: string;
  trial_days?: number;
  coupon_code?: string;
  auto_collect?: boolean;
  [key: string]: any;
}

export interface SubscriptionUpdate {
  plan_code?: string;
  quantity?: number;
  auto_collect?: boolean;
  [key: string]: any;
}

// Interfaces para crear/actualizar planes
export interface PlanCreate {
  plan_code: string;
  plan_name: string;
  description?: string;
  price: number;
  currency_code?: string;
  interval: number;
  interval_unit: string;
  trial_period?: number;
  trial_period_unit?: string;
  setup_fee?: number;
  [key: string]: any;
}

export interface PlanUpdate {
  plan_name?: string;
  description?: string;
  price?: number;
  trial_period?: number;
  trial_period_unit?: string;
  setup_fee?: number;
  [key: string]: any;
}

// Interfaces para el módulo de Recruitment
export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  position?: string;
  created_at?: string;
  updated_at?: string;
}

// Interfaces para la API de Intelliscreen
export interface IntelliscreenAssessment {
  id: string;
  name: string;
  job_title: string;
  status: string;
  created_at: string;
}

export interface IntelliscreenCandidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  assessments: IntelliscreenAssessment[];
}

export interface CandidatesApiResponse {
  candidates: IntelliscreenCandidate[];
  total: number;
  page: number;
  num_pages: number;
  page_size: number;
}

export interface Position {
  id: string;
  title: string;
  department?: string;
  status: string;
  description?: string;
  requirements?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Assessment {
  id: string;
  name: string;
  type: string;
  status: string;
  candidate_id?: string;
  position_id?: string;
  score?: number;
  created_at?: string;
  updated_at?: string;
}

export interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  candidate_name?: string;
  position_title?: string;
}

export interface TopPosition {
  id: string;
  title: string;
  candidate_count: number;
}

export interface PerformanceMetrics {
  average_time_to_hire: number;
  success_rate: number;
  candidate_satisfaction: number;
}

export interface RecruitmentDashboard {
  total_positions: number;
  active_positions: number;
  total_candidates: number;
  active_candidates: number;
  pending_evaluations: number;
  completed_evaluations: number;
  recent_activity: RecentActivity[];
  top_positions: TopPosition[];
  performance_metrics: PerformanceMetrics;
}