ALTER TYPE public.policy_status ADD VALUE IF NOT EXISTS 'a_vencer';
ALTER TYPE public.policy_status ADD VALUE IF NOT EXISTS 'nao_renovada';
CREATE TYPE public.premium_periodicity AS ENUM ('mensal','anual','unico','distribuido_na_vigencia');
CREATE TYPE public.timeline_entity AS ENUM ('client','policy');
CREATE TYPE public.timeline_event AS ENUM ('apolice_criada','apolice_alterada','apolice_cancelada','apolice_vencida','apolice_renovada','apolice_nao_renovada','motivo_registrado','follow_up_registrado','cliente_inativado','cliente_reativado','outro');