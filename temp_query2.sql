select id,name from "Course" where name like '%英语%' order by name;

select c.name as course,s.name as subject,
  (select count(*) from "Class" cl where cl."subjectId"=s.id) as classes,
  (select count(*) from "TeacherCourseRate" tcr where tcr."subjectId"=s.id) as rates,
  (select count(*) from "MidtermReport" mr where mr."subjectId"=s.id) as reports,
  (select count(*) from "OneOnOneGroup" g where g."subjectId"=s.id) as groups,
  (select count(*) from "Level" l where l."subjectId"=s.id) as levels
from "Subject" s join "Course" c on c.id=s."courseId"
where c.name like '%英语%'
order by c.name,s.name;
