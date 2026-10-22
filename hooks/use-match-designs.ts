"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReferenceImage, Settings } from "@/lib/types";
import {
  type MatchDraft,
  resolveMatchDesign,
  referenceFilesError,
} from "@/lib/match-designs";

export function useMatchDesigns(
  settings: Settings,
  references: ReferenceImage[],
  reportError: (message: string) => void,
) {
  const [matchDrafts, setMatchDrafts] = useState<Record<string, MatchDraft>>(
    {},
  );
  const draftsRef = useRef(matchDrafts);
  const [editingMatchKey, setEditingMatchKey] = useState<string | null>(null);
  useEffect(
    () => () => {
      Object.values(draftsRef.current).forEach((draft) =>
        draft.references?.forEach((r) => URL.revokeObjectURL(r.preview)),
      );
    },
    [],
  );

  function updateMatchDraft(key: string, patch: Partial<MatchDraft>) {
    const next = {
      ...draftsRef.current,
      [key]: { ...draftsRef.current[key], ...patch },
    };
    draftsRef.current = next;
    setMatchDrafts(next);
  }
  const clearMatchDrafts = useCallback((keys?: string[]) => {
    const next = { ...draftsRef.current };
    for (const key of keys ?? Object.keys(next)) {
      next[key]?.references?.forEach((r) => URL.revokeObjectURL(r.preview));
      delete next[key];
    }
    draftsRef.current = next;
    setMatchDrafts(next);
    setEditingMatchKey((current) =>
      current && (!keys || keys.includes(current)) ? null : current,
    );
  }, []);

  function getMatchDesign(key: string) {
    return resolveMatchDesign(settings, references, matchDrafts[key]);
  }
  function addMatchReferences(key: string, files: File[]) {
    const draft = draftsRef.current[key];
    const effective = resolveMatchDesign(settings, references, draft);
    const error = referenceFilesError([
      ...effective.references.map((r) => r.file),
      ...files,
    ]);
    if (error) {
      reportError(error);
      return;
    }
    reportError("");
    updateMatchDraft(key, {
      references: [
        ...(draft?.references ?? []),
        ...files.map((file) => ({
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
          role: "style" as const,
          notes: "",
        })),
      ],
    });
  }
  function updateMatchReference(
    key: string,
    id: string,
    value: Partial<Pick<ReferenceImage, "role" | "notes">>,
  ) {
    updateMatchDraft(key, {
      references: (draftsRef.current[key]?.references ?? []).map((r) =>
        r.id === id ? { ...r, ...value } : r,
      ),
    });
  }
  function removeMatchReference(key: string, id: string) {
    const current = draftsRef.current[key]?.references ?? [];
    const removed = current.find((r) => r.id === id);
    if (removed) URL.revokeObjectURL(removed.preview);
    updateMatchDraft(key, { references: current.filter((r) => r.id !== id) });
  }
  return {
    matchDrafts,
    editingMatchKey,
    setEditingMatchKey,
    getMatchDesign,
    updateMatchDraft,
    clearMatchDrafts,
    addMatchReferences,
    updateMatchReference,
    removeMatchReference,
  };
}
