import { Suspense } from "react";
import FlashAlert from "./_components/FlashAlert";
import ScrollManager from "./_components/ScrollManager";
import "@/lib/date-format-global";
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <script
          // Restore scroll position ASAP (before hydration) for same-path redirects/refreshes.
          // This reduces the visible "jump to top" / flicker on server-action driven flows.
          dangerouslySetInnerHTML={{
            __html: `(() => {
  try {
    const key = "tuition-scheduler:scroll:" + (location && location.pathname ? location.pathname : "/");
    const raw = sessionStorage.getItem(key);
    if (!raw) return;
    sessionStorage.removeItem(key);
    const y = Number(raw);
    if (!Number.isFinite(y)) return;
    window.scrollTo(0, Math.max(0, y));
  } catch {}
})();`,
          }}
        />
        <script
          // Keep browser-side Date locale output aligned with server-side formatting.
          dangerouslySetInnerHTML={{
            __html: `(() => {
  try {
    if (window.__tuitionSchedulerDateFormatInstalled) return;
    const pad2 = (n) => String(n).padStart(2, "0");
    const fmtDate = (d) => \`\${pad2(d.getDate())}/\${pad2(d.getMonth() + 1)}/\${d.getFullYear()}\`;
    const fmtTime = (d) => \`\${pad2(d.getHours())}:\${pad2(d.getMinutes())}\`;
    Date.prototype.toLocaleDateString = function () { return fmtDate(this); };
    Date.prototype.toLocaleTimeString = function () { return fmtTime(this); };
    Date.prototype.toLocaleString = function () { return \`\${fmtDate(this)} \${fmtTime(this)}\`; };
    window.__tuitionSchedulerDateFormatInstalled = true;
  } catch {}
})();`,
          }}
        />
        <style>{`
          :root {
            --btn-bg: #eef2ff;
            --btn-bg-hover: #e0e7ff;
            --btn-border: #c7d2fe;
            --btn-text: #0f172a;
          }
          a {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 5px 8px;
            border-radius: 7px;
            border: 1px solid var(--btn-border);
            background: var(--btn-bg);
            color: var(--btn-text);
            text-decoration: none;
            font-weight: 600;
            font-size: 12px;
            box-shadow: 0 1px 1px rgba(15, 23, 42, 0.06);
            transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
          }
          a:hover {
            background: var(--btn-bg-hover);
            box-shadow: 0 2px 4px rgba(15, 23, 42, 0.1);
            transform: translateY(-1px);
          }
          a:active {
            transform: translateY(0);
          }
          button {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 5px 8px;
            border-radius: 7px;
            border: 1px solid var(--btn-border);
            background: var(--btn-bg);
            color: var(--btn-text);
            text-decoration: none;
            font-weight: 600;
            font-size: 12px;
            box-shadow: 0 1px 1px rgba(15, 23, 42, 0.06);
            transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
            cursor: pointer;
          }
          button:hover {
            background: var(--btn-bg-hover);
            box-shadow: 0 2px 4px rgba(15, 23, 42, 0.1);
            transform: translateY(-1px);
          }
          button:active {
            transform: translateY(0);
          }
          button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            box-shadow: none;
            transform: none;
          }
        `}</style>
        <Suspense fallback={null}>
          <FlashAlert />
        </Suspense>
        <Suspense fallback={null}>
          <ScrollManager />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
