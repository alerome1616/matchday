import type { z } from "zod";
import type { generationSchema } from "./validation";
import type { ReferenceImage, Settings } from "./types";
export type GenerationInput = z.infer<typeof generationSchema>;
export function freeGenerationForm(
  settings: Settings,
  references: ReferenceImage[],
  requestId: string,
  apiKey: string,
) {
  const form = new FormData();
  form.set(
    "payload",
    JSON.stringify({
      mode: "free",
      fixtureIds: [],
      settings,
      requestId,
      references: references.map(({ role, notes }) => ({ role, notes })),
    }),
  );
  references.forEach((r) => form.append("references", r.file, r.file.name));
  if (apiKey) form.set("apiKey", apiKey);
  return form;
}
