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
        <Suspense fallback={null}>
          <FlashAlert />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
