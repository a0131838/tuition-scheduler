type CampusRoomRule = {
  isOnline?: boolean | null;
  requiresRoom?: boolean | null;
};

export function campusRequiresRoom(campus: CampusRoomRule | null | undefined) {
  if (!campus) return false;
  if (typeof campus.requiresRoom === "boolean") return campus.requiresRoom;
  return !Boolean(campus.isOnline);
}
