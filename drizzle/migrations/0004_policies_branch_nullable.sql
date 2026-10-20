ALTER TABLE public.policies ALTER COLUMN branch DROP NOT NULL;
COMMENT ON COLUMN public.policies.branch IS 'DEPRECATED: replaced by branch_id (nullable for branches created after the enum)';