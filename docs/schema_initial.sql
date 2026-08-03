-- TheInsuranceOS — Schema inicial (CORRIGIDO)
-- Aplicar via Supabase SQL Editor ou `supabase db push`

-- =============================================================================
-- 1. EXTENSÕES
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA public;

-- =============================================================================
-- 2. ENUMS
-- =============================================================================
CREATE TYPE public.app_role            AS ENUM ('admin', 'manager', 'broker');
CREATE TYPE public.policy_status       AS ENUM ('ativa','vencida','pendente','cancelada','renovada');
CREATE TYPE public.client_status       AS ENUM ('ativo','inativo','lead');
CREATE TYPE public.branch              AS ENUM ('Auto','Vida','Residencial','Empresarial','Saúde','Consórcio');
CREATE TYPE public.insurer             AS ENUM ('Porto Seguro','Bradesco','SulAmérica','Allianz','Mapfre');
CREATE TYPE public.commission_scheme   AS ENUM ('agenciamento','esgotamento','parcela','unica','vitalicio');
CREATE TYPE public.commission_kind     AS ENUM ('agenciamento','recorrencia','esgotamento','parcela','unica','vitalicio');
CREATE TYPE public.commission_status   AS ENUM ('pago','pendente','atrasado','devolvido','cancelada');
CREATE TYPE public.commission_product  AS ENUM ('saude','auto','consorcio');
CREATE TYPE public.kanban_stage        AS ENUM ('lead','cotacao','negociacao','fechado','perdido');
CREATE TYPE public.lost_reason         AS ENUM ('preco','cobertura','prazo','sem-retorno','outro');
CREATE TYPE public.beneficiary_title   AS ENUM ('titular','conjuge','filho','pai_mae','irmao','parente','outro');
CREATE TYPE public.expense_recurrence  AS ENUM ('avulsa','mensal');
CREATE TYPE public.tax_kind            AS ENUM ('sobre_receita','sobre_lucro');
CREATE TYPE public.dre_category_kind   AS ENUM ('fixa','variavel','pessoal','imposto','outra');

-- =============================================================================
-- FUNÇÃO AUXILIAR ESSENCIAL PARA A CRIAÇÃO DAS TABELAS CORE
-- =============================================================================

-- CORRIGIDO: adicionado SET search_path = public (evita warning de
-- "function_search_path_mutable" do linter do Supabase e protege contra
-- search_path hijacking).
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- =============================================================================
-- 3. TABELAS CORE
-- =============================================================================

-- team_members
CREATE TABLE public.team_members (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_team_members_updated BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- user_roles
CREATE TABLE public.user_roles (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role     public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
-- CORRIGIDO: era `GRANT SELECT ...` apenas. A política "Admin manage roles"
-- é FOR ALL (permite admin fazer INSERT/UPDATE/DELETE via RLS), mas sem o
-- GRANT correspondente na tabela, o Postgres bloqueava a operação antes
-- mesmo de avaliar a RLS.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- clients
CREATE TABLE public.clients (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  email            TEXT NOT NULL,
  phone            TEXT NOT NULL,
  document         TEXT NOT NULL,
  birth_date       DATE,
  status_override  public.client_status,
  assignee_id      UUID NOT NULL REFERENCES public.team_members(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_clients_assignee ON public.clients(assignee_id);
CREATE INDEX idx_clients_document ON public.clients(document);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- policies
CREATE TABLE public.policies (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number                   TEXT NOT NULL UNIQUE,
  client_id                UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  branch                   public.branch  NOT NULL,
  insurer                  public.insurer NOT NULL,
  premium                  NUMERIC(14,2) NOT NULL CHECK (premium >= 0),
  start_date               DATE NOT NULL,
  end_date                 DATE,
  status                   public.policy_status NOT NULL DEFAULT 'ativa',
  renewed_from_id          UUID REFERENCES public.policies(id) ON DELETE SET NULL,
  renewed_to_id            UUID REFERENCES public.policies(id) ON DELETE SET NULL,

  commission_pct           NUMERIC(6,4),
  commission_scheme        public.commission_scheme,
  commission_installments  INT CHECK (commission_installments > 0),
  agenciamento_schedule    NUMERIC(6,4)[],
  recorrencia_pct          NUMERIC(6,4),
  comissao_liquida         BOOLEAN NOT NULL DEFAULT false,
  taxa_imposto             NUMERIC(6,4) NOT NULL DEFAULT 0.1150,

  health_anniversary       DATE,
  health_initial_value     NUMERIC(14,2),
  health_category          TEXT,
  health_coparticipation   BOOLEAN,

  consortium_group         TEXT,
  consortium_quota         TEXT,
  consortium_type          TEXT CHECK (consortium_type IN ('Imóvel','Auto')),

  assignee_id              UUID NOT NULL REFERENCES public.team_members(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_policies_client   ON public.policies(client_id);
CREATE INDEX idx_policies_assignee ON public.policies(assignee_id);
CREATE INDEX idx_policies_status   ON public.policies(status);
CREATE INDEX idx_policies_end_date ON public.policies(end_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.policies TO authenticated;
GRANT ALL ON public.policies TO service_role;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_policies_updated BEFORE UPDATE ON public.policies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- beneficiaries
CREATE TABLE public.beneficiaries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id     UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  title         public.beneficiary_title NOT NULL,
  title_custom  TEXT,
  name          TEXT NOT NULL,
  birth_date    DATE NOT NULL,
  cpf           TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_beneficiaries_policy ON public.beneficiaries(policy_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beneficiaries TO authenticated;
GRANT ALL ON public.beneficiaries TO service_role;
ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_beneficiaries_updated BEFORE UPDATE ON public.beneficiaries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- commissions
CREATE TABLE public.commissions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id           UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  policy_number       TEXT NOT NULL,
  client_name         TEXT NOT NULL,
  insurer             public.insurer NOT NULL,
  amount              NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  due_date            DATE NOT NULL,
  status              public.commission_status NOT NULL DEFAULT 'pendente',
  kind                public.commission_kind,
  installment_index   INT,
  installment_total   INT,
  paid_at             TIMESTAMPTZ,
  refunded_at         TIMESTAMPTZ,
  refund_reason       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_commissions_policy   ON public.commissions(policy_id);
CREATE INDEX idx_commissions_status   ON public.commissions(status);
CREATE INDEX idx_commissions_due_date ON public.commissions(due_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commissions TO authenticated;
GRANT ALL ON public.commissions TO service_role;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_commissions_updated BEFORE UPDATE ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- commission_configs
CREATE TABLE public.commission_configs (
  id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insurer                        public.insurer NOT NULL,
  product                        public.commission_product NOT NULL,
  comissao_liquida               BOOLEAN NOT NULL DEFAULT false,
  taxa_imposto                   NUMERIC(6,4) NOT NULL DEFAULT 0.1150,
  agenciamento                   NUMERIC(6,4)[] NOT NULL DEFAULT '{1.0000,0.5000,0.3000,0.2000}',
  recorrencia_pct                NUMERIC(6,4) NOT NULL DEFAULT 0.0300,
  vitalicio_start_installment    INT,
  pct_min                        NUMERIC(6,4) NOT NULL DEFAULT 0.1000,
  pct_max                        NUMERIC(6,4) NOT NULL DEFAULT 0.2500,
  parcelado_min_installments     INT,
  adiantamento_max_installments  INT,
  default_scheme                 public.commission_scheme NOT NULL,
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (insurer, product)
);
-- CORRIGIDO: era `GRANT SELECT ...` apenas. A política "Admin manage configs"
-- é FOR ALL, mas sem GRANT de INSERT/UPDATE/DELETE o admin não conseguia
-- de fato criar/editar/excluir configurações de comissão.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_configs TO authenticated;
GRANT ALL ON public.commission_configs TO service_role;
ALTER TABLE public.commission_configs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_commission_configs_updated BEFORE UPDATE ON public.commission_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- opportunities
CREATE TABLE public.opportunities (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  client_id        UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name      TEXT NOT NULL,
  branch           public.branch NOT NULL,
  estimated_value  NUMERIC(14,2) NOT NULL DEFAULT 0,
  due_date         DATE,
  stage            public.kanban_stage NOT NULL DEFAULT 'lead',
  quote_group_id   TEXT,
  lost_reason      public.lost_reason,
  lost_note        TEXT,
  assignee_id      UUID NOT NULL REFERENCES public.team_members(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_opportunities_assignee ON public.opportunities(assignee_id);
CREATE INDEX idx_opportunities_stage    ON public.opportunities(stage);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunities TO authenticated;
GRANT ALL ON public.opportunities TO service_role;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_opportunities_updated BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- tasks
CREATE TABLE public.tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  description  TEXT,
  due_date     DATE,
  assignee_id  UUID NOT NULL REFERENCES public.team_members(id),
  column_id    TEXT,
  order_index  INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- 4. FUNÇÕES AUXILIARES
-- =============================================================================


CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- CORRIGIDO: o cast direto para public.app_role quebrava o signup caso
-- raw_user_meta_data->>'role' viesse com um valor fora do enum (typo,
-- string vazia, role customizada etc). Agora valida antes de converter.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.team_members (id, name, role, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'broker'),
    NEW.email
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE
      WHEN NEW.raw_user_meta_data->>'role' IN ('admin', 'manager', 'broker')
        THEN (NEW.raw_user_meta_data->>'role')::public.app_role
      ELSE 'broker'::public.app_role
    END
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- =============================================================================
-- 5. CAIXA & DESPESAS
-- =============================================================================

-- expenses
CREATE TABLE public.expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  category    TEXT NOT NULL,
  dre_kind    public.dre_category_kind NOT NULL,
  amount      NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  recurrence  public.expense_recurrence NOT NULL DEFAULT 'avulsa',
  due_day     SMALLINT CHECK (due_day BETWEEN 1 AND 31),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- expense_entries
CREATE TABLE public.expense_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id  UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category    TEXT NOT NULL,
  amount      NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  paid_at     TIMESTAMPTZ NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_expense_entries_expense ON public.expense_entries(expense_id);
CREATE INDEX idx_expense_entries_paid_at ON public.expense_entries(paid_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_entries TO authenticated;
GRANT ALL ON public.expense_entries TO service_role;
ALTER TABLE public.expense_entries ENABLE ROW LEVEL SECURITY;

-- manual_incomes
CREATE TABLE public.manual_incomes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  source      TEXT NOT NULL,
  amount      NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  received_at TIMESTAMPTZ NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_manual_incomes_received_at ON public.manual_incomes(received_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_incomes TO authenticated;
GRANT ALL ON public.manual_incomes TO service_role;
ALTER TABLE public.manual_incomes ENABLE ROW LEVEL SECURITY;

-- tax_entries
CREATE TABLE public.tax_entries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind             public.tax_kind NOT NULL,
  description      TEXT NOT NULL,
  amount           NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  competence_month SMALLINT NOT NULL CHECK (competence_month BETWEEN 0 AND 11),
  competence_year  INT NOT NULL,
  paid_at          TIMESTAMPTZ NOT NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tax_entries_competence ON public.tax_entries(competence_year, competence_month);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_entries TO authenticated;
GRANT ALL ON public.tax_entries TO service_role;
ALTER TABLE public.tax_entries ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 6. REPASSSES DE VENDEDORES
-- =============================================================================

-- seller_commission_rates
CREATE TABLE public.seller_commission_rates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  branch     public.branch NOT NULL,
  pct        NUMERIC(5,2) NOT NULL DEFAULT 30 CHECK (pct >= 0 AND pct <= 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, branch)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_commission_rates TO authenticated;
GRANT ALL ON public.seller_commission_rates TO service_role;
ALTER TABLE public.seller_commission_rates ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_seller_rates_updated BEFORE UPDATE ON public.seller_commission_rates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- seller_payouts
CREATE TABLE public.seller_payouts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id  UUID NOT NULL REFERENCES public.team_members(id) ON DELETE RESTRICT,
  amount     NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  paid_at    TIMESTAMPTZ NOT NULL,
  notes      TEXT,
  created_by UUID REFERENCES public.team_members(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_seller_payouts_seller  ON public.seller_payouts(seller_id);
CREATE INDEX idx_seller_payouts_paid_at ON public.seller_payouts(paid_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_payouts TO authenticated;
GRANT ALL ON public.seller_payouts TO service_role;
ALTER TABLE public.seller_payouts ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 7. DOCUMENTOS
-- =============================================================================

-- doc_folders
CREATE TABLE public.doc_folders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  parent_id      UUID REFERENCES public.doc_folders(id) ON DELETE CASCADE,
  policy_id      UUID REFERENCES public.policies(id) ON DELETE CASCADE,
  client_id      UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  is_client_root BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_doc_folders_client ON public.doc_folders(client_id);
CREATE INDEX idx_doc_folders_parent ON public.doc_folders(parent_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doc_folders TO authenticated;
GRANT ALL ON public.doc_folders TO service_role;
ALTER TABLE public.doc_folders ENABLE ROW LEVEL SECURITY;

-- doc_files
CREATE TABLE public.doc_files (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  folder_id    UUID NOT NULL REFERENCES public.doc_folders(id) ON DELETE CASCADE,
  policy_id    UUID REFERENCES public.policies(id) ON DELETE SET NULL,
  client_id    UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  storage_path TEXT,
  mime         TEXT NOT NULL,
  size_kb      INT NOT NULL DEFAULT 0,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_doc_files_folder ON public.doc_files(folder_id);
CREATE INDEX idx_doc_files_client ON public.doc_files(client_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doc_files TO authenticated;
GRANT ALL ON public.doc_files TO service_role;
ALTER TABLE public.doc_files ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 8. POLÍTICAS RLS
-- =============================================================================

-- team_members
DROP POLICY IF EXISTS "Self read" ON public.team_members;
DROP POLICY IF EXISTS "Self update" ON public.team_members;
DROP POLICY IF EXISTS "Admin manage" ON public.team_members;

CREATE POLICY "Self read" ON public.team_members
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Self update" ON public.team_members
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin manage" ON public.team_members
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- user_roles (sem recursão: checa admin em team_members)
DROP POLICY IF EXISTS "Self read roles"    ON public.user_roles;
DROP POLICY IF EXISTS "Admin manage roles" ON public.user_roles;

CREATE POLICY "Self read roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.id = auth.uid()
        AND team_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.id = auth.uid()
        AND team_members.role = 'admin'
    )
  );

-- clients
DROP POLICY IF EXISTS "Owner read"    ON public.clients;
DROP POLICY IF EXISTS "Owner insert"  ON public.clients;
DROP POLICY IF EXISTS "Owner update"  ON public.clients;
DROP POLICY IF EXISTS "Owner delete"  ON public.clients;

CREATE POLICY "Owner read" ON public.clients
  FOR SELECT TO authenticated
  USING (assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner insert" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner update" ON public.clients
  FOR UPDATE TO authenticated
  USING (assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner delete" ON public.clients
  FOR DELETE TO authenticated
  USING (assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- policies
DROP POLICY IF EXISTS "Owner read"    ON public.policies;
DROP POLICY IF EXISTS "Owner insert"  ON public.policies;
DROP POLICY IF EXISTS "Owner update"  ON public.policies;
DROP POLICY IF EXISTS "Owner delete"  ON public.policies;

CREATE POLICY "Owner read" ON public.policies
  FOR SELECT TO authenticated
  USING (assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner insert" ON public.policies
  FOR INSERT TO authenticated
  WITH CHECK (assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner update" ON public.policies
  FOR UPDATE TO authenticated
  USING (assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner delete" ON public.policies
  FOR DELETE TO authenticated
  USING (assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- opportunities
DROP POLICY IF EXISTS "Owner read"    ON public.opportunities;
DROP POLICY IF EXISTS "Owner insert"  ON public.opportunities;
DROP POLICY IF EXISTS "Owner update"  ON public.opportunities;
DROP POLICY IF EXISTS "Owner delete"  ON public.opportunities;

CREATE POLICY "Owner read" ON public.opportunities
  FOR SELECT TO authenticated
  USING (assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner insert" ON public.opportunities
  FOR INSERT TO authenticated
  WITH CHECK (assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner update" ON public.opportunities
  FOR UPDATE TO authenticated
  USING (assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner delete" ON public.opportunities
  FOR DELETE TO authenticated
  USING (assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- tasks
DROP POLICY IF EXISTS "Owner read"    ON public.tasks;
DROP POLICY IF EXISTS "Owner insert"  ON public.tasks;
DROP POLICY IF EXISTS "Owner update"  ON public.tasks;
DROP POLICY IF EXISTS "Owner delete"  ON public.tasks;

CREATE POLICY "Owner read" ON public.tasks
  FOR SELECT TO authenticated
  USING (assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner insert" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner update" ON public.tasks
  FOR UPDATE TO authenticated
  USING (assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner delete" ON public.tasks
  FOR DELETE TO authenticated
  USING (assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- beneficiaries
DROP POLICY IF EXISTS "Read via policy"  ON public.beneficiaries;
DROP POLICY IF EXISTS "Write via policy" ON public.beneficiaries;

CREATE POLICY "Read via policy" ON public.beneficiaries
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.policies p
    WHERE p.id = beneficiaries.policy_id
      AND (p.assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Write via policy" ON public.beneficiaries
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.policies p
    WHERE p.id = beneficiaries.policy_id
      AND (p.assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.policies p
    WHERE p.id = beneficiaries.policy_id
      AND (p.assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

-- commissions
DROP POLICY IF EXISTS "Read via policy"  ON public.commissions;
DROP POLICY IF EXISTS "Write via policy" ON public.commissions;

CREATE POLICY "Read via policy" ON public.commissions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.policies p
    WHERE p.id = commissions.policy_id
      AND (p.assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Write via policy" ON public.commissions
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.policies p
    WHERE p.id = commissions.policy_id
      AND (p.assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.policies p
    WHERE p.id = commissions.policy_id
      AND (p.assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

-- commission_configs
DROP POLICY IF EXISTS "All read configs"    ON public.commission_configs;
DROP POLICY IF EXISTS "Admin manage configs" ON public.commission_configs;

CREATE POLICY "All read configs" ON public.commission_configs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin manage configs" ON public.commission_configs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- financeiro operacional (caixa, despesas, impostos, repasses)
DROP POLICY IF EXISTS "Staff read"  ON public.expenses;
DROP POLICY IF EXISTS "Admin manage" ON public.expenses;
DROP POLICY IF EXISTS "Staff read"  ON public.expense_entries;
DROP POLICY IF EXISTS "Admin manage" ON public.expense_entries;
DROP POLICY IF EXISTS "Staff read"  ON public.manual_incomes;
DROP POLICY IF EXISTS "Admin manage" ON public.manual_incomes;
DROP POLICY IF EXISTS "Staff read"  ON public.tax_entries;
DROP POLICY IF EXISTS "Admin manage" ON public.tax_entries;
DROP POLICY IF EXISTS "Staff read"  ON public.seller_commission_rates;
DROP POLICY IF EXISTS "Admin manage" ON public.seller_commission_rates;
DROP POLICY IF EXISTS "Staff read"  ON public.seller_payouts;
DROP POLICY IF EXISTS "Admin manage" ON public.seller_payouts;

CREATE POLICY "Staff read" ON public.expenses
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage" ON public.expenses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Staff read" ON public.expense_entries
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage" ON public.expense_entries
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Staff read" ON public.manual_incomes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage" ON public.manual_incomes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Staff read" ON public.tax_entries
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage" ON public.tax_entries
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Staff read" ON public.seller_commission_rates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage" ON public.seller_commission_rates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Staff read" ON public.seller_payouts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage" ON public.seller_payouts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- doc_folders
DROP POLICY IF EXISTS "Read via client"  ON public.doc_folders;
DROP POLICY IF EXISTS "Write via client" ON public.doc_folders;

CREATE POLICY "Read via client" ON public.doc_folders
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = doc_folders.client_id
      AND (c.assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Write via client" ON public.doc_folders
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = doc_folders.client_id
      AND (c.assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = doc_folders.client_id
      AND (c.assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

-- doc_files
DROP POLICY IF EXISTS "Read via client"  ON public.doc_files;
DROP POLICY IF EXISTS "Write via client" ON public.doc_files;

CREATE POLICY "Read via client" ON public.doc_files
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = doc_files.client_id
      AND (c.assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Write via client" ON public.doc_files
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = doc_files.client_id
      AND (c.assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = doc_files.client_id
      AND (c.assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

-- =============================================================================
-- 9. TRIGGER DE SINCRONIZAÇÃO auth.users → public.team_members
-- =============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();