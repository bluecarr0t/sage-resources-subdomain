-- Reliable signup total for Slack notifications (bypasses RLS via SECURITY DEFINER).
CREATE OR REPLACE FUNCTION public.count_verified_gated_leads(p_page_slug text)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::bigint
  FROM public.gated_content_leads
  WHERE page_slug = p_page_slug
    AND verified_at IS NOT NULL;
$$;

COMMENT ON FUNCTION public.count_verified_gated_leads(text) IS
  'Returns verified gated_content_leads count for a page_slug (used by #website Slack signup ordinals).';

REVOKE ALL ON FUNCTION public.count_verified_gated_leads(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.count_verified_gated_leads(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.count_verified_gated_leads(text) TO authenticated;
