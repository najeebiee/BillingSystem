alter table public.pcf_transactions
add column if not exists status text not null default 'draft',
add column if not exists is_liquidated boolean not null default false,
add column if not exists liquidated_at timestamptz null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pcf_transactions_status_check'
  ) then
    alter table public.pcf_transactions
    add constraint pcf_transactions_status_check
    check (status in ('draft', 'awaiting_approval', 'rejected', 'approved', 'paid', 'void'));
  end if;
end $$;

update public.pcf_transactions
set status = 'draft'
where status is null;

update public.pcf_transactions
set is_liquidated = false
where is_liquidated is null;

create index if not exists pcf_transactions_status_idx
on public.pcf_transactions (status);

create index if not exists pcf_transactions_is_liquidated_idx
on public.pcf_transactions (is_liquidated);
