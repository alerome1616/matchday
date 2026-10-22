import type { ReferenceImage, Settings } from "./types";
import type { SelectedMatch } from "./selection";
import {
  MAX_REFERENCE_FILES,
  MAX_REFERENCE_BYTES,
  MAX_TOTAL_REFERENCE_BYTES,
} from "./creative";

export type MatchDraft = {
  prompt?: string;
  headline?: string;
  includeGeneralReferences?: boolean;
  references?: ReferenceImage[];
};

export function resolveMatchDesign(
  settings: Settings,
  references: ReferenceImage[],
  draft?: MatchDraft,
) {
  return {
    settings: {
      ...settings,
      prompt: draft?.prompt ?? settings.prompt,
      headline: draft?.headline ?? settings.headline,
    },
    references: [
      ...(draft?.includeGeneralReferences === false ? [] : references),
      ...(draft?.references ?? []),
    ],
  };
}

export function referenceFilesError(files: File[]): string | null {
  if (files.length > MAX_REFERENCE_FILES)
    return "Puedes adjuntar hasta 4 imágenes por partido, incluidas las generales.";
  if (
    files.some(
      (f) =>
        !["image/png", "image/jpeg", "image/webp"].includes(f.type) ||
        !f.size ||
        f.size > MAX_REFERENCE_BYTES,
    )
  )
    return "Usa PNG, JPG o WebP de hasta 4 MB por imagen.";
  if (files.reduce((total, f) => total + f.size, 0) > MAX_TOTAL_REFERENCE_BYTES)
    return "El total de referencias de un partido no puede superar 4 MB.";
  return null;
}

export function matchGenerationForm(
  match: SelectedMatch,
  design: ReturnType<typeof resolveMatchDesign>,
  requestId: string,
  apiKey: string,
) {
  const form = new FormData();
  form.set(
    "payload",
    JSON.stringify({
      fixtureIds: [match.fixture.id],
      date: match.date,
      settings: design.settings,
      requestId,
      references: design.references.map(({ role, notes }) => ({ role, notes })),
    }),
  );
  design.references.forEach((r) =>
    form.append("references", r.file, r.file.name),
  );
  if (apiKey) form.set("apiKey", apiKey);
  return form;
}
