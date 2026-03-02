with c as (
  select id,name from "Course" where name='国际学校入学考试'
)
select s.id,s.name,
  (select count(*) from "Level" l where l."subjectId"=s.id) as level_count,
  (select count(*) from "Class" cl where cl."subjectId"=s.id) as class_count,
  (select count(*) from "OneOnOneGroup" g where g."subjectId"=s.id) as group_count,
  (select count(*) from "MidtermReport" mr where mr."subjectId"=s.id) as report_count
from "Subject" s join c on c.id=s."courseId"
order by s.name;

with c as (
  select id from "Course" where name='国际学校入学考试'
)
select s.name as subject, coalesce(l.name,'(no level)') as level,
  count(distinct cl.id) as classes,
  count(distinct g.id) as groups
from "Subject" s
left join "Level" l on l."subjectId"=s.id
left join "Class" cl on cl."subjectId"=s.id and (cl."levelId" is null or cl."levelId"=l.id)
left join "OneOnOneGroup" g on g."subjectId"=s.id and (g."levelId" is null or g."levelId"=l.id)
join c on c.id=s."courseId"
group by s.name,coalesce(l.name,'(no level)')
order by s.name,coalesce(l.name,'(no level)');
