with c as (select id from "Course" where name='国际学校入学考试'),
eng as (select id from "Subject" where "courseId"=(select id from c) and name='英文/Eng')
select count(*) as english_levels_total,
       count(*) filter (where name like '%-%') as school_exam_levels,
       count(*) filter (where name not like '%-%') as school_only_levels
from "Level" where "subjectId"=(select id from eng);

with c as (select id from "Course" where name='国际学校入学考试')
select s.name as subject, l.name as level, count(*) as classes
from "Class" cl
join "Subject" s on s.id=cl."subjectId"
left join "Level" l on l.id=cl."levelId"
where cl."courseId"=(select id from c)
group by s.name,l.name
order by s.name,l.name;
