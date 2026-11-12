import RoomReservationsPage, { type RoomReservationsSearch } from "@/app/_components/room-reservations/RoomReservationsPage";

export default function AdminRoomReservations({ searchParams }: { searchParams: RoomReservationsSearch }) {
  return <RoomReservationsPage area="admin" searchParams={searchParams} />;
}
