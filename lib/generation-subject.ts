import "server-only";
import type { GenerationInput } from "./generation-design";
import type { DesignSubject, Fixture } from "./types";
import { AppError } from "./errors";
// Free designs never consult the football provider, including during outages.
export async function resolveGenerationSubject(
  input: GenerationInput,
  load: (date: string) => Promise<Fixture[]>,
): Promise<DesignSubject> {
  if (input.mode === "free") return { kind: "free" };
  const fixtures = await load(input.date);
  const fixture = fixtures.find((f) => f.id === input.fixtureIds[0]);
  if (!fixture)
    throw new AppError(
      "El partido no está disponible en la fecha seleccionada.",
      404,
    );
  return fixture;
}
