with c as (select id from "Course" where name='国际学校入学考试')
select count(*) as class_subject_null from "Class" cl join c on c.id=cl."courseId" where cl."subjectId" is null;
with c as (select id from "Course" where name='国际学校入学考试')
select count(*) as group_subject_null from "OneOnOneGroup" g join c on c.id=g."courseId" where g."subjectId" is null;
