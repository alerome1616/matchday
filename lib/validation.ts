import { z } from "zod";
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Fecha no válida.",
  );
export const referenceInstructionSchema = z.object({
  role: z.enum(["style", "home-kit", "away-kit", "composition"]),
  notes: z.string().trim().max(500).default(""),
});
export const settingsSchema = z.object({
  prompt: z.string().trim().min(20).max(4000),
  style: z.enum(["cinematic", "minimal", "matchday", "retro", "epic"]),
  format: z.enum(["story", "square", "landscape"]),
  quality: z.enum(["low", "medium", "high"]),
  scene: z.enum(["stadium", "interior", "editorial", "custom"]).optional(),
  headline: z.string().max(160).optional(),
});
export const generationSchema = z.object({
  fixtureIds: z
    .array(z.number().int().positive())
    .min(1)
    .max(1)
    .refine((a) => new Set(a).size === a.length, "No repitas partidos."),
  date: dateSchema,
  settings: settingsSchema,
  requestId: z.string().uuid(),
  references: z.array(referenceInstructionSchema).max(4).default([]),
});
