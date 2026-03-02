with c as (select id from "Course" where name='国际学校入学考试'),
sub as (
  select id,name from "Subject" where "courseId"=(select id from c)
),
teach_hist as (
  select distinct cl."teacherId" as teacher_id, cl."subjectId" as subject_id
  from "Class" cl join c on c.id=cl."courseId"
  where cl."teacherId" is not null
  union
  select distinct g."teacherId", g."subjectId"
  from "OneOnOneGroup" g join c on c.id=g."courseId"
  where g."teacherId" is not null
)
select t.id,t.name,
  string_agg(distinct sh.name, ', ' order by sh.name) as taught_subjects,
  string_agg(distinct sm.name, ', ' order by sm.name) as mapped_subjects
from "Teacher" t
left join teach_hist th on th.teacher_id=t.id
left join sub sh on sh.id=th.subject_id
left join "_TeacherSubjects" ts on ts."A"=t.id
left join sub sm on sm.id=ts."B"
where th.teacher_id is not null
group by t.id,t.name
order by t.name;
