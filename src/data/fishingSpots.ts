import type { FishingSpot } from "@/domain/fishing";

export const fishingSpots: FishingSpot[] = [
  { id: "nokita-port", name: "野北漁港周辺", areaName: "糸島西岸", latitude: 33.623, longitude: 130.138, spotType: "漁港" },
  { id: "keya-port", name: "芥屋漁港周辺", areaName: "糸島西岸", latitude: 33.594, longitude: 130.112, spotType: "漁港" },
  { id: "karatsu-east", name: "唐津東港周辺", areaName: "唐津湾", latitude: 33.455, longitude: 129.985, spotType: "湾岸" },
  { id: "niji-surf", name: "虹の松原サーフ", areaName: "唐津湾", latitude: 33.447, longitude: 130.039, spotType: "湾岸" },
  { id: "yobuko-port", name: "呼子港周辺", areaName: "唐津湾北部", latitude: 33.543, longitude: 129.892, spotType: "漁港" },
  { id: "imari-inner", name: "伊万里湾奥港湾部", areaName: "伊万里湾", latitude: 33.281, longitude: 129.861, spotType: "湾岸" },
  { id: "hirado-north", name: "平戸北部岸壁", areaName: "平戸", latitude: 33.39, longitude: 129.564, spotType: "堤防" },
  { id: "hirado-south", name: "平戸南部漁港", areaName: "平戸", latitude: 33.296, longitude: 129.488, spotType: "漁港" },
];
