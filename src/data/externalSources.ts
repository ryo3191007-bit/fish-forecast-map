import type { ExternalSource } from "@/domain/externalSource";

export const externalSources: ExternalSource[] = [
  {
    sourceId: "marukin",
    sourceName: "釣り具のまるきん",
    sourceType: "shop",
    targetAreaNames: ["糸島", "唐津", "伊万里湾", "平戸"],
    baseUrl: "https://www.marukin-net.co.jp/",
    crawlPolicy: "unknown",
    robotsStatus: "unchecked",
    termsStatus: "unchecked",
    notes: [
      "店舗発信の釣果情報候補。対象エリアに関係する店舗・記事のみを確認対象にする。",
      "自動収集前に利用規約、robots.txt、取得対象ページ、アクセス頻度を確認する。",
    ],
  },
  {
    sourceId: "point-i",
    sourceName: "釣り具のポイント",
    sourceType: "shop",
    targetAreaNames: ["糸島", "唐津", "伊万里湾", "平戸"],
    baseUrl: "https://www.point-i.jp/",
    crawlPolicy: "unknown",
    robotsStatus: "unchecked",
    termsStatus: "unchecked",
    notes: [
      "店舗釣果・スタッフ釣果の候補。対象エリア店舗の公開情報を優先して調査する。",
      "本文や画像はコピーせず、構造化した事実情報と出典URLのみ保存する。",
    ],
  },
  {
    sourceId: "chowari",
    sourceName: "Chowari",
    sourceType: "tide",
    targetAreaNames: ["糸島", "唐津", "伊万里湾", "平戸"],
    baseUrl: "https://tide.chowari.jp/",
    crawlPolicy: "referenceOnly",
    robotsStatus: "unchecked",
    termsStatus: "unchecked",
    notes: [
      "潮汐・釣果系サイトとしてUIや確認観点の参考候補に留める。",
      "現時点ではスクレイピング、コピー、転載、取得元としての利用を行わない。",
    ],
  },
  {
    sourceId: "anglers",
    sourceName: "アングラーズ",
    sourceType: "sns_like",
    targetAreaNames: ["糸島", "唐津", "伊万里湾", "平戸"],
    baseUrl: "https://anglers.jp/",
    crawlPolicy: "manualOnly",
    robotsStatus: "unchecked",
    termsStatus: "unchecked",
    notes: [
      "ユーザー投稿型サービスのため、当面はURL手動登録または参照のみ扱いを想定する。",
      "自動収集を検討する場合は利用規約、robots.txt、投稿者権利、公開範囲を個別に確認する。",
    ],
  },
];
