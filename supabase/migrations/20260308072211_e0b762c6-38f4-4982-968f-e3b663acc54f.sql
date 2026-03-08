
-- Rate limiting table
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  endpoint text NOT NULL,
  request_count int NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  UNIQUE(identifier, endpoint)
);

-- No RLS - accessed only via SECURITY DEFINER functions
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Function: check and increment rate limit (atomic UPSERT)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_endpoint text,
  p_max_requests int,
  p_window_seconds int
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_count int;
  v_window_start timestamptz;
BEGIN
  -- Try to get existing record
  SELECT request_count, window_start INTO v_count, v_window_start
  FROM rate_limits
  WHERE identifier = p_identifier AND endpoint = p_endpoint
  FOR UPDATE;

  IF FOUND THEN
    -- Check if window expired
    IF v_window_start + (p_window_seconds || ' seconds')::interval < now() THEN
      -- Reset window
      UPDATE rate_limits
      SET request_count = 1, window_start = now()
      WHERE identifier = p_identifier AND endpoint = p_endpoint;
      RETURN true;
    END IF;

    -- Check if over limit
    IF v_count >= p_max_requests THEN
      RETURN false;
    END IF;

    -- Increment
    UPDATE rate_limits
    SET request_count = request_count + 1
    WHERE identifier = p_identifier AND endpoint = p_endpoint;
    RETURN true;
  ELSE
    -- Insert new record
    INSERT INTO rate_limits (identifier, endpoint, request_count, window_start)
    VALUES (p_identifier, p_endpoint, 1, now())
    ON CONFLICT (identifier, endpoint) DO UPDATE
    SET request_count = CASE
      WHEN rate_limits.window_start + (p_window_seconds || ' seconds')::interval < now()
      THEN 1
      ELSE rate_limits.request_count + 1
    END,
    window_start = CASE
      WHEN rate_limits.window_start + (p_window_seconds || ' seconds')::interval < now()
      THEN now()
      ELSE rate_limits.window_start
    END;

    -- Re-check after upsert
    SELECT request_count INTO v_count
    FROM rate_limits
    WHERE identifier = p_identifier AND endpoint = p_endpoint;

    RETURN v_count <= p_max_requests;
  END IF;
END;
$$;

-- Cleanup function for old rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_count int;
BEGIN
  DELETE FROM rate_limits
  WHERE window_start < now() - interval '5 minutes';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
