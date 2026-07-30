"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SaveSpotFieldObservationInput, SpotFieldObservation } from "@/domain/spotFieldObservation";
import { USER_SPOT_ID_PREFIX, type UserFishingSpotDetailItemKey } from "@/domain/userFishingSpot";
import { deleteMyUserFishingSpotDetail, fetchMyUserFishingSpotDetails, saveMyUserFishingSpotDetail } from "@/lib/userFishingSpotRepository";
import type { SpotFieldObservationState } from "./useSpotFieldObservations";

function persistedSpotId(runtimeId: string): string {
  return runtimeId.startsWith(USER_SPOT_ID_PREFIX) ? runtimeId.slice(USER_SPOT_ID_PREFIX.length) : "";
}

export function useUserFishingSpotDetails(runtimeSpotId: string, enabled: boolean): SpotFieldObservationState {
  const [observations, setObservations] = useState<SpotFieldObservation[]>([]);
  const [status, setStatus] = useState<SpotFieldObservationState["status"]>("loading");
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentId = useRef(runtimeSpotId);
  currentId.current = runtimeSpotId;

  const load = useCallback(async (targetRuntimeId: string) => {
    if (!enabled) { setObservations([]); setStatus("ready"); return; }
    const spotId = persistedSpotId(targetRuntimeId);
    if (!spotId) { setObservations([]); setStatus("failed"); return; }
    setStatus("loading");
    try {
      const values = await fetchMyUserFishingSpotDetails(spotId);
      if (currentId.current !== targetRuntimeId) return;
      setObservations(values.map((value) => ({ ...value, spotId: targetRuntimeId, informationState: "weak_evidence" })));
      setStatus("ready"); setError(null);
    } catch {
      if (currentId.current !== targetRuntimeId) return;
      setObservations([]); setStatus("failed"); setError("地点情報を取得できませんでした。");
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

  return useMemo(() => ({ observations, status, isMutating, error, saveObservation, deleteObservation }), [deleteObservation, error, isMutating, observations, saveObservation, status]);
}
