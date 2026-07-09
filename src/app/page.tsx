import { FishingDashboard } from "@/components/FishingDashboard";

export default function Home() {
  return (
    <main>
      <section className="hero">
        <nav className="nav" aria-label="主要ナビゲーション">
          <div>
            <a href="#map">地図</a>
            <a href="#reports">一覧</a>
            <a href="#external-memos">外部メモ</a>
          </div>
        </nav>
        <div className="heroGrid">
          <div>
            <p className="eyebrow">福岡県糸島市西岸から唐津湾、伊万里湾、平戸方面まで</p>
            <h1>Fish Forecast Map</h1>
            <p>
              MapLibre GL JSの地図上にモック釣果地点を表示し、魚種・場所・釣り方・SCOREを確認できます。
              MVPでは外部サイト取り込みやDB連携を行わず、出典付きのモックデータだけを使用します。
            </p>
            <a className="button" href="#map">マップを見る</a>
          </div>
        </div>
      </section>
      <FishingDashboard />
    </main>
  );
}
