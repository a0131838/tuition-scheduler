with c as (select id from "Course" where name='国际学校入学考试')
select distinct l.name
from "Level" l
join "Subject" s on s.id=l."subjectId"
join c on c.id=s."courseId"
order by 1;
