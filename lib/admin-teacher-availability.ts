type DeleteManyResult = { count: number };

type TeacherAvailabilityAdminDb = {
  teacherAvailabilityDate: {
    deleteMany(args: { where: { id: string; teacherId: string } }): Promise<DeleteManyResult>;
  };
  teacherAvailability: {
    deleteMany(args: { where: { id: string; teacherId: string } }): Promise<DeleteManyResult>;
  };
};

export async function deleteTeacherAvailabilityDateSlot(db: TeacherAvailabilityAdminDb, teacherId: string, id: string) {
  return db.teacherAvailabilityDate.deleteMany({
    where: { id, teacherId },
  });
}

export async function deleteTeacherAvailabilityWeeklySlot(db: TeacherAvailabilityAdminDb, teacherId: string, id: string) {
  return db.teacherAvailability.deleteMany({
    where: { id, teacherId },
  });
}
