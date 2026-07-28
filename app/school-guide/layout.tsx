import Link from "next/link";
import "./school-guide.css";

export const metadata = {
  title: "新加坡学校指南",
  description: "使用官方资料了解新加坡学前、政府学校、国际学校、私立教育、专上院校与大学。",
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
            <Link href="/school-guide/assessment">智能选校</Link>
            <Link href="/school-guide/cases">真实案例</Link>
            <Link href="/school-guide/plan">我的方案</Link>
            <Link href="/school-guide/consult">人工评估</Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="sg-footer">
        <div className="sg-shell sg-footer-inner">
          <strong>新加坡学校指南</strong>
          <div>信息以MOE、ECDA、SSG及学校最新公布为准 · <Link href="/school-guide/privacy">隐私说明</Link></div>
        </div>
      </footer>
      <nav className="sg-mobile-dock" aria-label="学校指南移动导航">
        <Link href="/school-guide"><span>⌂</span>首页</Link>
        <Link href="/school-guide/schools"><span>⌕</span>找学校</Link>
        <Link href="/school-guide/assessment"><span>◎</span>选校</Link>
        <Link href="/school-guide/cases"><span>▤</span>案例</Link>
        <Link href="/school-guide/plan"><span>◇</span>我的</Link>
      </nav>
    </div>
  );
}
