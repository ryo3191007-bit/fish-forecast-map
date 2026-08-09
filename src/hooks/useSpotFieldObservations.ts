"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SaveSpotFieldObservationInput, SpotFieldObservation, SpotFieldReport } from "@/domain/spotFieldObservation";
import { deleteMySpotFieldObservation, fetchMySpotFieldObservations, saveMySpotFieldObservation } from "@/lib/spotFieldObservationRepository";
import { fetchMySpotFieldReports, saveMySpotFieldReport } from "@/lib/spotFieldReportRepository";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { isMissingSupabaseObject } from "@/lib/supabaseObjectError";
import type { RecordVisibility } from "@/domain/recordVisibility";

export type SpotFieldObservationStatus = "loading" | "ready" | "signed-out" | "unavailable" | "failed";

export type SpotFieldObservationState = {
  observations: SpotFieldObservation[];
  status: SpotFieldObservationStatus;
  isMutating: boolean;
  error: string | null;
  saveObservation: (input: SaveSpotFieldObservationInput) => Promise<boolean>;
  deleteObservation: (observationId: string) => Promise<boolean>;
};

export type SpotFieldReportState = SpotFieldObservationState & {
  reports: SpotFieldReport[];
  reportStatus: "loading" | "ready" | "unavailable" | "failed";
  saveReport: (observedOn: string, summaryNote: string | null, values: SaveSpotFieldObservationInput[], visibility?: RecordVisibility) => Promise<string | null>;
};

export function useSpotFieldObservations(spotId: string): SpotFieldReportState {
  const enabled = !spotId.startsWith("user:");
  const [observations, setObservations] = useState<SpotFieldObservation[]>([]);
  const [reports, setReports] = useState<SpotFieldReport[]>([]);
  const [reportStatus, setReportStatus] = useState<SpotFieldReportState["reportStatus"]>("loading");
  const [status, setStatus] = useState<SpotFieldObservationStatus>("loading");
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentSpotIdRef = useRef(spotId);
  currentSpotIdRef.current = spotId;

  const load = useCallback(async (targetSpotId: string) => {
    if (!enabled) {
      setObservations([]);
      setStatus("ready");
      setReports([]); setReportStatus("unavailable");
      return;
    }
    if (!targetSpotId) {
      setObservations([]);
      setStatus("ready");
      setReports([]); setReportStatus("unavailable");
      return;
    }
    const clientStatus = getSupabaseClient();
    if (!clientStatus.isConfigured) {
      setObservations([]);
      setStatus("unavailable");
      setReports([]); setReportStatus("unavailable");
      return;
    }
    setStatus("loading");
    const { data: userData, error: userError } = await clientStatus.client.auth.getUser();
    if (currentSpotIdRef.current !== targetSpotId) return;
    if (userError || !userData.user) {
      setObservations([]);
      setStatus("signed-out");
      setReports([]); setReportStatus("unavailable");
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
    setReportStatus("loading");
    try {
      const nextReports = await fetchMySpotFieldReports("master", targetSpotId);
      if (currentSpotIdRef.current !== targetSpotId) return;
      setReports(nextReports); setReportStatus("ready");
    } catch (reportError) {
      if (currentSpotIdRef.current !== targetSpotId) return;
      setReports([]); setReportStatus(isMissingSupabaseObject(reportError, "spot_field_reports") ? "unavailable" : "failed");
    }
  }, [enabled]);

  useEffect(() => {
    let active = true;
    currentSpotIdRef.current = spotId;
    setObservations([]);
    setReports([]);
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

  const saveReport = useCallback(async (observedOn: string, summaryNote: string | null, values: SaveSpotFieldObservationInput[], visibility: RecordVisibility = "private") => {
    const targetSpotId = currentSpotIdRef.current;
    if (status !== "ready" || reportStatus !== "ready" || !values.length) return null;
    setIsMutating(true); setError(null);
    try {
      const reportId = await saveMySpotFieldReport("master", targetSpotId, observedOn, summaryNote, values, visibility);
      await load(targetSpotId);
      return currentSpotIdRef.current === targetSpotId ? reportId : null;
    } catch {
      if (currentSpotIdRef.current === targetSpotId) setError("実地調査を保存できませんでした。");
      return null;
    } finally { setIsMutating(false); }
  }, [load, reportStatus, status]);

  return useMemo(() => ({ observations, reports, reportStatus, status, isMutating, error, saveObservation, saveReport, deleteObservation }), [deleteObservation, error, isMutating, observations, reportStatus, reports, saveObservation, saveReport, status]);
}
