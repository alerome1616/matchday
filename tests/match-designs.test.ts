import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveMatchDesign,
  referenceFilesError,
  matchGenerationForm,
} from "../lib/match-designs";
import { defaultSettings } from "../lib/defaults";
import { mockFixtures } from "../lib/mock";
import { toggleMatch } from "../lib/selection";
import type { ReferenceImage } from "../lib/types";

function reference(name: string, content: string): ReferenceImage {
  return {
    id: name,
    file: new File([content], name, { type: "image/png" }),
    preview: "blob:" + name,
    role: "style",
    notes: name,
  };
}

test("match overrides inherit current defaults and allow an explicitly empty title", () => {
  const defaults = { ...defaultSettings, headline: "Título general" };
  const original = structuredClone(defaults);
  const own = resolveMatchDesign(defaults, [], {
    prompt: "Un duelo en una biblioteca con luz cálida",
    headline: "",
  });
  assert.equal(own.settings.headline, "");
  assert.notEqual(own.settings.prompt, defaults.prompt);
  assert.equal(own.settings.format, defaults.format);
  assert.deepEqual(defaults, original);
  const inherited = resolveMatchDesign(
    { ...defaults, prompt: "Nueva dirección creativa compartida" },
    [],
    { headline: "Mi título" },
  );
  assert.equal(
    inherited.settings.prompt,
    "Nueva dirección creativa compartida",
  );
  assert.equal(inherited.settings.headline, "Mi título");
});

test("multipart requests isolate matches, dates, prompts, titles and actual file bytes", async () => {
  const fixture = mockFixtures("2026-10-22")[0];
  const selected = toggleMatch(
    toggleMatch([], fixture, "2026-10-22"),
    fixture,
    "2026-10-23",
  );
  const general = reference("general.png", "shared content");
  const first = reference("first.png", "first match only");
  const second = reference("second.png", "second match only");
  const designs = [
    resolveMatchDesign(defaultSettings, [general], {
      prompt: "Primer partido en un estadio lleno",
      headline: "Primera noche",
      references: [first],
    }),
    resolveMatchDesign(defaultSettings, [general], {
      prompt: "Segundo partido en un interior cálido",
      headline: "Segunda noche",
      references: [second],
      includeGeneralReferences: false,
    }),
  ];
  const firstForm = matchGenerationForm(
    selected[0],
    designs[0],
    "11111111-1111-4111-8111-111111111111",
    "temporary-test-key",
  );
  const secondForm = matchGenerationForm(
    selected[1],
    designs[1],
    "22222222-2222-4222-8222-222222222222",
    "",
  );
  assert.deepEqual(
    await Promise.all(
      (firstForm.getAll("references") as File[]).map((f) => f.text()),
    ),
    ["shared content", "first match only"],
  );
  assert.deepEqual(
    await Promise.all(
      (secondForm.getAll("references") as File[]).map((f) => f.text()),
    ),
    ["second match only"],
  );
  const payloads = [firstForm, secondForm].map((form) =>
    JSON.parse(form.get("payload") as string),
  );
  assert.equal(payloads[0].date, "2026-10-22");
  assert.equal(payloads[1].date, "2026-10-23");
  assert.equal(payloads[0].settings.headline, "Primera noche");
  assert.equal(payloads[1].settings.headline, "Segunda noche");
  assert.equal(payloads[1].settings.prompt, designs[1].settings.prompt);
  assert.deepEqual(
    payloads[0].references.map((r: { notes: string }) => r.notes),
    ["general.png", "first.png"],
  );
  assert.equal(firstForm.get("apiKey"), "temporary-test-key");
  assert.equal(secondForm.has("apiKey"), false);
});

test("combined general and per-match references obey count, size and media limits", () => {
  const file = reference("valid.png", "pixels").file;
  assert.equal(referenceFilesError([file]), null);
  assert.match(referenceFilesError(Array(5).fill(file))!, /4 imágenes/);
  assert.match(
    referenceFilesError([
      new File(["no"], "x.svg", { type: "image/svg+xml" }),
    ])!,
    /PNG/,
  );
  const large = new File([new Uint8Array(3 * 1024 * 1024)], "large.png", {
    type: "image/png",
  });
  assert.match(referenceFilesError([large, large])!, /total/);
});
