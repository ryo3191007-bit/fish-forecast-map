import type { Metadata } from "next";
import "./globals.css";
import "./bathymetry-mobile.css";
import "./filter-counts.css";

export const metadata: Metadata = {
  title: "FishTrace",
  description: "釣り場を探す・実地調査する・釣果を記録する・共有するための陸っぱり釣りマップ",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
