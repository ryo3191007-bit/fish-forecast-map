import type { Metadata } from "next";
import "./globals.css";
import "./bathymetry-mobile.css";
import "./filter-counts.css";

export const metadata: Metadata = {
  title: "Fish Forecast Map",
  description: "糸島西岸から平戸方面までの陸っぱり釣果予測マップMVP",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
