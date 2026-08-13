-- 1. Novo tipo de papel
CREATE TYPE public.app_role_new AS ENUM ('admin', 'pos_venda', 'vendedor');

-- 2. Remover papéis antigos dos usuários
DELETE FROM public.user_roles WHERE role IN ('manager', 'broker');

-- 3. Remover políticas que dependem de has_role
DROP POLICY IF EXISTS "Read via policy" ON public.beneficiaries;
DROP POLICY IF EXISTS "Write via policy" ON public.beneficiaries;
DROP POLICY IF EXISTS "Owner read" ON public.clients;
DROP POLICY IF EXISTS "Owner insert" ON public.clients;
DROP POLICY IF EXISTS "Owner update" ON public.clients;
DROP POLICY IF EXISTS "Owner delete" ON public.clients;
DROP POLICY IF EXISTS "Admin manage configs" ON public.commission_configs;
DROP POLICY IF EXISTS "All read configs" ON public.commission_configs;
DROP POLICY IF EXISTS "Read via policy" ON public.commissions;
DROP POLICY IF EXISTS "Write via policy" ON public.commissions;
DROP POLICY IF EXISTS "Read via client" ON public.doc_files;
DROP POLICY IF EXISTS "Write via client" ON public.doc_files;
DROP POLICY IF EXISTS "Read via client" ON public.doc_folders;
DROP POLICY IF EXISTS "Write via client" ON public.doc_folders;
DROP POLICY IF EXISTS "Admin manage" ON public.expense_entries;
DROP POLICY IF EXISTS "Staff read" ON public.expense_entries;
DROP POLICY IF EXISTS "Admin manage" ON public.expenses;
DROP POLICY IF EXISTS "Staff read" ON public.expenses;
DROP POLICY IF EXISTS "Read via client" ON public.follow_ups;
DROP POLICY IF EXISTS "Write via client" ON public.follow_ups;
DROP POLICY IF EXISTS "Admin manage" ON public.manual_incomes;
DROP POLICY IF EXISTS "Staff read" ON public.manual_incomes;
DROP POLICY IF EXISTS "Owner read" ON public.opportunities;
DROP POLICY IF EXISTS "Owner insert" ON public.opportunities;
DROP POLICY IF EXISTS "Owner update" ON public.opportunities;
DROP POLICY IF EXISTS "Owner delete" ON public.opportunities;
DROP POLICY IF EXISTS "Owner read" ON public.policies;
DROP POLICY IF EXISTS "Owner insert" ON public.policies;
DROP POLICY IF EXISTS "Owner update" ON public.policies;
DROP POLICY IF EXISTS "Owner delete" ON public.policies;
DROP POLICY IF EXISTS "Admin manage" ON public.seller_commission_rates;
DROP POLICY IF EXISTS "Staff read" ON public.seller_commission_rates;
DROP POLICY IF EXISTS "Admin manage" ON public.seller_payouts;
DROP POLICY IF EXISTS "Staff read" ON public.seller_payouts;
DROP POLICY IF EXISTS "Owner read" ON public.tasks;
DROP POLICY IF EXISTS "Owner insert" ON public.tasks;
DROP POLICY IF EXISTS "Owner update" ON public.tasks;
DROP POLICY IF EXISTS "Owner delete" ON public.tasks;
DROP POLICY IF EXISTS "Admin manage" ON public.tax_entries;
DROP POLICY IF EXISTS "Staff read" ON public.tax_entries;
DROP POLICY IF EXISTS "Admin manage members" ON public.team_members;
DROP POLICY IF EXISTS "Self read" ON public.team_members;
DROP POLICY IF EXISTS "Self update" ON public.team_members;
DROP POLICY IF EXISTS "Admin manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Self read roles" ON public.user_roles;

-- 4. Trocar o tipo do enum
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
ALTER TABLE public.user_roles
  ALTER COLUMN role TYPE public.app_role_new
  USING (CASE WHEN role::text = 'admin' THEN 'admin' ELSE 'vendedor' END)::public.app_role_new;
DROP TYPE public.app_role;
ALTER TYPE public.app_role_new RENAME TO app_role;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.can_view_all(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'pos_venda')
  )
$$;

-- 5. Papéis e equipe
CREATE POLICY "Self read roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff read members" ON public.team_members FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Self update member" ON public.team_members FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manage members" ON public.team_members FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Carteira: admin e pós-venda vêem/editam tudo; vendedor só o próprio
CREATE POLICY "Carteira read" ON public.clients FOR SELECT TO authenticated
  USING (assignee_id = auth.uid() OR public.can_view_all(auth.uid()));
CREATE POLICY "Carteira insert" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (assignee_id = auth.uid() OR public.can_view_all(auth.uid()));
CREATE POLICY "Carteira update" ON public.clients FOR UPDATE TO authenticated
  USING (assignee_id = auth.uid() OR public.can_view_all(auth.uid()))
  WITH CHECK (assignee_id = auth.uid() OR public.can_view_all(auth.uid()));
CREATE POLICY "Carteira delete" ON public.clients FOR DELETE TO authenticated
  USING (assignee_id = auth.uid() OR public.can_view_all(auth.uid()));

CREATE POLICY "Carteira read" ON public.policies FOR SELECT TO authenticated
  USING (assignee_id = auth.uid() OR public.can_view_all(auth.uid()));
CREATE POLICY "Carteira insert" ON public.policies FOR INSERT TO authenticated
  WITH CHECK (assignee_id = auth.uid() OR public.can_view_all(auth.uid()));
CREATE POLICY "Carteira update" ON public.policies FOR UPDATE TO authenticated
  USING (assignee_id = auth.uid() OR public.can_view_all(auth.uid()))
  WITH CHECK (assignee_id = auth.uid() OR public.can_view_all(auth.uid()));
CREATE POLICY "Carteira delete" ON public.policies FOR DELETE TO authenticated
  USING (assignee_id = auth.uid() OR public.can_view_all(auth.uid()));

CREATE POLICY "Read via policy" ON public.beneficiaries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.policies p WHERE p.id = policy_id
    AND (p.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))));
CREATE POLICY "Write via policy" ON public.beneficiaries FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.policies p WHERE p.id = policy_id
    AND (p.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.policies p WHERE p.id = policy_id
    AND (p.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))));

CREATE POLICY "Read via policy" ON public.commissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.policies p WHERE p.id = policy_id
    AND (p.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))));
CREATE POLICY "Write via policy" ON public.commissions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.policies p WHERE p.id = policy_id
    AND (p.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.policies p WHERE p.id = policy_id
    AND (p.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))));

CREATE POLICY "Read via client" ON public.doc_files FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id
    AND (c.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))));
CREATE POLICY "Write via client" ON public.doc_files FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id
    AND (c.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id
    AND (c.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))));

CREATE POLICY "Read via client" ON public.doc_folders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id
    AND (c.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))));
CREATE POLICY "Write via client" ON public.doc_folders FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id
    AND (c.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id
    AND (c.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))));

CREATE POLICY "Read via client" ON public.follow_ups FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id
    AND (c.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))));
CREATE POLICY "Write via client" ON public.follow_ups FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id
    AND (c.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id
    AND (c.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))));

-- 7. Tarefas e oportunidades: leitura ampla p/ admin e pós-venda, escrita só do responsável
CREATE POLICY "Board read" ON public.tasks FOR SELECT TO authenticated
  USING (assignee_id = auth.uid() OR public.can_view_all(auth.uid()));
CREATE POLICY "Own insert" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Own update" ON public.tasks FOR UPDATE TO authenticated
  USING (assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Own delete" ON public.tasks FOR DELETE TO authenticated
  USING (assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Board read" ON public.opportunities FOR SELECT TO authenticated
  USING (assignee_id = auth.uid() OR public.can_view_all(auth.uid()));
CREATE POLICY "Own insert" ON public.opportunities FOR INSERT TO authenticated
  WITH CHECK (assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Own update" ON public.opportunities FOR UPDATE TO authenticated
  USING (assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Own delete" ON public.opportunities FOR DELETE TO authenticated
  USING (assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 8. Financeiro: somente admin
CREATE POLICY "Admin only" ON public.expenses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin only" ON public.expense_entries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin only" ON public.manual_incomes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin only" ON public.tax_entries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin only" ON public.seller_payouts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin only" ON public.seller_commission_rates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "All read configs" ON public.commission_configs FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Admin manage configs" ON public.commission_configs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));