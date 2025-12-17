-- ============================================
-- Auto-archive inactive leads/clients (21 days)
-- ============================================
-- Archives lead-journey deals whose related contacts haven't had activity
-- (last_seen) in the past 21 days, and logs the archive in activity_log.
-- A daily cron job runs the routine at 02:00 UTC.

-- Ensure pg_cron is available for scheduling
create extension if not exists "pg_cron" with schema extensions;

-- Function to archive inactive lead-journey deals
create or replace function public.archive_inactive_leads_and_clients()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cutoff timestamptz := now() - interval '21 days';
begin
  with candidate_deals as (
    -- Deals tied to leads (new schema)
    select distinct d.id, d.sales_id, d.company_id
    from public.deals d
    join public.contacts c on c.id = d.lead_id
    where d.archived_at is null
      and (c.last_seen is null or c.last_seen < cutoff)

    union

    -- Deals tied via legacy contact_ids when lead_id is missing
    select distinct d.id, d.sales_id, d.company_id
    from public.deals d
    join public.contacts c on c.id = any(coalesce(d.contact_ids, '{}'::bigint[]))
    where d.archived_at is null
      and d.lead_id is null
      and d.company_id is null
      and (c.last_seen is null or c.last_seen < cutoff)
  ),
  updated_deals as (
    update public.deals d
    set archived_at = now(), updated_at = now()
    from candidate_deals cd
    where d.id = cd.id
    returning d.id, d.sales_id, d.company_id
  )
  insert into public.activity_log (type, deal_id, sales_id, company_id, date)
  select 'deal.archived', id, sales_id, company_id, now()
  from updated_deals;
end;
$$;

-- Schedule daily run at 02:00 UTC (creates or updates job)
do $$
declare
  existing_job int;
begin
  select jobid into existing_job from cron.job where jobname = 'archive-inactive-leads';

  if existing_job is null then
    perform cron.schedule(
      'archive-inactive-leads',
      '0 2 * * *',
      'select public.archive_inactive_leads_and_clients()'
    );
  else
    update cron.job
      set schedule = '0 2 * * *',
          command = 'select public.archive_inactive_leads_and_clients()'
      where jobid = existing_job;
  end if;
end;
$$;



