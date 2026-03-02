with target_course as (
  select id from "Course" where name='英语口语-双语教学'
), old_subjects as (
  select s.id,s.name from "Subject" s join target_course c on c.id=s."courseId" where s.name ~ '^Grade (1[0-3]|[1-9])$'
)
select 'old_subjects' as item, count(*)::text as count from old_subjects
union all
select 'Class', count(*)::text from "Class" where "subjectId" in (select id from old_subjects)
union all
select 'OneOnOneGroup', count(*)::text from "OneOnOneGroup" where "subjectId" in (select id from old_subjects)
union all
select 'MidtermReport', count(*)::text from "MidtermReport" where "subjectId" in (select id from old_subjects)
union all
select 'TeacherCourseRate', count(*)::text from "TeacherCourseRate" where "subjectId" in (select id from old_subjects)
union all
select 'Teacher.subjectCourseId', count(*)::text from "Teacher" where "subjectCourseId" in (select id from old_subjects)
union all
select '_TeacherSubjects', count(*)::text from "_TeacherSubjects" where "B" in (select id from old_subjects)
order by item;
