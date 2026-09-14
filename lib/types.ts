export interface Agent {
  id: string;
  name: string;
  company_name: string;
  welcome_message: string;
  instructions: string;
  primary_color: string;
  allowed_origins: string[];
  booking_url: string;
  is_active: boolean;
  created_at: string;
}
export interface Lead {
  id: string;
  agent_id: string;
  email: string | null;
  name: string | null;
  intent_score: number;
  status: string;
  summary: string;
  created_at: string;
  updated_at: string;
}
