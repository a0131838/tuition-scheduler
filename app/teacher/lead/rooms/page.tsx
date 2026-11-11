import RoomReservationsPage, { type RoomReservationsSearch } from "@/app/_components/room-reservations/RoomReservationsPage";

export default function TeacherRoomReservations({ searchParams }: { searchParams: RoomReservationsSearch }) {
  return <RoomReservationsPage area="teacher" searchParams={searchParams} />;
}
