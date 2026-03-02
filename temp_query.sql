select c.id,c.name,count(s.id) as subjects
from "Course" c
left join "Subject" s on s."courseId"=c.id
where c.name like '%英语口语-双语教学%'
group by c.id,c.name;

select s.id,s.name,
  (select count(*) from "Class" cl where cl."subjectId"=s.id) as classes,
  (select count(*) from "Enrollment" e where e."subjectId"=s.id) as enrollments,
  (select count(*) from "TeacherCourseRate" tcr where tcr."subjectId"=s.id) as rates,
  (select count(*) from "MidtermReport" mr where mr."subjectId"=s.id) as reports,
  (select count(*) from "OneOnOneGroup" g where g."subjectId"=s.id) as groups
from "Subject" s join "Course" c on c.id=s."courseId"
where c.name='英语口语-双语教学'
order by s.name;
