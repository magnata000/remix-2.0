ALTER TABLE public.commission_events DISABLE TRIGGER commission_events_append_only;
ALTER TABLE public.commission_payout_payments DISABLE TRIGGER commission_payout_payments_append_only;

DELETE FROM public.commission_payout_payments;
DELETE FROM public.commission_payouts;
DELETE FROM public.commission_events;
DELETE FROM public.commission_installments;
DELETE FROM public.commissions;

ALTER TABLE public.commission_events ENABLE TRIGGER commission_events_append_only;
ALTER TABLE public.commission_payout_payments ENABLE TRIGGER commission_payout_payments_append_only;