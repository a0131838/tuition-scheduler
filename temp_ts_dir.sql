select 
  (select count(*) from "_TeacherSubjects" ts join "Subject" s on s.id=ts."A") as a_is_subject,
  (select count(*) from "_TeacherSubjects" ts join "Teacher" t on t.id=ts."A") as a_is_teacher,
  (select count(*) from "_TeacherSubjects" ts join "Subject" s on s.id=ts."B") as b_is_subject,
  (select count(*) from "_TeacherSubjects" ts join "Teacher" t on t.id=ts."B") as b_is_teacher,
  (select count(*) from "_TeacherSubjects") as total;

select * from "_TeacherSubjects" limit 5;
