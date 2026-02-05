import { PrismaClient, AppointmentMode } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clean (order matters due to relations)
  await prisma.attendance.deleteMany();
  await prisma.packageTxn.deleteMany();
  await prisma.coursePackage.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.session.deleteMany();
  await prisma.teacherOneOnOneTemplate.deleteMany();
  await prisma.teacherAvailabilityDate.deleteMany();
  await prisma.teacherAvailability.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.class.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.student.deleteMany();
  await prisma.room.deleteMany();
  await prisma.campus.deleteMany();
  await prisma.level.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.course.deleteMany();

  const campus1 = await prisma.campus.create({ data: { name: "Bishan Campus" } });
  const campus2 = await prisma.campus.create({ data: { name: "Bugis Campus" } });

  const room1 = await prisma.room.create({
    data: { name: "Room A", capacity: 12, campusId: campus1.id },
  });
  await prisma.room.create({
    data: { name: "Room B", capacity: 8, campusId: campus1.id },
  });
  await prisma.room.create({
    data: { name: "Room 1", capacity: 10, campusId: campus2.id },
  });

  const teacher1 = await prisma.teacher.create({ data: { name: "Ms Tan" } });
  const teacher2 = await prisma.teacher.create({ data: { name: "Mr Lim" } });

  // Availability (weekday: 0 Sun ... 6 Sat)
  // Ms Tan: Mon & Wed 18:00-21:00
  await prisma.teacherAvailability.createMany({
    data: [
      { teacherId: teacher1.id, weekday: 1, startMin: 18 * 60, endMin: 21 * 60 },
      { teacherId: teacher1.id, weekday: 3, startMin: 18 * 60, endMin: 21 * 60 },
    ],
  });

  // Mr Lim: Tue & Thu 17:30-20:30
  await prisma.teacherAvailability.createMany({
    data: [
      { teacherId: teacher2.id, weekday: 2, startMin: 17 * 60 + 30, endMin: 20 * 60 + 30 },
      { teacherId: teacher2.id, weekday: 4, startMin: 17 * 60 + 30, endMin: 20 * 60 + 30 },
    ],
  });

  const course1 = await prisma.course.create({ data: { name: "English Writing" } });
  const course2 = await prisma.course.create({ data: { name: "A-Level Math" } });

  // Group Class
  const class1 = await prisma.class.create({
    data: {
      courseId: course1.id,
      teacherId: teacher1.id,
      campusId: campus1.id,
      roomId: room1.id,
      capacity: 12,
    },
  });

  const student1 = await prisma.student.create({ data: { name: "Student A" } });
  const student2 = await prisma.student.create({ data: { name: "Student B" } });

  await prisma.enrollment.create({
    data: { classId: class1.id, studentId: student1.id },
  });

  // Demo 1:1 appointment
  const now = new Date();
  const start = new Date(now);
  start.setHours(19, 0, 0, 0);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 60);

  await prisma.appointment.create({
    data: {
      teacherId: teacher2.id,
      studentId: student2.id,
      startAt: start,
      endAt: end,
      mode: AppointmentMode.ONLINE,
    },
  });

  console.log("Seed complete ✅");
  console.log("Demo class id:", class1.id);
  console.log("Demo students:", student1.id, student2.id);
  console.log("Demo teachers:", teacher1.id, teacher2.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
