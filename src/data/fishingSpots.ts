import type { FishingSpot } from "@/domain/fishingSpot";

export const fishingSpots: FishingSpot[] = [
  { id: "nokita-port", name: "野北漁港", areaName: "糸島西岸", latitude: 33.623, longitude: 130.138, spotType: "漁港", shoreAccess: "足場良い", targetSpecies: ["アジ", "イワシ", "サバ", "チヌ", "アオリイカ"], recommendedMethods: ["サビキ", "コマセ", "エギング"], coordinatePrecision: "rounded" },
  { id: "nokita-beach", name: "野北海岸", areaName: "糸島西岸", latitude: 33.625, longitude: 130.158, spotType: "サーフ", shoreAccess: "注意必要", targetSpecies: ["シーバス", "ヒラメ", "マゴチ", "キス"], recommendedMethods: ["キャスティング", "その他"], coordinatePrecision: "approximate" },
  { id: "keya-port", name: "芥屋漁港", areaName: "糸島西岸", latitude: 33.594, longitude: 130.112, spotType: "漁港", shoreAccess: "足場良い", targetSpecies: ["アオリイカ", "コウイカ", "アジ", "チヌ"], recommendedMethods: ["エギング", "サビキ", "コマセ"], coordinatePrecision: "rounded" },
  { id: "keya-gate", name: "芥屋大門周辺", areaName: "糸島西岸", latitude: 33.596, longitude: 130.109, spotType: "磯場", shoreAccess: "注意必要", targetSpecies: ["アオリイカ", "青物", "根魚"], recommendedMethods: ["エギング", "ジギング", "キャスティング", "その他"], notes: ["小場所や危険箇所の詳細座標は扱わず、周辺代表点として丸める。"], coordinatePrecision: "approximate" },
  { id: "funakoshi-port", name: "船越漁港", areaName: "糸島西岸", latitude: 33.577, longitude: 130.177, spotType: "漁港", shoreAccess: "足場良い", targetSpecies: ["アジ", "チヌ", "アオリイカ", "キス"], recommendedMethods: ["サビキ", "コマセ", "エギング", "その他"], coordinatePrecision: "rounded" },
  { id: "kishi-port", name: "岐志漁港", areaName: "糸島西岸", latitude: 33.568, longitude: 130.151, spotType: "漁港", shoreAccess: "足場良い", targetSpecies: ["アジ", "サバ", "チヌ", "アオリイカ"], recommendedMethods: ["サビキ", "コマセ", "エギング"], coordinatePrecision: "rounded" },
  { id: "fukuyoshi-port", name: "福吉漁港", areaName: "糸島西岸", latitude: 33.517, longitude: 130.058, spotType: "漁港", shoreAccess: "足場良い", targetSpecies: ["キス", "アジ", "チヌ", "シーバス"], recommendedMethods: ["その他", "サビキ", "コマセ", "キャスティング"], coordinatePrecision: "rounded" },
  { id: "hamasaki-beach", name: "浜崎海岸", areaName: "唐津湾", latitude: 33.447, longitude: 130.039, spotType: "サーフ", shoreAccess: "注意必要", targetSpecies: ["キス", "マゴチ", "ヒラメ", "シーバス"], recommendedMethods: ["その他", "キャスティング", "泳がせ"], coordinatePrecision: "approximate" },
  { id: "niji-matsubara", name: "虹の松原周辺", areaName: "唐津湾", latitude: 33.462, longitude: 130.016, spotType: "サーフ", shoreAccess: "注意必要", targetSpecies: ["キス", "マゴチ", "ヒラメ"], recommendedMethods: ["その他", "キャスティング", "泳がせ"], coordinatePrecision: "approximate" },
  {
    id: "karatsu-east-port",
    name: "唐津東港",
    areaName: "唐津湾",
    latitude: 33.459,
    longitude: 129.993,
    spotType: "その他",
    shoreAccess: "不明",
    targetSpecies: ["アジ", "シーバス", "チヌ"],
    recommendedMethods: [],
    notes: [
      "唐津港東港地区の代表点です。一般利用可能な釣り位置や入口を示すものではありません。",
      "立入・釣り可否は、現地表示と港湾管理者の最新案内を確認してください。",
      "魚種は過去の公開情報に基づく参考情報で、現在の釣果や時期を保証しません。",
    ],
    coordinatePrecision: "approximate",
  },
  { id: "karatsu-west-port", name: "唐津西港", areaName: "唐津湾", latitude: 33.468, longitude: 129.978, spotType: "堤防", shoreAccess: "足場良い", targetSpecies: ["サバ", "アジ", "青物", "チヌ"], recommendedMethods: ["サビキ", "ジギング", "コマセ"], coordinatePrecision: "rounded" },
  { id: "yobuko-area", name: "呼子周辺", areaName: "唐津湾北部", latitude: 33.543, longitude: 129.892, spotType: "漁港", shoreAccess: "注意必要", targetSpecies: ["ヤリイカ", "アオリイカ", "根魚", "青物"], recommendedMethods: ["エギング", "その他", "ジギング"], coordinatePrecision: "approximate" },
  { id: "imari-inner-bay", name: "伊万里湾奥", areaName: "伊万里湾", latitude: 33.281, longitude: 129.861, spotType: "湾岸", shoreAccess: "足場良い", targetSpecies: ["アジ", "シーバス", "チヌ", "ヒラメ"], recommendedMethods: ["サビキ", "キャスティング", "コマセ", "泳がせ"], coordinatePrecision: "rounded" },
  { id: "fukushima-area", name: "福島周辺", areaName: "伊万里湾", latitude: 33.332, longitude: 129.773, spotType: "磯場", shoreAccess: "注意必要", targetSpecies: ["アオリイカ", "根魚", "青物", "真鯛"], recommendedMethods: ["エギング", "その他", "ジギング", "コマセ"], coordinatePrecision: "approximate" },
  { id: "takashima-area", name: "鷹島周辺", areaName: "伊万里湾", latitude: 33.448, longitude: 129.844, spotType: "堤防", shoreAccess: "注意必要", targetSpecies: ["青物", "根魚", "アオリイカ", "真鯛"], recommendedMethods: ["ジギング", "その他", "エギング", "コマセ"], coordinatePrecision: "approximate" },
  { id: "tabira-port", name: "田平港", areaName: "平戸", latitude: 33.365, longitude: 129.553, spotType: "漁港", shoreAccess: "足場良い", targetSpecies: ["真鯛", "アジ", "チヌ", "根魚"], recommendedMethods: ["コマセ", "サビキ", "その他"], coordinatePrecision: "rounded" },
  { id: "hirado-seto", name: "平戸瀬戸周辺", areaName: "平戸", latitude: 33.354, longitude: 129.579, spotType: "磯場", shoreAccess: "注意必要", targetSpecies: ["根魚", "青物", "シイラ", "アオリイカ"], recommendedMethods: ["その他", "ジギング", "キャスティング", "エギング"], coordinatePrecision: "approximate" },
  { id: "ikitsuki-area", name: "生月島方面", areaName: "平戸", latitude: 33.390, longitude: 129.564, spotType: "地磯", shoreAccess: "上級者向け", targetSpecies: ["シイラ", "青物", "根魚", "アオリイカ"], recommendedMethods: ["キャスティング", "ジギング", "その他", "エギング"], notes: ["危険な地磯や小場所を示さない代表点として扱う。"], coordinatePrecision: "approximate" },
];

export const fishingSpotById = new Map(fishingSpots.map((spot) => [spot.id, spot]));
