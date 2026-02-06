import { Suspense } from "react";
import FlashAlert from "./_components/FlashAlert";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
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
        {children}
      </body>
    </html>
  );
}
