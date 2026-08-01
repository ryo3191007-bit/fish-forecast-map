"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SaveSpotFieldObservationInput, SpotFieldObservation } from "@/domain/spotFieldObservation";
import { USER_SPOT_ID_PREFIX, type UserFishingSpotDetailItemKey, type UserFishingSpotFieldReport } from "@/domain/userFishingSpot";
import { deleteMyUserFishingSpotDetail, fetchMyUserFishingSpotDetails, fetchMyUserFishingSpotFieldReports, isMissingSupabaseObject, saveMyUserFishingSpotDetail, saveMyUserFishingSpotFieldReport } from "@/lib/userFishingSpotRepository";
import type { SpotFieldObservationState } from "./useSpotFieldObservations";

function persistedSpotId(runtimeId: string): string {
  return runtimeId.startsWith(USER_SPOT_ID_PREFIX) ? runtimeId.slice(USER_SPOT_ID_PREFIX.length) : "";
}

export type UserFishingSpotDetailState = SpotFieldObservationState & {
  reports: UserFishingSpotFieldReport[];
  reportStatus: "loading" | "ready" | "unavailable" | "failed";
  saveReport: (observedOn: string, summaryNote: string | null, values: SaveSpotFieldObservationInput[]) => Promise<boolean>;
};

export function useUserFishingSpotDetails(runtimeSpotId: string, enabled: boolean): UserFishingSpotDetailState {
  const [observations, setObservations] = useState<SpotFieldObservation[]>([]);
  const [reports, setReports] = useState<UserFishingSpotFieldReport[]>([]);
  const [reportStatus, setReportStatus] = useState<UserFishingSpotDetailState["reportStatus"]>("loading");
  const [status, setStatus] = useState<SpotFieldObservationState["status"]>("loading");
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentId = useRef(runtimeSpotId);
  currentId.current = runtimeSpotId;

  const load = useCallback(async (targetRuntimeId: string) => {
    if (!enabled) { setObservations([]); setReports([]); setStatus("ready"); setReportStatus("ready"); return; }
    const spotId = persistedSpotId(targetRuntimeId);
    if (!spotId) { setObservations([]); setStatus("failed"); return; }
    setStatus("loading");
    setReportStatus("loading");
    try {
      const values = await fetchMyUserFishingSpotDetails(spotId);
      if (currentId.current !== targetRuntimeId) return;
      setObservations(values.map((value) => ({ ...value, spotId: targetRuntimeId, informationState: "weak_evidence" })));
      setStatus("ready"); setError(null);
    } catch {
      if (currentId.current !== targetRuntimeId) return;
      setObservations([]); setReports([]); setStatus("failed"); setError("地点情報を取得できませんでした。");
      return;
    }
    try {
      const history = await fetchMyUserFishingSpotFieldReports(spotId);
      if (currentId.current !== targetRuntimeId) return;
      setReports(history); setReportStatus("ready");
    } catch (historyError) {
      if (currentId.current !== targetRuntimeId) return;
      setReports([]);
      setReportStatus(isMissingSupabaseObject(historyError as { code?: string; message?: string; details?: string; hint?: string }, ["user_fishing_spot_field_reports", "user_fishing_spot_field_report_values"]) ? "unavailable" : "failed");
    }
  }, [enabled]);

  useEffect(() => { setError(null); void load(runtimeSpotId); }, [load, runtimeSpotId]);

  const saveObservation = useCallback(async (input: SaveSpotFieldObservationInput) => {
    const targetRuntimeId = currentId.current;
    const spotId = persistedSpotId(targetRuntimeId);
    if (status !== "ready" || input.spotId !== targetRuntimeId || !spotId || input.informationState !== "weak_evidence") return false;
    setIsMutating(true); setError(null);
    try { await saveMyUserFishingSpotDetail(spotId, input); await load(targetRuntimeId); return currentId.current === targetRuntimeId; }
    catch { if (currentId.current === targetRuntimeId) setError("地点情報を保存できませんでした。"); return false; }
    finally { setIsMutating(false); }
  }, [load, status]);

  const deleteObservation = useCallback(async (observationId: string) => {
    const targetRuntimeId = currentId.current;
    const spotId = persistedSpotId(targetRuntimeId);
    const observation = observations.find((value) => value.id === observationId);
    if (status !== "ready" || !spotId || !observation) return false;
    setIsMutating(true); setError(null);
    try { await deleteMyUserFishingSpotDetail(spotId, observation.itemKey as UserFishingSpotDetailItemKey); await load(targetRuntimeId); return currentId.current === targetRuntimeId; }
    catch { if (currentId.current === targetRuntimeId) setError("地点情報を削除できませんでした。"); return false; }
    finally { setIsMutating(false); }
  }, [load, observations, status]);

  const saveReport = useCallback(async (observedOn: string, summaryNote: string | null, values: SaveSpotFieldObservationInput[]) => {
    const targetRuntimeId = currentId.current;
    const spotId = persistedSpotId(targetRuntimeId);
    if (status !== "ready" || reportStatus !== "ready" || !spotId || !values.length) return false;
    setIsMutating(true); setError(null);
    try { await saveMyUserFishingSpotFieldReport(spotId, observedOn, summaryNote, values); await load(targetRuntimeId); return currentId.current === targetRuntimeId; }
    catch { if (currentId.current === targetRuntimeId) setError("現地調査を保存できませんでした。"); return false; }
    finally { setIsMutating(false); }
  }, [load, reportStatus, status]);

  return useMemo(() => ({ observations, reports, reportStatus, status, isMutating, error, saveObservation, saveReport, deleteObservation }), [deleteObservation, error, isMutating, observations, reportStatus, reports, saveObservation, saveReport, status]);
}
