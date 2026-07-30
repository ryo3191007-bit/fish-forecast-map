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
];
