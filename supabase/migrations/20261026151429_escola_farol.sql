-- Descriptive school marker; it does not change the paid plan or billing.
alter table public.escolas add column escola_farol boolean not null default false;
comment on column public.escolas.escola_farol is 'Participação no projeto Escola-Farol, independente do plano Base ou Live.';
