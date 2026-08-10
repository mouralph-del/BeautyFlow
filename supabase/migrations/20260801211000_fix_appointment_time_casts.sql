-- O esquema remoto legado armazena appointment_time como text. As funções
-- abaixo precisam converter explicitamente para time ao formatar ou somar.
do $migration$
declare
  function_ddl text;
begin
  select pg_get_functiondef('public.get_customer_space()'::regprocedure)
  into function_ddl;

  function_ddl := replace(
    function_ddl,
    'to_char(appointment.appointment_time, ''HH24:MI'')',
    'to_char(appointment.appointment_time::time, ''HH24:MI'')'
  );
  execute function_ddl;

  select pg_get_functiondef(
    'public.get_cancellation_details(text,uuid)'::regprocedure
  ) into function_ddl;

  function_ddl := replace(
    function_ddl,
    '+ appointment_record.appointment_time',
    '+ appointment_record.appointment_time::time'
  );
  function_ddl := replace(
    function_ddl,
    'to_char(appointment_record.appointment_time, ''HH24:MI'')',
    'to_char(appointment_record.appointment_time::time, ''HH24:MI'')'
  );
  execute function_ddl;

  select pg_get_functiondef(
    'public.cancel_customer_appointment(text,uuid,text)'::regprocedure
  ) into function_ddl;

  function_ddl := replace(
    function_ddl,
    '+ appointment_record.appointment_time',
    '+ appointment_record.appointment_time::time'
  );
  function_ddl := replace(
    function_ddl,
    'to_char(appointment_record.appointment_time, ''HH24:MI'')',
    'to_char(appointment_record.appointment_time::time, ''HH24:MI'')'
  );
  execute function_ddl;
end;
$migration$;
