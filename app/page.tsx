export default function Home() {
  return (
    <main style={{ padding: 40, fontFamily: "system-ui" }}>
      <h1>Tuition Scheduler MVP</h1>
      <p>Database + Prisma + Next.js is running ✅</p>
      <ul>
        <li><a href="/api/courses">/api/courses</a></li>
        <li><a href="/api/teachers">/api/teachers</a></li>
      </ul>
    </main>
  );
}