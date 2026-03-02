with c as (select id from "Course" where name='国际学校入学考试')
select s.name as subject, l.name as level, count(*) as groups
from "OneOnOneGroup" g
join "Subject" s on s.id=g."subjectId"
left join "Level" l on l.id=g."levelId"
where g."courseId"=(select id from c)
group by s.name,l.name
order by s.name,l.name;
