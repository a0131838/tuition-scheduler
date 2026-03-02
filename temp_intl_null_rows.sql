with c as (select id from "Course" where name='国际学校入学考试')
select 'class' as t, cl.id, s.name as old_subject, l.name as old_level, cl."teacherId" as teacher_id
from "Class" cl
left join "Subject" s on s.id=cl."subjectId"
left join "Level" l on l.id=cl."levelId"
join c on c.id=cl."courseId"
where cl."levelId" is null
union all
select 'group' as t, g.id, s.name as old_subject, l.name as old_level, g."teacherId" as teacher_id
from "OneOnOneGroup" g
left join "Subject" s on s.id=g."subjectId"
left join "Level" l on l.id=g."levelId"
join c on c.id=g."courseId"
where g."levelId" is null
order by t,id;
