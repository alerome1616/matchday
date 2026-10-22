import type { Fixture, Settings } from "./types";
const esc = (v: string) =>
  v.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export function demoPoster(f: Fixture, s: Settings) {
  const [w, h] =
    s.format === "square"
      ? [1080, 1080]
      : s.format === "landscape"
        ? [1536, 864]
        : [864, 1536];
  const minimal = s.style === "minimal";
  const retro = s.style === "retro";
  const bg = retro ? "#e6ddc7" : minimal ? "#f6f6f0" : "#071f1b";
  const ink = minimal || retro ? "#153d30" : "#f6f5e9";
  const title =
    s.style === "matchday"
      ? "MATCHDAY"
      : s.style === "epic"
        ? "THE BIG GAME"
        : retro
          ? "THE BEAUTIFUL GAME"
          : "BUILT FOR THE NIGHT.";
  const time = new Date(f.kickoff).toLocaleString("es-ES", {
    timeZone: "Europe/Madrid",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="' +
    w +
    '" height="' +
    h +
    '" viewBox="0 0 864 1536" preserveAspectRatio="none"><defs><linearGradient id="a" x2="1" y2="1"><stop stop-color="' +
    esc(f.home.color) +
    '"/><stop offset="1" stop-color="' +
    esc(f.away.color) +
    '"/></linearGradient><radialGradient id="glow"><stop stop-color="#bfe8c8" stop-opacity=".45"/><stop offset="1" stop-color="#164b3c" stop-opacity="0"/></radialGradient><pattern id="lines" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M0 36L36 0" stroke="' +
    ink +
    '" stroke-opacity=".035"/></pattern></defs><rect width="864" height="1536" fill="' +
    bg +
    '"/><circle cx="432" cy="780" r="650" fill="url(#glow)"/><rect width="864" height="1536" fill="url(#lines)"/><path d="M-100 1100L864 280V900L0 1600Z" fill="url(#a)" opacity=".6"/><path d="M-50 1240L900 420" stroke="' +
    ink +
    '" stroke-opacity=".2" stroke-width="2"/><g fill="' +
    ink +
    '" font-family="Arial,Helvetica,sans-serif"><text x="65" y="100" font-size="24" font-weight="700" letter-spacing="6">MATCHDAY / STUDIO</text><text x="65" y="202" font-size="19" letter-spacing="4">' +
    esc(f.league.toUpperCase()) +
    '</text><text x="65" y="333" font-size="59" font-weight="900" letter-spacing="-2">' +
    title +
    '</text><text x="432" y="674" text-anchor="middle" font-size="190" font-weight="900" opacity=".95">' +
    esc(f.home.short) +
    '</text><text x="432" y="795" text-anchor="middle" font-size="54" letter-spacing="14">VS</text><text x="432" y="1010" text-anchor="middle" font-size="190" font-weight="900" opacity=".95">' +
    esc(f.away.short) +
    '</text><text x="432" y="1150" text-anchor="middle" font-size="26" font-weight="700">' +
    esc(f.home.name) +
    " × " +
    esc(f.away.name) +
    '</text><path d="M65 1230H799" stroke="' +
    ink +
    '" stroke-opacity=".4"/><text x="65" y="1310" font-size="31" font-weight="700">' +
    esc(time.toUpperCase()) +
    '</text><text x="65" y="1365" font-size="24">' +
    esc(f.venue) +
    '</text><text x="65" y="1470" font-size="18" letter-spacing="4" opacity=".65">DISEÑO DE DEMOSTRACIÓN · ' +
    esc(s.style.toUpperCase()) +
    "</text></g></svg>"
  );
}
export function posterDataUrl(f: Fixture, s: Settings) {
  return (
    "data:image/svg+xml;charset=utf-8," + encodeURIComponent(demoPoster(f, s))
  );
}
