select table_name,column_name,data_type,column_default
from information_schema.columns
where table_schema='public' and table_name in ('Subject','Level') and column_name='id'
order by table_name;
