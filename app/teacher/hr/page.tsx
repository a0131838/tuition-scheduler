import HrSelfService from "@/app/_components/HrSelfService";
export default function TeacherHrSelfPage({ searchParams }: { searchParams?: Promise<{ msg?: string; err?: string }> }) {
  return <HrSelfService returnPath="/teacher/hr" searchParams={searchParams}/>;
}
