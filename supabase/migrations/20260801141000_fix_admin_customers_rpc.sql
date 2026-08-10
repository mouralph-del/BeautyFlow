create or replace function public.get_admin_customers(page_number integer default 1,page_size integer default 20,search_text text default null,filter_name text default 'all',sort_name text default 'recent')
returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
 if coalesce(auth.jwt()->'app_metadata'->>'role','')<>'admin' then raise exception 'Acesso administrativo necessário'; end if;
 with appointment_data as (
   select a.*,case when a.user_id is not null then 'u:'||a.user_id::text when nullif(lower(trim(a.email)),'') is not null then 'e:'||lower(trim(a.email)) else 'p:'||regexp_replace(coalesce(a.phone,''),'\D','','g') end identity_key
   from public.appointments a
 ), appointment_enriched as (
   select a.*,coalesce((select jsonb_agg(to_jsonb(s)) from public.appointment_services s where s.appointment_id=a.id),'[]'::jsonb) services from appointment_data a
 ), identities as (
   select 'u:'||c.user_id::text identity_key,c.user_id,lower(trim(c.email)) email,regexp_replace(coalesce(c.phone,''),'\D','','g') phone,c.full_name,c.created_at,c.updated_at,c.is_active,c.promotions_authorized from public.customer_accounts c
   union
   select distinct on(identity_key) identity_key,a.user_id,lower(trim(a.email)),regexp_replace(coalesce(a.phone,''),'\D','','g'),a.customer_name,a.created_at,a.created_at,true,false from appointment_data a
   where not exists(select 1 from public.customer_accounts c where c.user_id=a.user_id) order by identity_key,created_at
 ), consolidated as (
   select i.*,
    coalesce((select min(a.created_at) from appointment_data a where a.identity_key=i.identity_key),i.created_at) first_contact,
    (select max(a.appointment_date) from appointment_data a where a.identity_key=i.identity_key and a.status='concluido') last_completed,
    (select min(a.appointment_date) from appointment_data a where a.identity_key=i.identity_key and a.status not in('cancelado','concluido') and a.appointment_date>=current_date) next_appointment,
    (select count(*) from appointment_data a where a.identity_key=i.identity_key) total_appointments,
    (select count(*) from appointment_data a where a.identity_key=i.identity_key and a.status='concluido') completed_count,
    (select count(*) from appointment_data a where a.identity_key=i.identity_key and a.status='cancelado') cancellation_count,
    (select count(*) from appointment_data a where a.identity_key=i.identity_key and a.status in('nao_compareceu','ausente')) no_show_count,
    (select coalesce(sum(a.service_price),0) from appointment_data a where a.identity_key=i.identity_key and a.status='concluido') total_spent,
    (select coalesce(sum(a.reservation_amount),0) from appointment_data a where a.identity_key=i.identity_key and a.reservation_paid) reservation_spent,
    (select max(a.created_at) from appointment_data a where a.identity_key=i.identity_key) last_activity
   from identities i
 ), filtered as (
  select * from consolidated c where
   (nullif(trim(search_text),'') is null or c.full_name ilike '%'||trim(search_text)||'%' or c.email ilike '%'||trim(search_text)||'%' or c.phone like '%'||regexp_replace(search_text,'\D','','g')||'%' or exists(select 1 from appointment_data ad join public.appointment_services aps on aps.appointment_id=ad.id where ad.identity_key=c.identity_key and aps.service_name ilike '%'||trim(search_text)||'%'))
   and case filter_name when 'registered' then c.user_id is not null when 'guest' then c.user_id is null when 'recurring' then c.completed_count>=2 when 'new' then date_trunc('month',c.first_contact)=date_trunc('month',current_date) when 'inactive' then c.last_completed<current_date-90 and c.next_appointment is null when 'upcoming' then c.next_appointment is not null when 'cancelled' then c.cancellation_count>0 when 'no_show' then c.no_show_count>0 when 'active' then c.is_active and (c.next_appointment is not null or c.last_completed>=current_date-90) when 'disabled' then not c.is_active else true end
 ), paged as (
  select * from filtered order by case when sort_name='name' then lower(full_name) end asc,case when sort_name='appointments' then completed_count end desc,case when sort_name='spent' then total_spent end desc,case when sort_name='last_service' then last_completed end desc nulls last,case when sort_name='recent' then first_contact end desc,first_contact desc limit greatest(1,page_size) offset (greatest(1,page_number)-1)*greatest(1,page_size)
 )
 select jsonb_build_object('total',(select count(*) from filtered),'metrics',jsonb_build_object('total',(select count(*) from consolidated),'new_this_month',(select count(*) from consolidated where date_trunc('month',first_contact)=date_trunc('month',current_date)),'new_previous_month',(select count(*) from consolidated where date_trunc('month',first_contact)=date_trunc('month',current_date-interval '1 month')),'recurring',(select count(*) from consolidated where completed_count>=2),'without_recent',(select count(*) from consolidated where last_completed<current_date-90 and next_appointment is null)),'clients',coalesce(jsonb_agg(to_jsonb(p)||jsonb_build_object('appointments',coalesce((select jsonb_agg(to_jsonb(a) order by a.appointment_date desc,a.appointment_time desc) from appointment_enriched a where a.identity_key=p.identity_key),'[]'::jsonb),'notes',coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at desc) from public.customer_notes n where n.identity_key=p.identity_key and n.is_active),'[]'::jsonb))),'[]'::jsonb)) into result from paged p;
 return result;
end $$;
