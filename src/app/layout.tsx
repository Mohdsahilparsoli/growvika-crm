import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { loadInitial } from "@/server/session";

export const metadata: Metadata = {
  title: "GrowVika CRM",
  description: "GrowVika client management, billing and company accounts",
  applicationName: "GrowVika CRM",
  appleWebApp: { capable: true, title: "GrowVika", statusBarStyle: "black" },
  formatDetection: { telephone: false },
};

// Works like an app on the phone: no pinch or double-tap zoom
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#03081B",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initial = await loadInitial();
  return (
    <html lang="en">
      <body className="antialiased">
        <StoreProvider initial={initial && initial !== "signed-out" ? initial : undefined} signedOut={initial === "signed-out"}>
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
