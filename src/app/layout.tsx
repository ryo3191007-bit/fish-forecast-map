import type { Metadata } from "next";
import "./globals.css";

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
