import HrSelfService from "@/app/_components/HrSelfService";
export default function AdminHrSelfPage({ searchParams }: { searchParams?: Promise<{ msg?: string; err?: string }> }) {
  return <HrSelfService returnPath="/admin/hr/my" searchParams={searchParams}/>;
}
