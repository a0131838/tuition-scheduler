with c as (select id from "Course" where name='国际学校入学考试'),
subs as (select id,name from "Subject" where "courseId"=(select id from c)),
teachers as (
  select distinct cl."teacherId" as teacher_id from "Class" cl join c on c.id=cl."courseId" where cl."teacherId" is not null
  union
  select distinct g."teacherId" from "OneOnOneGroup" g join c on c.id=g."courseId" where g."teacherId" is not null
)
select t.name,
  s0.name as main_subject,
  string_agg(distinct s.name, ', ' order by s.name) as can_teach_subjects
from teachers th
join "Teacher" t on t.id=th.teacher_id
left join subs s0 on s0.id=t."subjectCourseId"
left join "_TeacherSubjects" ts on ts."B"=t.id
left join subs s on s.id=ts."A"
group by t.name,s0.name
order by t.name;
