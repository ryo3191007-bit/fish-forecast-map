import { FishingDashboard } from "@/components/FishingDashboard";

export default function Home() {
  return (
    <main>
      <section className="hero">
        <nav className="nav" aria-label="主要ナビゲーション">
          <strong>Fish Forecast Map</strong>
          <div>
            <a href="#map">地図</a>
            <a href="#reports">一覧</a>
          </div>
        </nav>
        <div className="heroGrid">
          <div>
            <p className="eyebrow">福岡県糸島市西岸から唐津湾、伊万里湾、平戸方面まで</p>
            <h1>陸っぱり釣果を地図とスコアで見比べるMVP</h1>
            <p>
              MapLibre GL JSの地図上にモック釣果地点を表示し、魚種・場所・釣り方・釣れそう度スコアを確認できます。
              MVPでは外部サイト取り込みやDB連携を行わず、出典付きのモックデータだけを使用します。
            </p>
            <a className="button" href="#map">マップを見る</a>
          </div>
          <aside className="heroCard">
            <span>0〜100点</span>
            <h2>説明可能な簡易スコア</h2>
            <p>直近釣果、魚種、季節、場所の相性を想定したモック根拠を表示します。</p>
          </aside>
        </div>
      </section>
      <FishingDashboard />
    </main>
  );
}
