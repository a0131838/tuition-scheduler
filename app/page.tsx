export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
        fontFamily: "system-ui",
        background: "#f8fafc",
      }}
    >
      <section
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 18,
          padding: "32px 36px",
          borderRadius: 16,
          border: "1px solid #e5e7eb",
          background: "#ffffff",
          boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
          maxWidth: 860,
          width: "100%",
        }}
      >
        <img
          src="/logo.png"
          alt="Company Logo"
          style={{
            width: 720,
            height: "auto",
            maxWidth: "90vw",
            objectFit: "contain",
            display: "block",
          }}
        />
        <div>
          <h1 style={{ margin: 0, fontSize: 30 }}>Tuition Scheduler</h1>
          <div style={{ color: "#475569", marginTop: 10, fontSize: 15 }}>
            教学排课与运营管理系统 · 统一管理老师、学生、班级、课表与报名流程
          </div>
          <div style={{ marginTop: 16, color: "#64748b" }}>快速入口：</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
            <a
              href="/admin/login"
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                background: "#f8fafc",
                color: "#0f172a",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              登录
            </a>
            <a
              href="/admin"
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                background: "#f8fafc",
                color: "#0f172a",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              管理后台
            </a>
            <a
              href="/admin/schedule"
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                background: "#f8fafc",
                color: "#0f172a",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              周课表
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}


