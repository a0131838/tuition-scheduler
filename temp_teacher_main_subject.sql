with c as (select id from "Course" where name='国际学校入学考试'),
teach_hist as (
  select distinct cl."teacherId" as teacher_id, cl."subjectId" as subject_id
  from "Class" cl join c on c.id=cl."courseId"
  where cl."teacherId" is not null
  union
  select distinct g."teacherId", g."subjectId"
  from "OneOnOneGroup" g join c on c.id=g."courseId"
  where g."teacherId" is not null
)
select t.id,t.name,t."subjectCourseId",s.name as subject_course_name
from "Teacher" t
join teach_hist th on th.teacher_id=t.id
left join "Subject" s on s.id=t."subjectCourseId"
group by t.id,t.name,t."subjectCourseId",s.name
order by t.name;
