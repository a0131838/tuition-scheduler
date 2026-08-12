DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgt_ai_readonly') THEN
    GRANT SELECT ON TABLE "TicketSchedulingAction" TO sgt_ai_readonly;
  END IF;
END
$$;
