-- Ordinal position of a verified lead among all verified leads for a page.
-- Used for Slack signup numbers so concurrent/laggy counts cannot duplicate ordinals.
CREATE OR REPLACE FUNCTION public.rank_verified_gated_lead(p_page_slug text, p_email text)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT
      verified_at,
      created_at,
      lower(email) AS email_norm
    FROM public.gated_content_leads
    WHERE page_slug = p_page_slug
      AND lower(email) = lower(p_email)
      AND verified_at IS NOT NULL
    LIMIT 1
  )
  SELECT count(*)::bigint
  FROM public.gated_content_leads g
  CROSS JOIN me
  WHERE g.page_slug = p_page_slug
    AND g.verified_at IS NOT NULL
    AND (g.verified_at, g.created_at, lower(g.email))
        <= (me.verified_at, me.created_at, me.email_norm);
$$;

COMMENT ON FUNCTION public.rank_verified_gated_lead(text, text) IS
  '1-based ordinal of a verified gated lead for Slack signup numbering.';

REVOKE ALL ON FUNCTION public.rank_verified_gated_lead(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rank_verified_gated_lead(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.rank_verified_gated_lead(text, text) TO authenticated;
