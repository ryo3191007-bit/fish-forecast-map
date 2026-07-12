"use client";

import { useEffect, useState } from "react";
import { AuthStatusPanel } from "@/components/AuthStatusPanel";
import { FishingDashboard } from "@/components/FishingDashboard";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

const externalLinks = [
  ["Chowari", "https://www.chowari.jp/"],
  ["アングラーズ", "https://anglers.jp/catches"],
  ["釣り具のまるきん", "https://marukin-net.co.jp/fishing-report/"],
  ["釣り場.com", "https://釣り場.com/"],
] as const;

export function AppShell() {
  const auth = useSupabaseAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const loginId = auth.user?.email ?? auth.user?.id ?? "ログイン中";

  useEffect(() => {
    if (!isAuthOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsAuthOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isAuthOpen]);

  return (
    <main>
      <section className="hero">
        <nav className="nav" aria-label="主要ナビゲーション">
          <div>
            <a href="#map">地図</a>
            <a href="#reports">一覧</a>
          </div>
          <button type="button" className="authNavButton" onClick={() => setIsAuthOpen(true)}>
            {auth.status === "signed-in" ? loginId : "ログイン"}
          </button>
        </nav>
        <div className="heroGrid">
          <div>
            <p className="eyebrow">福岡県糸島市西岸から唐津湾、伊万里湾、平戸方面まで</p>
            <h1>Fish Forecast Map</h1>
            <p>
              MapLibre GL JSの地図上にモック釣果地点を表示し、手入力釣果の一覧、魚種・場所・釣り方・SCOREを確認できます。
              Supabase AuthとDB保存に対応しつつ、外部サイトの自動取り込みは行いません。
            </p>
            <a className="button" href="#map">マップを見る</a>
          </div>
        </div>
      </section>
      <FishingDashboard auth={auth} />
      <footer className="externalLinksFooter" aria-labelledby="external-links-heading">
        <h2 id="external-links-heading">外部サイト参考リンク</h2>
        <p>外部サイトは参考閲覧用であり、本アプリが情報を自動取得しているわけではありません。</p>
        <ul>
          {externalLinks.map(([label, href]) => (
            <li key={href}><a href={href} target="_blank" rel="noopener noreferrer">{label}</a></li>
          ))}
        </ul>
      </footer>
      {isAuthOpen ? (
        <div className="authModalOverlay" role="presentation" onMouseDown={() => setIsAuthOpen(false)}>
          <div className="authModal" role="dialog" aria-modal="true" aria-labelledby="auth-status-heading" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="externalMemoClose" onClick={() => setIsAuthOpen(false)} aria-label="認証モーダルを閉じる">×</button>
            <AuthStatusPanel auth={auth} />
          </div>
        </div>
      ) : null}
    </main>
  );
}
