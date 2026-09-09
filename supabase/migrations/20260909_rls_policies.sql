-- ============================================================================
-- 1. EXTENSIONS & SETUP
-- ============================================================================

-- Ensure UUID generation extension exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. SCHEMA DEFINITIONS
-- ============================================================================

-- Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stripe_customer_id TEXT,
  subscription_id TEXT,
  subscription_status TEXT DEFAULT 'free',
  plan_type TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization Members Table (for team access)
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- AI Agents Table
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Sales AI',
  system_prompt TEXT NOT NULL,
  welcome_message TEXT DEFAULT 'Hello! How can I help you today?',
  primary_color TEXT DEFAULT '#4F46E5',
  cal_embed_url TEXT,
  min_intent_score_for_cal INT DEFAULT 75,
  allowed_domains TEXT[] DEFAULT ARRAY['localhost:3000'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads Table
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  email TEXT,
  name TEXT,
  company_name TEXT,
  intent_score INT DEFAULT 0,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'closed')),
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead Activity / Audit Log Table
CREATE TABLE IF NOT EXISTS public.lead_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- e.g. 'slack_notified', 'demo_booked', 'email_captured'
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime publication for leads
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;

-- ============================================================================
-- 3. HELPER FUNCTIONS FOR RLS
-- ============================================================================

-- Function to check if authenticated user belongs to an organization
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1
    FROM public.organizations
    WHERE id = org_id
      AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. RLS POLICIES
-- ============================================================================

------------------------------------------------------------------------------
-- ORGANIZATIONS POLICIES
------------------------------------------------------------------------------

-- Users can view organizations they own or are members of
CREATE POLICY "Users can view their organizations"
ON public.organizations
FOR SELECT
USING (owner_id = auth.uid() OR public.is_org_member(id));

-- Users can create organizations setting themselves as owner
CREATE POLICY "Users can create organizations"
ON public.organizations
FOR INSERT
WITH CHECK (owner_id = auth.uid());

-- Owners can update their organization details
CREATE POLICY "Owners can update their organization"
ON public.organizations
FOR UPDATE
USING (owner_id = auth.uid());

------------------------------------------------------------------------------
-- AGENTS POLICIES
------------------------------------------------------------------------------

-- Dashboard users can view agents belonging to their organization
CREATE POLICY "Org members can view agents"
ON public.agents
FOR SELECT
USING (public.is_org_member(organization_id));

-- Org members can insert agents for their org
CREATE POLICY "Org members can create agents"
ON public.agents
FOR INSERT
WITH CHECK (public.is_org_member(organization_id));

-- Org members can update their agents
CREATE POLICY "Org members can update agents"
ON public.agents
FOR UPDATE
USING (public.is_org_member(organization_id));

-- Org members can delete their agents
CREATE POLICY "Org members can delete agents"
ON public.agents
FOR DELETE
USING (public.is_org_member(organization_id));

------------------------------------------------------------------------------
-- LEADS POLICIES
------------------------------------------------------------------------------

-- Dashboard users can view leads belonging to their organization
CREATE POLICY "Org members can view leads"
ON public.leads
FOR SELECT
USING (public.is_org_member(organization_id));

-- Allow anonymous visitors (unauthenticated widget users) to insert new lead records
CREATE POLICY "Public widget can capture new leads"
ON public.leads
FOR INSERT
WITH CHECK (true);

-- Org members can update lead records (e.g., status changes)
CREATE POLICY "Org members can update leads"
ON public.leads
FOR UPDATE
USING (public.is_org_member(organization_id));

------------------------------------------------------------------------------
-- LEAD ACTIVITIES POLICIES
------------------------------------------------------------------------------

-- Org members can view lead activities for leads in their organization
CREATE POLICY "Org members can view lead activities"
ON public.lead_activities
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_activities.lead_id
      AND public.is_org_member(leads.organization_id)
  )
);

-- Public/System can insert activities
CREATE POLICY "Allow lead activity logging"
ON public.lead_activities
FOR INSERT
WITH CHECK (true);

-- ============================================================================
-- 6. AUTO-JOIN OWNER TRIGGER
-- ============================================================================

-- Automatically insert organization owner into organization_members table
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_organization();
