import type { MetadataRoute } from "next";

// Lets "Add to Home Screen" open the CRM full-screen like an app
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GrowVika CRM",
    short_name: "GrowVika",
    description: "GrowVika client management, billing and company accounts",
    start_url: "/launch.html", // instant splash page, then the app
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#03081B",
    theme_color: "#03081B",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
