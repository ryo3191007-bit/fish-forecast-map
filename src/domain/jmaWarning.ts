export type JmaWarningState = "blocked" | "clear" | "unknown" | "out-of-range";
export type JmaBulletinType = "VPWS50" | "VPWP50";

export type JmaWarningDecision = {
  state: JmaWarningState;
  reason: string;
  phenomena: string[];
  areaName: string;
  reportDateTime: string | null;
  targetStart: string | null;
  targetEnd: string | null;
  fetchedAt: string;
  bulletinType: JmaBulletinType | null;
  lastSuccessfulFetchAt: string | null;
  currentNotice?: string | null;
};

export type JmaAreaCode = { prefectureEntryCode: "400000" | "410000" | "420000"; municipalityCode: string; areaName: string };

const ITOSHIMA = { prefectureEntryCode: "400000", municipalityCode: "4023000", areaName: "福岡県糸島市" } as const;
const KARATSU = { prefectureEntryCode: "410000", municipalityCode: "4120200", areaName: "佐賀県唐津市" } as const;
const IMARI = { prefectureEntryCode: "410000", municipalityCode: "4120500", areaName: "佐賀県伊万里市" } as const;
const MATSUURA = { prefectureEntryCode: "420000", municipalityCode: "4220800", areaName: "長崎県松浦市" } as const;
const HIRADO = { prefectureEntryCode: "420000", municipalityCode: "4220700", areaName: "長崎県平戸市" } as const;

export const JMA_AREA_BY_SPOT: Record<string, JmaAreaCode> = {
  "nokita-port": ITOSHIMA, "nokita-beach": ITOSHIMA, "keya-port": ITOSHIMA, "keya-gate": ITOSHIMA,
  "funakoshi-port": ITOSHIMA, "kishi-port": ITOSHIMA, "fukuyoshi-port": ITOSHIMA,
  "hamasaki-beach": KARATSU, "niji-matsubara": KARATSU, "karatsu-east-port": KARATSU,
  "karatsu-west-port": KARATSU, "yobuko-area": KARATSU,
  "ouka-port": KARATSU, "kodomo-port": KARATSU, "kabeshima-port": KARATSU, "hado-port": KARATSU, "haregi-port": KARATSU,
  "tobo-port": KARATSU, "minatohama-port": KARATSU, "nagoya-port": KARATSU, "yobuko-port": KARATSU, "takakushi-port": KARATSU,
  "imari-inner-bay": IMARI,
  "fukushima-area": MATSUURA, "takashima-area": MATSUURA, "tabira-port": HIRADO,
  "hirado-seto": HIRADO, "ikitsuki-area": HIRADO,
};

export type OpenMeteoGateState = "blocked" | "clear" | "unknown";
export type CombinedSafetyGate = { displayOverallScore: boolean; state: "blocked-jma" | "unknown-jma" | "blocked-open-meteo" | "unknown-open-meteo" | "clear"; jmaOutOfRange: boolean };

/** The only place where JMA and Open-Meteo decide whether overall scores may be shown. */
export function combineSafetyGate(jma: JmaWarningDecision | null, openMeteo: OpenMeteoGateState): CombinedSafetyGate {
  if (!jma || jma.state === "unknown") return { displayOverallScore: false, state: "unknown-jma", jmaOutOfRange: false };
  if (jma.state === "blocked") return { displayOverallScore: false, state: "blocked-jma", jmaOutOfRange: false };
  const out = jma.state === "out-of-range";
  if (openMeteo === "blocked") return { displayOverallScore: false, state: "blocked-open-meteo", jmaOutOfRange: out };
  if (openMeteo === "unknown") return { displayOverallScore: false, state: "unknown-open-meteo", jmaOutOfRange: out };
  return { displayOverallScore: true, state: "clear", jmaOutOfRange: out };
}
