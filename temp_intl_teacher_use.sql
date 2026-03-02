with c as (select id from "Course" where name='国际学校入学考试'), olds as (
  select s.id,s.name from "Subject" s join c on c.id=s."courseId"
  where s.name not in ('英文/Eng','数学/Math','面试/Interview')
)
select
  (select count(*) from "Teacher" t where t."subjectCourseId" in (select id from olds)) as teacher_main,
  (select count(*) from "_TeacherSubjects" ts where ts."B" in (select id from olds)) as teacher_multi,
  (select count(*) from "TeacherCourseRate" tr where tr."subjectId" in (select id from olds)) as teacher_rate,
  (select count(*) from "MidtermReport" mr where mr."subjectId" in (select id from olds)) as reports;
