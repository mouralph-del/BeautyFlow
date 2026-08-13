-- Catálogo anual e idempotente de oportunidades comerciais do BeautyFlow.
-- Reutiliza holidays, notificações administrativas e a outbox existentes.

alter table public.holidays
  add column if not exists commercial_key text;

alter table public.holidays
  drop constraint if exists holidays_admin_decision_check;
alter table public.holidays
  add constraint holidays_admin_decision_check
  check(admin_decision in('pending','open_normal','closed','special_hours','promotion_planned','dismissed'));

alter table public.holidays
  drop constraint if exists holidays_commercial_key_check;
alter table public.holidays
  add constraint holidays_commercial_key_check check(
    commercial_key is null or commercial_key in(
      'international_womens_day','mothers_day','valentines_day','customer_day',
      'black_friday','christmas','new_year'
    )
  );

create unique index if not exists holidays_commercial_key_year_unique
  on public.holidays(commercial_key,(extract(year from holiday_date)))
  where commercial_key is not null;

create or replace function public.commercial_date_for_year(target_key text,target_year integer)
returns date
language plpgsql
immutable
set search_path=public
as $$
declare
  month_start date;
  first_target date;
begin
  if target_year not between 2000 and 2200 then raise exception 'Ano inválido'; end if;
  case target_key
    when 'international_womens_day' then return make_date(target_year,3,8);
    when 'mothers_day' then
      month_start:=make_date(target_year,5,1);
      first_target:=month_start+((7-extract(dow from month_start)::integer)%7);
      return first_target+7;
    when 'valentines_day' then return make_date(target_year,6,12);
    when 'customer_day' then return make_date(target_year,9,15);
    when 'black_friday' then
      month_start:=make_date(target_year,11,1);
      first_target:=month_start+((4-extract(dow from month_start)::integer+7)%7);
      return first_target+22;
    when 'christmas' then return make_date(target_year,12,25);
    when 'new_year' then return make_date(target_year,1,1);
    else raise exception 'Data comercial inválida';
  end case;
end;
$$;

create or replace function public.commercial_opportunity_message(target_key text)
returns text
language sql
immutable
set search_path=public
as $$
  select case target_key
    when 'international_womens_day' then 'Dia da Mulher está chegando. Que tal preparar uma ação especial para suas clientes?'
    when 'mothers_day' then 'Dia das Mães está chegando. Deseja preparar uma promoção ou revisar a agenda?'
    when 'valentines_day' then 'Dia dos Namorados está chegando. Que tal preparar uma ação especial?'
    when 'customer_day' then 'Dia do Cliente está chegando. Deseja preparar uma ação especial para suas clientes?'
    when 'black_friday' then 'Black Friday está chegando. Deseja preparar uma promoção?'
    when 'christmas' then 'O Natal está chegando. Deseja preparar uma campanha ou revisar a agenda?'
    when 'new_year' then 'O Ano-Novo está chegando. Deseja preparar uma ação especial para suas clientes?'
    else 'Uma oportunidade comercial está chegando. Deseja revisar o planejamento?'
  end
$$;

create or replace function public.ensure_commercial_calendar(reference_date date default (timezone('America/Sao_Paulo',now()))::date)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  target_year integer;
  item record;
  item_date date;
  inserted_count integer:=0;
  affected integer;
begin
  if auth.role()<>'service_role' then raise exception 'Acesso negado'; end if;
  for target_year in extract(year from reference_date)::integer..extract(year from reference_date)::integer+1 loop
    for item in
      select * from (values
        ('international_womens_day','Dia Internacional da Mulher'),
        ('mothers_day','Dia das Mães'),
        ('valentines_day','Dia dos Namorados'),
        ('customer_day','Dia do Cliente'),
        ('black_friday','Black Friday'),
        ('christmas','Natal'),
        ('new_year','Ano-Novo')
      ) as catalog(commercial_key,name)
    loop
      item_date:=public.commercial_date_for_year(item.commercial_key,target_year);
      if item_date>=reference_date then
        insert into public.holidays(name,holiday_date,scope,source,admin_decision,commercial_key)
        values(item.name,item_date,'personalizado','commercial_catalog','pending',item.commercial_key)
        on conflict do nothing;
        get diagnostics affected=row_count;
        inserted_count:=inserted_count+affected;
      end if;
    end loop;
  end loop;
  return inserted_count;
end;
$$;

create or replace function public.admin_decide_commercial_opportunity(target_id uuid,target_decision text)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  if target_decision not in('promotion_planned','dismissed') then raise exception 'Decisão inválida'; end if;
  update public.holidays
     set admin_decision=target_decision,updated_at=now(),updated_by=auth.uid()
   where id=target_id and source='commercial_catalog' and commercial_key is not null;
  if not found then raise exception 'Oportunidade comercial não encontrada'; end if;
  insert into public.admin_notifications(type,title,message,category,action_url,event_key)
  values(
    'commercial_opportunity_decision',
    case target_decision when 'promotion_planned' then 'Promoção será planejada' else 'Oportunidade dispensada' end,
    (select name from public.holidays where id=target_id),
    'promoções',
    '/admin/promocoes?holiday='||target_id,
    'commercial-decision:'||target_id||':'||target_decision
  ) on conflict(event_key) where event_key is not null do nothing;
end;
$$;

insert into public.notification_preferences(id,email_enabled,priority)
values('commercial_opportunity',true,'normal')
on conflict(id) do nothing;

insert into public.email_templates(id,subject,title,subtitle,body,signature,button_text,button_url,required_variables)
values(
  'commercial_opportunity',
  '{{occasion_name}} está chegando',
  'Uma oportunidade para o Beauty Studio',
  '{{occasion_name}} será em {{occasion_date}}.',
  '<p>{{occasion_message}}</p><p>Faltam {{days_remaining}} dias para decidir.</p>',
  'Thaís Santos Beauty Studio',
  'Revisar oportunidade',
  '{{site_url}}/admin/agenda?holiday={{holiday_id}}',
  array['{{occasion_name}}','{{occasion_date}}','{{occasion_message}}','{{days_remaining}}','{{holiday_id}}','{{site_url}}']
)
on conflict(id) do update set
  subject=excluded.subject,title=excluded.title,subtitle=excluded.subtitle,body=excluded.body,
  button_text=excluded.button_text,button_url=excluded.button_url,
  required_variables=excluded.required_variables,updated_at=now();

create or replace function public.prepare_holiday_reminders()
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  h record;
  days_left integer;
  local_today date:=(timezone('America/Sao_Paulo',now()))::date;
  contextual_message text;
begin
  perform public.ensure_commercial_calendar(local_today);
  for h in
    select * from public.holidays
     where is_active and admin_decision='pending' and holiday_date>=local_today
  loop
    days_left:=h.holiday_date-local_today;
    if days_left=any(array[15,7,2]) and not days_left=any(h.reminder_days_sent) then
      if h.source='commercial_catalog' and h.commercial_key is not null then
        contextual_message:=public.commercial_opportunity_message(h.commercial_key);
        insert into public.admin_notifications(type,title,message,category,action_url,event_key)
        values(
          'commercial_opportunity',h.name||' está chegando',contextual_message,
          'promoções','/admin/agenda?holiday='||h.id,
          'commercial-reminder:'||h.id||':'||days_left
        ) on conflict(event_key) where event_key is not null do nothing;
        perform public.enqueue_automation_email(
          'admin@invalid.local','commercial_opportunity','commercial_opportunity',
          'commercial-email:'||h.id||':'||days_left,
          jsonb_build_object(
            'occasion_name',h.name,'occasion_date',to_char(h.holiday_date,'DD/MM/YYYY'),
            'occasion_message',contextual_message,'days_remaining',days_left,'holiday_id',h.id
          ),
          jsonb_build_object('requires_admin_email',true,'holiday_id',h.id,'kind','commercial_opportunity')
        );
      else
        insert into public.admin_notifications(type,title,message,category,action_url,event_key)
        values(
          'holiday_reminder','Um feriado está se aproximando',h.name||' • faltam '||days_left||' dias',
          'agenda mensal','/admin/agenda?holiday='||h.id,'holiday-reminder:'||h.id||':'||days_left
        ) on conflict(event_key) where event_key is not null do nothing;
        perform public.enqueue_automation_email(
          'admin@invalid.local','holiday_reminder','holiday_reminder','holiday-email:'||h.id||':'||days_left,
          jsonb_build_object(
            'holiday_name',h.name,'holiday_date',to_char(h.holiday_date,'DD/MM/YYYY'),
            'weekday',to_char(h.holiday_date,'TMDay'),'days_remaining',days_left,'holiday_id',h.id
          ),
          jsonb_build_object('requires_admin_email',true,'holiday_id',h.id)
        );
      end if;
      update public.holidays
         set reminder_days_sent=array_append(reminder_days_sent,days_left),reminder_sent_at=now(),updated_at=now()
       where id=h.id;
    end if;
  end loop;
end;
$$;

revoke all on function public.commercial_date_for_year(text,integer) from public,anon,authenticated;
revoke all on function public.commercial_opportunity_message(text) from public,anon,authenticated;
revoke all on function public.ensure_commercial_calendar(date) from public,anon,authenticated;
revoke all on function public.admin_decide_commercial_opportunity(uuid,text) from public,anon;
revoke all on function public.prepare_holiday_reminders() from public,anon,authenticated;
grant execute on function public.ensure_commercial_calendar(date) to service_role;
grant execute on function public.admin_decide_commercial_opportunity(uuid,text) to authenticated;
grant execute on function public.prepare_holiday_reminders() to service_role;
