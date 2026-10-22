import test from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { Gallery } from "../components/gallery";
import { galleryRecord } from "../lib/gallery-records";
import { mockFixtures } from "../lib/mock";
import { defaultSettings } from "../lib/defaults";
import type { StudioState } from "../hooks/use-studio";

const fixture = mockFixtures("2026-10-22")[0];
const saved = {
  id: "saved-image",
  fixture,
  settings: defaultSettings,
  created_at: "2026-10-22T12:00:00Z",
  url: "/api/gallery/saved-image/file",
  prompt: "The original saved prompt",
  demo: false,
};
function render(images: unknown[]) {
  const app = {
    images,
    config: { demo: false },
    hasMore: false,
    galleryLoading: false,
  } as unknown as StudioState;
  return renderToString(<Gallery app={app} />);
}
test("nonempty gallery renders objects and historically stringified JSON without losing the file or prompt", () => {
  for (const image of [
    saved,
    {
      ...saved,
      fixture: JSON.stringify(fixture),
      settings: JSON.stringify(defaultSettings),
    },
    { ...saved, fixture: JSON.stringify(JSON.stringify(fixture)) },
  ]) {
    const html = render([image]);
    assert.ok(html.includes(fixture.home.name));
    assert.ok(html.includes(fixture.away.name));
    assert.ok(html.includes(saved.url));
    assert.ok(html.includes("9:16"));
    const restored = galleryRecord(image)!;
    assert.deepEqual(restored.fixture, fixture);
    assert.equal(restored.prompt, saved.prompt);
    assert.equal(restored.url, saved.url);
  }
});
test("unknown historical image format keeps its image and renders a fallback label", () => {
  const html = render([
    { ...saved, settings: { ...defaultSettings, format: "old-format" } },
  ]);
  assert.ok(html.includes("Formato libre"));
  assert.ok(html.includes(saved.url));
});
test("unreadable metadata does not crash the gallery or hide the other saved images", () => {
  const broken = { ...saved, id: "broken", fixture: "{broken" };
  const before = JSON.stringify(broken);
  const html = render([null, broken, saved]);
  assert.ok(html.includes('role="alert"'));
  assert.ok(html.includes("Sus archivos siguen guardados"));
  assert.ok(html.includes(saved.url));
  assert.equal(JSON.stringify(broken), before);
});
