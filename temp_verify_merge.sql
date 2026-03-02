select s.name as subject, count(*) as classes
from "Subject" s
left join "Class" c on c."subjectId"=s.id
join "Course" co on co.id=s."courseId"
where co.name='英语口语-双语教学'
group by s.name
order by s.name;

select s.name as subject, l.name as level, count(*) as classes
from "Class" c
left join "Subject" s on s.id=c."subjectId"
left join "Level" l on l.id=c."levelId"
join "Course" co on co.id=c."courseId"
where co.name='英语口语-双语教学'
group by s.name,l.name
order by s.name,l.name;

select s.name as subject, count(*) as levels
from "Subject" s
left join "Level" l on l."subjectId"=s.id
join "Course" c on c.id=s."courseId"
where c.name='英语口语-双语教学'
group by s.name
order by s.name;

select count(*) as reports_new_subject
from "MidtermReport" mr
join "Subject" s on s.id=mr."subjectId"
join "Course" c on c.id=s."courseId"
where c.name='英语口语-双语教学' and s.name='低幼龄英文';
