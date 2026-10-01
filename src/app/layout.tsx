import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { loadInitial } from "@/server/session";
import Splash from "@/components/Splash";

// iPhone launch images (shown the moment the home-screen app opens, instead of a black screen)
const IPHONES: [number, number, number][] = [
  [430, 932, 3], [440, 956, 3], [402, 874, 3], [393, 852, 3], [428, 926, 3], [390, 844, 3],
  [375, 812, 3], [414, 896, 3], [414, 896, 2], [375, 667, 2], [414, 736, 3], [320, 568, 2],
];

export const metadata: Metadata = {
  title: "GrowVika CRM",
  description: "GrowVika client management, billing and company accounts",
  applicationName: "GrowVika CRM",
  appleWebApp: {
    capable: true,
    title: "GrowVika",
    statusBarStyle: "black-translucent",
    startupImage: IPHONES.map(([w, h, r]) => ({
      url: `/splash/iphone-${w * r}x${h * r}.png`,
      media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`,
    })),
  },
  formatDetection: { telephone: false },
};

// Works like an app on the phone: no pinch or double-tap zoom
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // use the full screen on notch iPhones; safe areas are padded in CSS
  themeColor: "#03081B",
};

// Loads the signed-in user's data. Wrapped in <Suspense> below, so the page starts
// arriving straight away with the splash animation while this runs on the server.
async function DataRoot({ children }: { children: React.ReactNode }) {
  const initial = await loadInitial();
  return (
    <StoreProvider initial={initial && initial !== "signed-out" ? initial : undefined} signedOut={initial === "signed-out"}>
      {children}
    </StoreProvider>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Suspense fallback={<Splash />}>
          <DataRoot>{children}</DataRoot>
        </Suspense>
      </body>
    </html>
  );
}
