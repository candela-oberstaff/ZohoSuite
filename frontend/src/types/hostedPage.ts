export interface HostedPageRequest {
  customer_id?: string;
  opportunity_id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  phone?: string;
}

export interface HostedPageResponse {
  success: boolean;
  data?: {
    url: string;
    expires_at?: string;
  };
  error?: string;
  message?: string;
}