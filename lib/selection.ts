import type { Fixture } from "./types";
export type SelectedMatch = { key: string; date: string; fixture: Fixture };
export const selectionKey = (date: string, id: number) => `${date}:${id}`;
export function toggleMatch(
  current: SelectedMatch[],
  fixture: Fixture,
  date: string,
) {
  const key = selectionKey(date, fixture.id);
  return current.some((match) => match.key === key)
    ? current.filter((match) => match.key !== key)
    : [...current, { key, date, fixture }];
}
export function selectVisible(
  current: SelectedMatch[],
  fixtures: Fixture[],
  date: string,
) {
  const keys = new Set(
    fixtures.map((fixture) => selectionKey(date, fixture.id)),
  );
  if (
    fixtures.length &&
    fixtures.every((fixture) =>
      current.some((match) => match.key === selectionKey(date, fixture.id)),
    )
  )
    return current.filter((match) => !keys.has(match.key));
  const existing = new Set(current.map((match) => match.key));
  return [
    ...current,
    ...fixtures
      .filter((fixture) => !existing.has(selectionKey(date, fixture.id)))
      .map((fixture) => ({
        key: selectionKey(date, fixture.id),
        date,
        fixture,
      })),
  ];
}
