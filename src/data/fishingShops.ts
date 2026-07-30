import type { FishingShop } from "@/domain/fishingShop";

const MARUKIN_SOURCE = {
  label: "つり具のまるきん 公式店舗案内",
  url: "https://marukin-net.co.jp/store/imari/",
} as const;

/**
 * 釣り場マスターとは独立した、公式店舗案内を確認した静的POIです。
 * 座標は公式案内からリンクされた地図上の建物・敷地の代表点であり、
 * 入口や駐車位置を示すものではありません。
 */
export const fishingShops: readonly FishingShop[] = [
  {
    id: "marukin-itoshima", name: "つり具のまるきん 糸島店",
    latitude: 33.5168557, longitude: 130.1558154,
    address: "〒819-1621 福岡県糸島市二丈上深江字小西968番地1",
    officialUrl: "https://marukin-net.co.jp/store/itoshima/", phone: "092-325-8088",
    openingHours: "年中無休・24時間営業", openingHoursCheckedAt: "2026-07-30",
    checkedAt: "2026-07-30",
    source: { ...MARUKIN_SOURCE, url: "https://marukin-net.co.jp/store/itoshima/" },
  },
  {
    id: "casting-karatsu", name: "釣具のキャスティング 唐津店",
    latitude: 33.434855, longitude: 129.979911,
    address: "〒847-0085 佐賀県唐津市和多田本村2890-1",
    officialUrl: "https://castingnet.jp/shop/shop.php?s=38", phone: "0955-74-6024",
    openingHours: "月〜金 10:00〜20:00、土・日・祝 8:00〜20:00（定休日なし）",
    openingHoursCheckedAt: "2026-07-30", checkedAt: "2026-07-30",
    source: {
      label: "釣具のキャスティング 公式 唐津店ページ",
      url: "https://castingnet.jp/shop/shop.php?s=38",
    },
  },
  {
    id: "shimaya-yobuko", name: "島屋釣漁具店",
    latitude: 33.5424262, longitude: 129.8933532,
    address: "佐賀県唐津市呼子町呼子1959", phone: "0955-82-3152",
    openingHours: "夏期 6:30〜18:30、冬期 7:00〜18:00（1月1日休み）",
    openingHoursCheckedAt: "2026-07-30", checkedAt: "2026-07-30",
    source: {
      label: "唐津観光協会 島屋釣漁具店ページ",
      url: "https://www.karatsu-kankou.jp/sp/spots/detail/59/",
    },
  },
  {
    id: "okabe-yobuko", name: "つりぐのオカベ",
    latitude: 33.532056, longitude: 129.892116,
    address: "佐賀県唐津市呼子町殿ノ浦105-1", phone: "0955-82-2120",
    openingHours: "毎日24時間営業", openingHoursCheckedAt: "2026-07-30",
    checkedAt: "2026-07-30",
    source: {
      label: "DAIWA 釣具店マップ つりぐのオカベ",
      url: "https://www.daiwa.com/jp/partner/fishingmap/shop/list/detail?shop=1191126_4203",
    },
  },
  {
    id: "marukin-imari", name: "つり具のまるきん 伊万里本店",
    latitude: 33.2680022, longitude: 129.8571368,
    address: "〒848-0035 佐賀県伊万里市二里町大里乙3番地24",
    officialUrl: "https://marukin-net.co.jp/store/imari/", phone: "0955-23-3518",
    openingHours: "年中無休・24時間営業", openingHoursCheckedAt: "2026-07-30",
    checkedAt: "2026-07-30", source: MARUKIN_SOURCE,
  },
  {
    id: "marukin-hirado", name: "つり具のまるきん 平戸店",
    latitude: 33.3624417, longitude: 129.559321,
    address: "〒859-5121 長崎県平戸市岩の上町1102番地4",
    officialUrl: "https://marukin-net.co.jp/store/hirado/", phone: "0950-22-7122",
    openingHours: "1:00〜20:00（火曜定休）", openingHoursCheckedAt: "2026-07-30",
    checkedAt: "2026-07-30",
    source: { ...MARUKIN_SOURCE, url: "https://marukin-net.co.jp/store/hirado/" },
  },
  {
    id: "yutoku-ikitsuki", name: "ホームセンターユートク 生月店",
    latitude: 33.3683194, longitude: 129.4344043,
    address: "〒859-5704 長崎県平戸市生月町山田免1051-6",
    officialUrl: "https://www.hc-yutoku.jp/store/", phone: "0950-20-5033",
    openingHours: "9:00〜18:00", openingHoursCheckedAt: "2026-07-30",
    checkedAt: "2026-07-30",
    source: {
      label: "ホームセンターユートク 公式店舗一覧・取扱商品",
      url: "https://www.hc-yutoku.jp/store/",
    },
  },
];
