-- ==============================================================================
-- GYMORA: Custom Domains & White-Label Branding Migration
-- Enables Tier 1 (Free Subdomain by default) and Tier 2 (Custom CNAME Domains)
-- ==============================================================================

-- 1. Add custom_domain, custom_domain_verified, brand_color to gyms table
ALTER TABLE gyms 
  ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#10b981';

-- 2. Index for fast custom domain lookup in middleware
CREATE INDEX IF NOT EXISTS idx_gyms_custom_domain ON gyms (LOWER(custom_domain)) WHERE custom_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gyms_slug ON gyms (slug);

-- 3. Security Definer RPC to lookup gym by domain or slug for public portals
CREATE OR REPLACE FUNCTION get_gym_by_host(p_host TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  logo_url TEXT,
  brand_color TEXT,
  custom_domain TEXT,
  custom_domain_verified BOOLEAN,
  payment_instructions TEXT,
  upi_id TEXT,
  upi_qr_url TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.name,
    g.slug,
    g.logo_url,
    COALESCE(g.brand_color, '#10b981'),
    g.custom_domain,
    COALESCE(g.custom_domain_verified, FALSE),
    g.payment_instructions,
    g.upi_id,
    g.upi_qr_url
  FROM gyms g
  WHERE LOWER(g.custom_domain) = LOWER(p_host)
     OR g.slug = LOWER(p_host)
  LIMIT 1;
END;
$$;
