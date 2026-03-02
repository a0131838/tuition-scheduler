select table_name
from information_schema.tables
where table_schema='public' and table_name like '\_%' escape '\'
order by table_name;

select table_name,column_name,data_type
from information_schema.columns
where table_schema='public' and table_name like '\_%' escape '\'
order by table_name,ordinal_position;
