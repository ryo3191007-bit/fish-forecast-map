"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SaveSpotFieldObservationInput, SpotFieldObservation } from "@/domain/spotFieldObservation";
import { deleteMySpotFieldObservation, fetchMySpotFieldObservations, saveMySpotFieldObservation } from "@/lib/spotFieldObservationRepository";
import { getSupabaseClient } from "@/lib/supabaseClient";

export type SpotFieldObservationStatus = "loading" | "ready" | "signed-out" | "unavailable" | "failed";

export type SpotFieldObservationState = {
  observations: SpotFieldObservation[];
  status: SpotFieldObservationStatus;
  isMutating: boolean;
  error: string | null;
  saveObservation: (input: SaveSpotFieldObservationInput) => Promise<boolean>;
  deleteObservation: (observationId: string) => Promise<boolean>;
};

export function useSpotFieldObservations(spotId: string): SpotFieldObservationState {
  const [observations, setObservations] = useState<SpotFieldObservation[]>([]);
  const [status, setStatus] = useState<SpotFieldObservationStatus>("loading");
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentSpotIdRef = useRef(spotId);
  currentSpotIdRef.current = spotId;

  const load = useCallback(async (targetSpotId: string) => {
    if (!targetSpotId) {
      setObservations([]);
      setStatus("ready");
      return;
    }
    const clientStatus = getSupabaseClient();
    if (!clientStatus.isConfigured) {
      setObservations([]);
      setStatus("unavailable");
      return;
    }
    setStatus("loading");
    const { data: userData, error: userError } = await clientStatus.client.auth.getUser();
    if (currentSpotIdRef.current !== targetSpotId) return;
    if (userError || !userData.user) {
      setObservations([]);
      setStatus("signed-out");
      setError(null);
      return;
    }
    try {
      const next = await fetchMySpotFieldObservations(targetSpotId);
      if (currentSpotIdRef.current !== targetSpotId) return;
      const latestByItem = new Map<string, SpotFieldObservation>();
      for (const observation of next) {
        if (!latestByItem.has(observation.itemKey)) latestByItem.set(observation.itemKey, observation);
      }
      setObservations([...latestByItem.values()]);
      setStatus("ready");
      setError(null);
    } catch {
      if (currentSpotIdRef.current !== targetSpotId) return;
      setObservations([]);
      setStatus("failed");
      setError("実地調査情報を取得できませんでした。");
    }
  }, []);

  useEffect(() => {
    let active = true;
    currentSpotIdRef.current = spotId;
    setObservations([]);
    setError(null);
    void load(spotId);

    const clientStatus = getSupabaseClient();
    if (!clientStatus.isConfigured) return () => { active = false; };
    const { data } = clientStatus.client.auth.onAuthStateChange(() => {
      if (!active) return;
      void load(currentSpotIdRef.current);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [load, spotId]);

  const saveObservation = useCallback(async (input: SaveSpotFieldObservationInput) => {
    if (status !== "ready" || input.spotId !== currentSpotIdRef.current) return false;
    setIsMutating(true);
    setError(null);
    try {
      await saveMySpotFieldObservation(input);
      await load(input.spotId);
      return currentSpotIdRef.current === input.spotId;
    } catch {
      if (currentSpotIdRef.current === input.spotId) setError("実地調査情報を保存できませんでした。");
      return false;
    } finally {
      setIsMutating(false);
    }
  }, [load, status]);

  const deleteObservation = useCallback(async (observationId: string) => {
    if (status !== "ready") return false;
    const targetSpotId = currentSpotIdRef.current;
    setIsMutating(true);
    setError(null);
    try {
      await deleteMySpotFieldObservation(observationId);
      await load(targetSpotId);
      return currentSpotIdRef.current === targetSpotId;
    } catch {
      if (currentSpotIdRef.current === targetSpotId) setError("実地調査情報を削除できませんでした。");
      return false;
    } finally {
      setIsMutating(false);
    }
  }, [load, status]);

  return useMemo(() => ({ observations, status, isMutating, error, saveObservation, deleteObservation }), [deleteObservation, error, isMutating, observations, saveObservation, status]);
}
