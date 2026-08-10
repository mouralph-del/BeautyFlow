-- Experiência diária administrativa. Estruturas aditivas; não agenda nem envia e-mails.
alter table public.admin_notification_preferences add column if not exists show_daily_verse boolean not null default true;
alter table public.admin_notification_preferences add column if not exists daily_summary_email_enabled boolean not null default false;
alter table public.admin_notification_preferences add column if not exists end_of_day_email_enabled boolean not null default false;
alter table public.admin_notification_preferences add column if not exists show_closing_message boolean not null default true;

create table if not exists public.daily_verses (
  id bigint generated always as identity primary key,
  reference text not null unique,
  text text not null,
  category text not null check(category in ('esperança','força','gratidão','trabalho','cuidado','sabedoria','perseverança','paz','descanso')),
  is_active boolean not null default true,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.admin_daily_content (
  local_date date not null,
  period text not null check(period in ('morning','closing')),
  verse_id bigint references public.daily_verses(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key(local_date,period)
);
create table if not exists public.admin_day_reviews (
  id bigint generated always as identity primary key,
  local_date date not null,
  admin_user_id uuid not null references auth.users(id) on delete restrict,
  reviewed_at timestamptz not null default now(),
  summary jsonb not null default '{}'::jsonb,
  pending_items jsonb not null default '{}'::jsonb,
  closing_verse_id bigint references public.daily_verses(id) on delete set null,
  keep_pending boolean not null default false,
  email_enqueued_at timestamptz,
  unique(local_date,admin_user_id)
);

alter table public.daily_verses enable row level security;
alter table public.admin_daily_content enable row level security;
alter table public.admin_day_reviews enable row level security;
drop policy if exists "Admins read daily verses" on public.daily_verses;
create policy "Admins read daily verses" on public.daily_verses for select to authenticated using(public.is_admin());
drop policy if exists "Admins read daily content" on public.admin_daily_content;
create policy "Admins read daily content" on public.admin_daily_content for select to authenticated using(public.is_admin());
drop policy if exists "Admins read own day reviews" on public.admin_day_reviews;
create policy "Admins read own day reviews" on public.admin_day_reviews for select to authenticated using(public.is_admin() and admin_user_id=auth.uid());

-- Pequenos trechos da Almeida 1819, tradução histórica em domínio público.
insert into public.daily_verses(reference,text,category) values
('1 Coríntios 16:14','Todas as vossas coisas sejam feitas com caridade.','cuidado'),
('Salmos 23:1','O Senhor é o meu pastor; nada me faltará.','paz'),
('Provérbios 16:3','Encomenda ao Senhor as tuas obras.','trabalho'),
('Salmos 118:24','Este é o dia que fez o Senhor; regozijemo-nos nele.','gratidão'),
('Isaías 41:10','Não temas, porque eu sou contigo.','força'),
('Provérbios 3:5','Confia no Senhor de todo o teu coração.','sabedoria'),
('Romanos 12:12','Alegrai-vos na esperança, sede pacientes na tribulação.','esperança'),
('Gálatas 6:9','Não nos cansemos de fazer bem.','perseverança'),
('Salmos 4:8','Em paz me deitarei e dormirei.','descanso'),
('Salmos 29:11','O Senhor abençoará o seu povo com paz.','paz')
on conflict(reference) do update set text=excluded.text,category=excluded.category;

create or replace function public.select_daily_verse(target_date date,target_period text)
returns public.daily_verses language plpgsql security definer set search_path=public as $$
declare selected public.daily_verses%rowtype; count_active integer;
begin
  if not public.is_admin() and auth.role()<>'service_role' then raise exception 'Acesso negado'; end if;
  if target_period not in ('morning','closing') then raise exception 'Período inválido'; end if;
  perform pg_advisory_xact_lock(7463951202608046::bigint);
  select v.* into selected from public.admin_daily_content c join public.daily_verses v on v.id=c.verse_id where c.local_date=target_date and c.period=target_period;
  if found then return selected; end if;
  select count(*) into count_active from public.daily_verses where is_active;
  if count_active=0 then return null; end if;
  select v.* into selected
  from public.daily_verses v
  where v.is_active
    and (count_active=1 or not exists(
      select 1 from public.admin_daily_content same_day
      where same_day.local_date=target_date and same_day.verse_id=v.id
    ))
  order by v.last_used_at asc nulls first,v.id
  limit 1
  for update;
  if selected.id is null then
    select * into selected from public.daily_verses where is_active order by last_used_at asc nulls first,id limit 1 for update;
  end if;
  insert into public.admin_daily_content(local_date,period,verse_id) values(target_date,target_period,selected.id)
  on conflict(local_date,period) do nothing;
  select v.* into selected from public.admin_daily_content c join public.daily_verses v on v.id=c.verse_id where c.local_date=target_date and c.period=target_period;
  update public.daily_verses set last_used_at=now() where id=selected.id;
  return selected;
end $$;

create or replace function public.get_admin_daily_experience()
returns jsonb language plpgsql security definer set search_path=public as $$
declare d date:=(now() at time zone 'America/Sao_Paulo')::date; local_now timestamp:=(now() at time zone 'America/Sao_Paulo'); morning public.daily_verses%rowtype; closing public.daily_verses%rowtype; prefs public.admin_notification_preferences%rowtype; summary jsonb; close_hour time:='18:00';
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  insert into public.admin_notification_preferences(admin_user_id) values(auth.uid()) on conflict do nothing;
  select * into prefs from public.admin_notification_preferences where admin_user_id=auth.uid();
  morning:=public.select_daily_verse(d,'morning'); closing:=public.select_daily_verse(d,'closing');
  select jsonb_build_object(
    'local_date',d,'formatted_date',to_char(d,'TMDay, DD "de" TMMonth "de" YYYY'),
    'appointments',count(*) filter(where status not in('cancelado','nao_compareceu','ausente')),
    'completed',count(*) filter(where status='concluido'),'cancelled',count(*) filter(where status='cancelado'),
    'no_shows',count(*) filter(where status in('nao_compareceu','ausente')),
    'awaiting_completion',count(*) filter(where status not in('cancelado','concluido','nao_compareceu','ausente') and appointment_time::time<local_now::time),
    'payments_review',count(*) filter(where payment_status='em_analise'),
    'received',(select coalesce(sum(t.amount),0) from public.financial_transactions t where t.payment_status='received' and (t.received_at at time zone 'America/Sao_Paulo')::date=d),
    'pending_balance',coalesce(sum(case when status not in('cancelado','nao_compareceu','ausente') then remaining_amount else 0 end),0),
    'next_appointment',(select left(a2.appointment_time,5) from public.appointments a2 where a2.appointment_date=d and a2.status not in('cancelado','concluido','nao_compareceu','ausente') and a2.appointment_time::time>=local_now::time order by a2.appointment_time limit 1),
    'reschedules',(select count(*) from public.reschedule_requests where status in('pendente','pending_review')),
    'fits',(select count(*) from public.booking_requests where status in('pendente','pending_review')),
    'tomorrow_appointments',(select count(*) from public.appointments where appointment_date=d+1 and status not in('cancelado','nao_compareceu','ausente')),
    'holiday_warning',(select h.name||' precisa de uma decisão até '||to_char(h.holiday_date,'DD/MM') from public.holidays h where h.is_active and h.admin_decision='pending' and h.holiday_date between d and d+14 order by h.holiday_date limit 1),
    'can_review',local_now::time>=close_hour
  ) into summary from public.appointments where appointment_date=d;
  return jsonb_build_object('summary',summary,'morning_verse',to_jsonb(morning),'closing_verse',to_jsonb(closing),'preferences',to_jsonb(prefs));
end $$;

create or replace function public.review_admin_day(keep_pending boolean default false)
returns jsonb language plpgsql security definer set search_path=public as $$
declare d date:=(now() at time zone 'America/Sao_Paulo')::date; experience jsonb; critical integer; verse_id bigint; result public.admin_day_reviews%rowtype; end_email boolean; queued bigint;
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  experience:=public.get_admin_daily_experience(); critical:=coalesce((experience#>>'{summary,awaiting_completion}')::integer,0);
  if critical>0 and not keep_pending then raise exception 'Existem atendimentos que ainda precisam ser revisados'; end if;
  verse_id:=(experience#>>'{closing_verse,id}')::bigint;
  insert into public.admin_day_reviews(local_date,admin_user_id,summary,pending_items,closing_verse_id,keep_pending)
  values(d,auth.uid(),experience->'summary',jsonb_build_object('awaiting_completion',critical),verse_id,keep_pending)
  on conflict(local_date,admin_user_id) do update set reviewed_at=now(),summary=excluded.summary,pending_items=excluded.pending_items,closing_verse_id=excluded.closing_verse_id,keep_pending=excluded.keep_pending
  returning * into result;
  select end_of_day_email_enabled into end_email from public.admin_notification_preferences where admin_user_id=auth.uid();
  if coalesce(end_email,false) and result.email_enqueued_at is null then
    queued:=public.enqueue_automation_email(lower(trim(auth.jwt()->>'email')),'end_of_day_summary','end_of_day_summary','end-of-day:'||auth.uid()||':'||d,
      jsonb_build_object('completed',experience#>>'{summary,completed}','cancelled',experience#>>'{summary,cancelled}','no_shows',experience#>>'{summary,no_shows}','received',experience#>>'{summary,received}','pending_balance',experience#>>'{summary,pending_balance}','closing_message',case when critical>0 then 'Algumas pendências continuam esperando sua atenção.' else 'Parabéns por mais um dia concluído!' end),
      jsonb_build_object('kind','end_of_day_summary','admin_user_id',auth.uid()));
    if queued is not null then update public.admin_day_reviews set email_enqueued_at=now() where id=result.id returning * into result; end if;
  end if;
  return to_jsonb(result);
end $$;

create or replace function public.admin_save_daily_preferences(target_admin uuid,show_verse boolean,daily_email boolean,end_email boolean,show_closing boolean)
returns void language plpgsql security definer set search_path=public as $$ begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  if not exists(select 1 from auth.users where id=target_admin and raw_app_meta_data->>'role'='admin') then raise exception 'Conta administrativa não encontrada'; end if;
  insert into public.admin_notification_preferences(admin_user_id,show_daily_verse,daily_summary_email_enabled,end_of_day_email_enabled,show_closing_message,updated_at)
  values(target_admin,show_verse,daily_email,end_email,show_closing,now()) on conflict(admin_user_id) do update set show_daily_verse=excluded.show_daily_verse,daily_summary_email_enabled=excluded.daily_summary_email_enabled,end_of_day_email_enabled=excluded.end_of_day_email_enabled,show_closing_message=excluded.show_closing_message,updated_at=now();
end $$;

insert into public.notification_preferences(id,email_enabled,priority) values('end_of_day_summary',false,'normal') on conflict(id) do nothing;
insert into public.email_templates(id,subject,title,subtitle,body,signature,button_text,button_url,required_variables) values
('end_of_day_summary','Resumo do seu dia • Beauty Studio','Parabéns por mais um dia concluído! 🤎','Confira o resumo dos atendimentos e das pendências.','<p>Concluídos: {{completed}}. Cancelados: {{cancelled}}. Não comparecimentos: {{no_shows}}.</p><p>Receita recebida: {{received}}. Saldo pendente: {{pending_balance}}.</p><p>{{closing_message}}</p>','Thaís Santos Beauty Studio<br>Cuidando da sua beleza com carinho. 🤎','Abrir painel','{{site_url}}/admin',array['{{completed}}','{{cancelled}}','{{no_shows}}','{{received}}','{{pending_balance}}','{{closing_message}}','{{site_url}}']) on conflict(id) do nothing;

update public.email_templates set subject='Seu dia no Beauty Studio • {{summary_date}}',title='{{greeting}}, {{customer_name}}! 🤎',subtitle='Confira os atendimentos e as pendências de hoje.',body='<p>Você tem {{appointments}} atendimento(s) hoje.</p><p>Primeiro horário: {{first_time}}. Último horário: {{last_time}}.</p><p>Pagamentos em análise: {{payments}}. Remarcações: {{reschedules}}. Encaixes: {{fits}}.</p><p>{{verse}}</p>',button_text='Abrir painel',button_url='{{site_url}}/admin',required_variables=array['{{summary_date}}','{{greeting}}','{{customer_name}}','{{appointments}}','{{first_time}}','{{last_time}}','{{payments}}','{{reschedules}}','{{fits}}','{{verse}}','{{site_url}}'] where id='daily_summary';

create or replace function public.prepare_daily_summary_email(admin_email text) returns void language plpgsql security definer set search_path=public as $$
declare d date:=(now() at time zone 'America/Sao_Paulo')::date; verse public.daily_verses%rowtype; hour_value integer:=extract(hour from now() at time zone 'America/Sao_Paulo');
begin
  verse:=public.select_daily_verse(d,'morning');
  perform public.enqueue_automation_email(admin_email,'daily_summary','daily_summary','daily-summary:'||d,
    jsonb_build_object('customer_name','Administradora','summary_date',to_char(d,'DD/MM/YYYY'),'greeting',case when hour_value<12 then 'Bom dia' when hour_value<18 then 'Boa tarde' else 'Boa noite' end,
      'appointments',(select count(*) from public.appointments where appointment_date=d and status not in('cancelado','nao_compareceu','ausente')),
      'first_time',coalesce((select left(appointment_time,5) from public.appointments where appointment_date=d and status not in('cancelado','nao_compareceu','ausente') order by appointment_time limit 1),'—'),
      'last_time',coalesce((select left(appointment_time,5) from public.appointments where appointment_date=d and status not in('cancelado','nao_compareceu','ausente') order by appointment_time desc limit 1),'—'),
      'payments',(select count(*) from public.appointments where payment_status='em_analise'),
      'reschedules',(select count(*) from public.reschedule_requests where status in('pendente','pending_review')),
      'fits',(select count(*) from public.booking_requests where status in('pendente','pending_review')),
      'verse',verse.text||' — '||verse.reference),jsonb_build_object('kind','daily_summary','requires_admin_email',true,'requires_daily_summary_email',true));
end $$;

revoke all on function public.select_daily_verse(date,text) from public;
revoke all on function public.select_daily_verse(date,text) from anon,authenticated;
revoke all on function public.get_admin_daily_experience() from public;
revoke all on function public.get_admin_daily_experience() from anon;
revoke all on function public.review_admin_day(boolean) from public;
revoke all on function public.review_admin_day(boolean) from anon;
revoke all on function public.admin_save_daily_preferences(uuid,boolean,boolean,boolean,boolean) from public;
revoke all on function public.admin_save_daily_preferences(uuid,boolean,boolean,boolean,boolean) from anon;
revoke all on function public.prepare_daily_summary_email(text) from public;
revoke all on function public.prepare_daily_summary_email(text) from anon,authenticated;
grant execute on function public.select_daily_verse(date,text) to service_role;
grant execute on function public.prepare_daily_summary_email(text) to service_role;
grant execute on function public.get_admin_daily_experience() to authenticated;
grant execute on function public.review_admin_day(boolean) to authenticated;
grant execute on function public.admin_save_daily_preferences(uuid,boolean,boolean,boolean,boolean) to authenticated;
