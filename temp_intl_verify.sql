with c as (select id from "Course" where name='国际学校入学考试')
select s.name as subject,
  count(*) as levels,
  count(*) filter (where l.name='UWCSEA') as has_uwcsea_level
from "Subject" s
left join "Level" l on l."subjectId"=s.id
join c on c.id=s."courseId"
group by s.name
order by s.name;

with c as (select id from "Course" where name='国际学校入学考试')
select s.name as subject, coalesce(l.name,'(null)') as level, count(*) as classes
from "Class" cl
left join "Subject" s on s.id=cl."subjectId"
left join "Level" l on l.id=cl."levelId"
join c on c.id=cl."courseId"
group by s.name,coalesce(l.name,'(null)')
order by s.name,coalesce(l.name,'(null)');

with c as (select id from "Course" where name='国际学校入学考试')
select s.name as subject, coalesce(l.name,'(null)') as level, count(*) as groups
from "OneOnOneGroup" g
left join "Subject" s on s.id=g."subjectId"
left join "Level" l on l.id=g."levelId"
join c on c.id=g."courseId"
group by s.name,coalesce(l.name,'(null)')
order by s.name,coalesce(l.name,'(null)');

with c as (select id from "Course" where name='国际学校入学考试')
select count(*) as invalid_subject_refs
from "Class" cl join c on c.id=cl."courseId"
join "Subject" s on s.id=cl."subjectId"
where s.name not in ('英文/Eng','数学/Math','面试/Interview');
