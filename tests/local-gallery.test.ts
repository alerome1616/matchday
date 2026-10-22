import "fake-indexeddb/auto";
import test from "node:test";
import assert from "node:assert/strict";
import {
  listLocalImages,
  saveLocalImage,
  deleteLocalImage,
} from "../lib/local-gallery";
import { defaultSettings } from "../lib/defaults";
import { mockFixtures } from "../lib/mock";
import type { GalleryImage } from "../lib/types";
test("generated PNG is persisted independently of temporary API key and restored with exact bytes", async () => {
  const blob = new Blob([new Uint8Array([137, 80, 78, 71, 1, 2, 3])], {
    type: "image/png",
  });
  const image: GalleryImage = {
    id: crypto.randomUUID(),
    fixture: mockFixtures("2026-10-21")[0],
    settings: defaultSettings,
    prompt: "A photographic scene",
    created_at: new Date().toISOString(),
    url: "blob:temporary-preview",
    demo: false,
  };
  await saveLocalImage(image, blob);
  const restored = await listLocalImages();
  assert.equal(restored.length, 1);
  assert.equal(restored[0].demo, false);
  assert.equal(restored[0].prompt, image.prompt);
  assert.ok(restored[0].url.startsWith("blob:"));
  const bytes = await fetch(restored[0].url).then((r) => r.arrayBuffer());
  assert.deepEqual(
    new Uint8Array(bytes),
    new Uint8Array(await blob.arrayBuffer()),
  );
  assert.equal("apiKey" in restored[0], false);
  URL.revokeObjectURL(restored[0].url);
  await deleteLocalImage(image.id);
  assert.deepEqual(await listLocalImages(), []);
});
