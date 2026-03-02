with c as (select id from "Course" where name='国际学校入学考试')
select
  (select count(*) from "Class" cl join c on c.id=cl."courseId" where cl."levelId" is null) as class_level_null,
  (select count(*) from "OneOnOneGroup" g join c on c.id=g."courseId" where g."levelId" is null) as group_level_null;
