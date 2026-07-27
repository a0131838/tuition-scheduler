import Link from "next/link";
import "./school-guide.css";

export const metadata = {
  title: "新加坡学校指南",
  description: "使用官方资料了解新加坡政府学校、AEIS与IB学校，并找到适合孩子的申请路径。",
};

export default function SchoolGuideLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="sg">
      <header className="sg-nav">
        <div className="sg-shell sg-nav-inner">
          <Link className="sg-brand" href="/school-guide">
            新加坡学校指南
          </Link>
          <nav className="sg-nav-links" aria-label="学校指南导航">
            <Link href="/school-guide/schools">找学校</Link>
            <Link href="/school-guide#pathways">看路径</Link>
            <Link href="/school-guide/assessment">做测评</Link>
            <Link href="/school-guide/compare">比学校</Link>
            <Link href="/school-guide/consult">找顾问</Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="sg-footer">
        <div className="sg-shell sg-footer-inner">
          <div>
            <strong>新加坡学校指南</strong>
            <br />
            关键事实只采用官方来源，并显示核实日期。
          </div>
          <div>
            本指南不保证录取。申请资格、学额、费用和日期以MOE、IB及学校当期官方页面为准。
            <br />
            <Link href="/school-guide/privacy">隐私说明</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
