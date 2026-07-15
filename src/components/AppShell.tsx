"use client";

import { useEffect, useState } from "react";
import { AuthStatusPanel } from "./AuthStatusPanel";
import { FishingDashboard } from "./FishingDashboard";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

export function AppShell() {
  const auth = useSupabaseAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const loginLabel =
    auth.status === "signed-in"
      ? (auth.user?.email ?? auth.user?.id ?? "ログイン中")
      : "ログイン";

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
          <button
            type="button"
            className="authNavButton"
            onClick={() => setIsAuthOpen(true)}
          >
            {loginLabel}
          </button>
        </nav>
        <div className="heroGrid">
          <div>
            <p className="eyebrow">
              福岡県糸島市西岸から唐津湾、伊万里湾、平戸方面まで
            </p>
            <h1>Fish Forecast Map</h1>
          </div>
        </div>
      </section>
      <FishingDashboard auth={auth} />
      <footer
        className="externalLinksFooter"
        aria-labelledby="external-links-heading"
      >
        <h2 id="external-links-heading">外部サイト参考リンク</h2>
        <ul>
          <li>
            <a
              href="https://www.chowari.jp/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Chowari
            </a>
          </li>
          <li>
            <a
              href="https://anglers.jp/catches"
              target="_blank"
              rel="noopener noreferrer"
            >
              アングラーズ
            </a>
          </li>
          <li>
            <a
              href="https://marukin-net.co.jp/fishing-report/"
              target="_blank"
              rel="noopener noreferrer"
            >
              釣り具のまるきん
            </a>
          </li>
          <li>
            <a
              href="https://釣り場.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              釣り場.com
            </a>
          </li>
        </ul>
      </footer>
      <section className="appNotice" aria-label="注意事項">
        本サービスの予報・SCORE・潮位・水深は参考情報です。実際の釣果を保証するものではなく、航海・安全判断には使用できません。現地の状況と公式情報を確認し、利用者自身の判断で行動してください。高さ誇張と水深モードの半透明海面表現は表示上の演出であり、データ精度は変わらず、実潮位・実海面高度を示すものではありません。
      </section>
      {isAuthOpen ? (
        <div className="authModalBackdrop" onClick={() => setIsAuthOpen(false)}>
          <div
            className="authModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-heading"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="authModalClose"
              onClick={() => setIsAuthOpen(false)}
              aria-label="認証モーダルを閉じる"
            >
              ×
            </button>
            <h2 id="auth-modal-heading">ログイン</h2>
            <AuthStatusPanel auth={auth} />
          </div>
        </div>
      ) : null}
    </main>
  );
}
