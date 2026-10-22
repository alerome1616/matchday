"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Fixture,
  FixturesSource,
  GalleryImage,
  RuntimeConfig,
  Settings,
  ReferenceImage,
  ApiKeyStatus,
  StudioUser,
} from "@/lib/types";
import { defaultSettings, upgradeCreativeSettings } from "@/lib/defaults";
import { createClient } from "@/lib/supabase/client";
import { madridDate } from "@/lib/date";
import { buildPrompt } from "@/lib/prompt";
import {
  MAX_REFERENCE_FILES,
  MAX_REFERENCE_BYTES,
  MAX_TOTAL_REFERENCE_BYTES,
} from "@/lib/creative";
import {
  listLocalImages,
  saveLocalImage,
  deleteLocalImage,
} from "@/lib/local-gallery";
import { settingsSchema } from "@/lib/validation";
import {
  toggleMatch,
  selectVisible,
  selectionKey,
  type SelectedMatch,
} from "@/lib/selection";
export type View = "matches" | "gallery" | "styles" | "settings";
class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: {
      ...(init?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok)
    throw new HttpError(
      data.error ?? "No se pudo completar la operación.",
      res.status,
    );
  return data;
}
export function useStudio(config: RuntimeConfig) {
  const [apiKey, setApiKey] = useState("");
  const [keyStatus, setKeyStatus] = useState<ApiKeyStatus | null>(null);
  const [keyBusy, setKeyBusy] = useState(false);
  const [references, setReferences] = useState<ReferenceImage[]>([]);
  const referencesRef = useRef(references);
  referencesRef.current = references;
  const imageUrlsRef = useRef<string[]>([]);
  useEffect(
    () => () => {
      referencesRef.current.forEach((r) => URL.revokeObjectURL(r.preview));
      imageUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );
  const [view, setView] = useState<View>("matches");
  const [date, setDate] = useState(madridDate());
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [fixturesSource, setFixturesSource] = useState<FixturesSource | null>(
    null,
  );
  const [fixturesRevision, setFixturesRevision] = useState(0);
  const [selectedMatches, setSelectedMatches] = useState<SelectedMatch[]>([]);
  const selected = selectedMatches.map((match) => match.key);
  const stopRequested = useRef(false);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [user, setUser] = useState<StudioUser | null>(null);
  const authVersion = useRef(0);
  const [authReady, setAuthReady] = useState(config.demo);
  const [authOpen, setAuthOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [ready, setReady] = useState(false);
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = user?.id ?? null;
  const busy = useRef(false);
  const settingsDirty = useRef(false);
  const updateAccount = useCallback((account: StudioUser | null) => {
    if (userIdRef.current !== (account?.id ?? null)) {
      setApiKey("");
      setKeyStatus(null);
      setImages([]);
      setSelectedMatches([]);
      setSettings(defaultSettings);
      referencesRef.current.forEach((r) => URL.revokeObjectURL(r.preview));
      setReferences([]);
    }
    userIdRef.current = account?.id ?? null;
    setUser(account);
    setAuthReady(true);
  }, []);
  useEffect(() => {
    if (config.demo) {
      try {
        const g = JSON.parse(
          localStorage.getItem("matchday:gallery:v1") ?? "[]",
        );
        if (Array.isArray(g))
          setImages(
            g.filter(
              (x) =>
                x &&
                typeof x.id === "string" &&
                typeof x.url === "string" &&
                x.url.startsWith("data:image/svg+xml;") &&
                x.fixture?.home &&
                x.fixture?.away &&
                settingsSchema.safeParse(x.settings).success,
            ),
          );
        const s = settingsSchema.safeParse(
          JSON.parse(localStorage.getItem("matchday:settings:v1") ?? "null"),
        );
        if (s.success) setSettings(upgradeCreativeSettings(s.data));
      } catch {
        setError("No se pudieron recuperar los datos locales.");
      }
      let active = true;
      listLocalImages()
        .then((local) => {
          if (!active) {
            local.forEach((i) => URL.revokeObjectURL(i.url));
            return;
          }
          imageUrlsRef.current.push(...local.map((i) => i.url));
          setImages((current) => [
            ...local,
            ...current.filter((i) => !local.some((l) => l.id === i.id)),
          ]);
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setReady(true);
        });
      return () => {
        active = false;
      };
    }
    if (!config.configured) {
      setAuthReady(true);
      return;
    }
    if (config.authProvider === "postgres") {
      let active = true;
      const refresh = async () => {
        const version = authVersion.current;
        try {
          const result = await api<{ user: StudioUser | null }>(
            "/api/auth/session",
          );
          if (active && version === authVersion.current)
            updateAccount(result.user);
        } catch {
          if (active) {
            setAuthReady(true);
            setError("No se pudo comprobar tu sesión.");
          }
        }
      };
      const changed = (event: StorageEvent) => {
        if (event.key === "matchday:auth:event") void refresh();
      };
      void refresh();
      window.addEventListener("focus", refresh);
      window.addEventListener("storage", changed);
      return () => {
        active = false;
        window.removeEventListener("focus", refresh);
        window.removeEventListener("storage", changed);
      };
    }
    const db = createClient();
    db.auth
      .getUser()
      .then(({ data }) => {
        setUser(data.user);
        setAuthReady(true);
      })
      .catch(() => {
        setAuthReady(true);
        setError("No se pudo comprobar tu sesión.");
      });
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((_event, session) => {
      if (userIdRef.current !== (session?.user?.id ?? null)) {
        setApiKey("");
        setKeyStatus(null);
        referencesRef.current.forEach((r) => URL.revokeObjectURL(r.preview));
        setReferences([]);
        setImages([]);
        setSettings(defaultSettings);
        setSelectedMatches([]);
      }
      setUser(session?.user ?? null);
      setAuthReady(true);
    });
    return () => subscription.unsubscribe();
  }, [config.demo, config.configured, config.authProvider, updateAccount]);
  useEffect(() => {
    setKeyStatus(null);
    if (!user || config.demo) return;
    let active = true;
    api<ApiKeyStatus>("/api/account/openai-key")
      .then((status) => {
        if (active) setKeyStatus(status);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [user?.id, config.demo]);
  async function saveApiKey() {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    const owner = user.id;
    setKeyBusy(true);
    setError("");
    try {
      const status = await api<ApiKeyStatus>("/api/account/openai-key", {
        method: "PUT",
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      if (userIdRef.current !== owner) return;
      setKeyStatus(status);
      setApiKey("");
      setMessage("Tu clave se ha guardado cifrada en tu cuenta.");
    } catch (e) {
      if (userIdRef.current === owner) setError((e as Error).message);
    } finally {
      setKeyBusy(false);
    }
  }
  async function deleteApiKey() {
    if (!user) return;
    const owner = user.id;
    setKeyBusy(true);
    setError("");
    try {
      const status = await api<ApiKeyStatus>("/api/account/openai-key", {
        method: "DELETE",
      });
      if (userIdRef.current !== owner) return;
      setKeyStatus(status);
      setApiKey("");
      setMessage("Tu clave guardada se ha eliminado.");
    } catch (e) {
      if (userIdRef.current === owner) setError((e as Error).message);
    } finally {
      setKeyBusy(false);
    }
  }
  useEffect(() => {
    if (!config.demo || !ready) return;
    try {
      localStorage.setItem(
        "matchday:gallery:v1",
        JSON.stringify(
          images.filter(
            (i) => i.demo && i.url.startsWith("data:image/svg+xml;"),
          ),
        ),
      );
    } catch {
      setError(
        "El navegador no tiene espacio. Descarga tus diseños antes de cerrar.",
      );
    }
  }, [images, ready, config.demo]);
  useEffect(() => {
    if (!config.demo && !user) {
      setFixtures([]);
      setSelectedMatches([]);
      return;
    }
    let active = true;
    setLoading(true);
    setFixtures([]);
    setFixturesSource(null);
    setError("");
    api<{ fixtures: Fixture[]; source: FixturesSource }>(
      "/api/fixtures?date=" + date,
    )
      .then((d) => {
        if (active) {
          setFixtures(d.fixtures);
          setFixturesSource(d.source);
        }
      })
      .catch((e) => {
        if (active) {
          setFixtures([]);
          setError(e.message);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [date, user, config.demo, fixturesRevision]);
  const loadGallery = useCallback(
    async (nextPage = 0) => {
      if (config.demo || !user) return;
      setGalleryLoading(true);
      const owner = user.id;
      try {
        const d = await api<{ images: GalleryImage[]; hasMore: boolean }>(
          "/api/gallery?page=" + nextPage,
        );
        if (userIdRef.current !== owner) return;
        setImages((current) =>
          nextPage
            ? [
                ...current,
                ...d.images.filter((x) => !current.some((y) => y.id === x.id)),
              ]
            : d.images,
        );
        setPage(nextPage);
        setHasMore(d.hasMore);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setGalleryLoading(false);
      }
    },
    [config.demo, user],
  );
  useEffect(() => {
    if (!user) {
      if (!config.demo) setImages([]);
      return;
    }
    void loadGallery();
    let active = true;
    settingsDirty.current = false;
    api<{ settings: Settings }>("/api/settings")
      .then((d) => {
        const parsed = settingsSchema.safeParse(d.settings);
        if (active && !settingsDirty.current && parsed.success) {
          setSettings(upgradeCreativeSettings(parsed.data));
          setSaved(true);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [user, config.demo, loadGallery]);
  useEffect(() => {
    if (view === "gallery" && !config.demo && user) void loadGallery();
  }, [view, user, config.demo, loadGallery]);
  function updateSettings(value: Partial<Settings>) {
    settingsDirty.current = true;
    setSettings((s) => ({ ...s, ...value }));
    setSaved(false);
  }
  async function saveSettings() {
    const parsed = settingsSchema.safeParse(settings);
    if (!parsed.success) {
      setError("El prompt debe contener entre 20 y 4.000 caracteres.");
      return;
    }
    try {
      if (config.demo)
        localStorage.setItem("matchday:settings:v1", JSON.stringify(settings));
      else
        await api("/api/settings", {
          method: "PUT",
          body: JSON.stringify(settings),
        });
      setSaved(true);
      setMessage("Tu estilo se ha guardado.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function toggle(id: number) {
    const fixture = fixtures.find((f) => f.id === id);
    if (fixture)
      setSelectedMatches((current) => toggleMatch(current, fixture, date));
  }
  function addReferences(files: File[]) {
    if (references.length + files.length > MAX_REFERENCE_FILES) {
      setError("Puedes adjuntar hasta 4 imágenes.");
      return;
    }
    if (
      files.some(
        (f) =>
          !["image/png", "image/jpeg", "image/webp"].includes(f.type) ||
          !f.size ||
          f.size > MAX_REFERENCE_BYTES,
      )
    ) {
      setError("Usa PNG, JPG o WebP de hasta 4 MB por imagen.");
      return;
    }
    if (
      [...references.map((r) => r.file), ...files].reduce(
        (sum, f) => sum + f.size,
        0,
      ) > MAX_TOTAL_REFERENCE_BYTES
    ) {
      setError("El total de referencias no puede superar 4 MB.");
      return;
    }
    setReferences((current) => [
      ...current,
      ...files.map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        role: "style" as const,
        notes: "",
      })),
    ]);
  }
  function updateReference(
    id: string,
    value: Partial<Pick<ReferenceImage, "role" | "notes">>,
  ) {
    setReferences((current) =>
      current.map((r) => (r.id === id ? { ...r, ...value } : r)),
    );
  }
  function removeReference(id: string) {
    const ref = references.find((r) => r.id === id);
    if (ref) URL.revokeObjectURL(ref.preview);
    setReferences((current) => current.filter((r) => r.id !== id));
  }
  async function generate() {
    if (busy.current || !selected.length) return;
    if (!apiKey.trim() && !keyStatus?.saved && !config.generationConfigured) {
      setError(
        "Conecta OpenAI con tu clave temporal para generar una imagen real.",
      );
      return;
    }
    if (!config.demo && !user) {
      setAuthOpen(true);
      return;
    }
    if (!settingsSchema.safeParse(settings).success) {
      setError("Revisa el prompt: debe tener entre 20 y 4.000 caracteres.");
      return;
    }
    busy.current = true;
    setGenerating(true);
    setError("");
    const batch = structuredClone(selectedMatches);
    stopRequested.current = false;
    const snapshot = structuredClone(settings);
    const referenceSnapshot = [...references];
    const instructions = referenceSnapshot.map(({ role, notes }) => ({
      role,
      notes,
    }));
    let temporaryKey = apiKey.trim();
    const owner = userIdRef.current;
    setProgress({ done: 0, total: batch.length });
    let success = 0;
    const failures: string[] = [];
    try {
      for (let i = 0; i < batch.length; i++) {
        if (owner !== userIdRef.current) return;
        if (stopRequested.current) break;
        const { fixture: f, date: fixtureDate, key: selectedKey } = batch[i];
        try {
          const payload = {
            fixtureIds: [f.id],
            date: fixtureDate,
            settings: snapshot,
            requestId: crypto.randomUUID(),
            references: instructions,
          };
          const form = new FormData();
          form.set("payload", JSON.stringify(payload));
          referenceSnapshot.forEach((r) =>
            form.append("references", r.file, r.file.name),
          );
          if (temporaryKey) form.set("apiKey", temporaryKey);
          if (temporaryKey && config.demo) {
            const response = await fetch("/api/generate-session", {
              method: "POST",
              body: form,
            });
            if (!response.ok) {
              const error = (await response.json()) as { error?: string };
              throw new HttpError(
                error.error ?? "No se pudo generar la imagen.",
                response.status,
              );
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            imageUrlsRef.current.push(url);
            const image: GalleryImage = {
              id: payload.requestId,
              fixture: f,
              settings: snapshot,
              prompt: buildPrompt(f, snapshot, instructions),
              created_at: new Date().toISOString(),
              url,
              demo: false,
            };
            setImages((g) => [image, ...g]);
            if (config.demo) {
              try {
                await saveLocalImage(image, blob);
              } catch (e) {
                setError((e as Error).message);
              }
            } else {
              setMessage(
                "Imagen generada en esta sesión. Usa la descarga para conservarla o la conexión del servidor para guardarla en Supabase.",
              );
            }
          } else {
            await api("/api/generate", {
              method: "POST",
              body: form,
              headers: {},
            });
            if (owner !== userIdRef.current) return;
            if (temporaryKey && config.authProvider === "postgres") {
              setKeyStatus({
                available: true,
                saved: true,
                suffix: temporaryKey.slice(-4),
              });
              setApiKey("");
              temporaryKey = "";
            }
          }

          success++;
          setSelectedMatches((matches) =>
            matches.filter((match) => match.key !== selectedKey),
          );
        } catch (e) {
          failures.push(
            fixtureDate +
              " · " +
              f.home.short +
              "–" +
              f.away.short +
              ": " +
              (e as Error).message,
          );
          if (e instanceof HttpError && [401, 403, 429, 503].includes(e.status))
            break;
        }
        setProgress({ done: i + 1, total: batch.length });
      }
      if (owner !== userIdRef.current) return;
      if (!config.demo) await loadGallery();
      if (success) {
        setMessage(
          success + " diseño" + (success === 1 ? " guardado." : "s guardados."),
        );
        setView("gallery");
      }
      if (failures.length) setError(failures.join(" · "));
    } finally {
      busy.current = false;
      setGenerating(false);
    }
  }
  async function removeImage(id: string) {
    try {
      if (!config.demo) await api("/api/gallery/" + id, { method: "DELETE" });
      else await deleteLocalImage(id);
      setImages((g) => g.filter((i) => i.id !== id));
      setMessage("Diseño eliminado.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function download(image: GalleryImage) {
    try {
      const res = await fetch(image.url);
      if (!res.ok)
        throw new Error(
          "La descarga no está disponible. Actualiza la galería.",
        );
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        "matchday-" +
        image.fixture.home.short +
        "-" +
        image.fixture.away.short +
        (image.demo ? ".svg" : ".png");
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function logout() {
    if (generating) return;
    try {
      authVersion.current++;
      if (config.authProvider === "postgres")
        await api("/api/auth/logout", { method: "POST" });
      else await createClient().auth.signOut();
      authVersion.current++;
      updateAccount(null);
      try {
        localStorage.setItem("matchday:auth:event", crypto.randomUUID());
      } catch {
        /* Session is already revoked on the server. */
      }
      setApiKey("");
      setKeyStatus(null);
      setUser(null);
      setSelectedMatches([]);
      setImages([]);
      setSettings(defaultSettings);
      setView("matches");
      setMessage("Sesión cerrada.");
    } catch {
      setError("No se pudo cerrar la sesión.");
    }
  }
  return {
    config,
    apiKey,
    setApiKey,
    keyStatus,
    keyBusy,
    saveApiKey,
    deleteApiKey,
    references,
    addReferences,
    updateReference,
    removeReference,
    canGenerate:
      !keyBusy &&
      (apiKey.trim().length >= 20 ||
        Boolean(user && keyStatus?.saved) ||
        config.generationConfigured),
    view,
    setView,
    date,
    setDate,
    fixtures,
    fixturesSource,
    refreshFixtures: () => setFixturesRevision((r) => r + 1),
    selected,
    selectedMatches,
    isSelected: (id: number) => selected.includes(selectionKey(date, id)),
    toggleVisible: (visible: Fixture[]) =>
      setSelectedMatches((current) => selectVisible(current, visible, date)),
    removeSelected: (key: string) =>
      setSelectedMatches((current) =>
        current.filter((match) => match.key !== key),
      ),
    clearSelection: () => setSelectedMatches([]),
    stopGeneration: () => {
      stopRequested.current = true;
      setMessage("Se detendrá al terminar la imagen en curso.");
    },
    toggle,
    settings,
    updateSettings,
    saveSettings,
    saved,
    images,
    user,
    onAuthenticated: (account: StudioUser) => {
      authVersion.current++;
      updateAccount(account);
      try {
        localStorage.setItem("matchday:auth:event", crypto.randomUUID());
      } catch {
        /* No credentials stored in the browser. */
      }
    },
    authReady,
    authOpen,
    setAuthOpen,
    loading,
    galleryLoading,
    generating,
    progress,
    generate,
    message,
    setMessage,
    error,
    setError,
    removeImage,
    download,
    logout,
    hasMore,
    loadMore: () => loadGallery(page + 1),
    refresh: () => loadGallery(),
  };
}
export type StudioState = ReturnType<typeof useStudio>;
