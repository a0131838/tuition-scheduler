import HrSelfService from "@/app/_components/HrSelfService";

export default function StaffHrSelfPage({ searchParams }: { searchParams?: Promise<{ msg?: string; err?: string }> }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "clamp(14px, 3vw, 36px)", fontFamily: "system-ui" }}>
      <div style={{ width: "min(100%, 1440px)", margin: "0 auto" }}>
        <HrSelfService returnPath="/staff/hr" searchParams={searchParams}/>
      </div>
    </div>
  );
}
