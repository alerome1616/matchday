import type { Settings } from "./types";
export const defaultSettings: Settings = {
  style: "cinematic",
  format: "story",
  quality: "high",
  scene: "stadium",
  headline: "ORGULLO EN JUEGO",
  prompt:
    "Crea una imagen fotorealista de alto impacto para {EQUIPO_LOCAL} y {EQUIPO_VISITANTE}. Las camisetas de ambos clubes son las protagonistas, con textura textil real, volumen, luz y sombras creíbles. Construye una escena cinematográfica con ambiente, profundidad y una historia visual sobre su rivalidad. Sigue las imágenes adjuntas para camisetas, composición y estilo según su función. Integra un titular expresivo en español con tipografía de pincel cuidada, sin tapar las prendas. Usa elementos de ambos clubes y sus ciudades de forma coherente. Evita un cartel plano con siglas, una tabla de partido o una plantilla tipográfica. No incluyas fecha, hora ni marcador salvo que se pida. Si una camiseta se aporta como referencia, respeta sus detalles visibles.",
};
export const styles = [
  {
    id: "cinematic",
    name: "Cinematográfico",
    description: "Luz, atmósfera y emoción",
    mark: "01",
  },
  {
    id: "minimal",
    name: "Minimalista",
    description: "Menos elementos. Más impacto.",
    mark: "02",
  },
  {
    id: "matchday",
    name: "Matchday",
    description: "Toda la energía del partido",
    mark: "03",
  },
  {
    id: "retro",
    name: "Retro",
    description: "El fútbol de siempre",
    mark: "04",
  },
  {
    id: "epic",
    name: "Épico",
    description: "Un encuentro inolvidable",
    mark: "05",
  },
] as const;
export const formats = {
  story: { label: "Historia", ratio: "9:16", size: "864x1536" },
  square: { label: "Publicación", ratio: "1:1", size: "1024x1024" },
  landscape: { label: "Horizontal", ratio: "16:9", size: "1536x864" },
} as const;

const legacyPrompt =
  'Crea un cartel profesional de fútbol para {EQUIPO_LOCAL} vs {EQUIPO_VISITANTE}. Competición: {COMPETICION}. Fecha: {FECHA}. Hora: {HORA}. Estadio: {ESTADIO}. Diferencia claramente ambos equipos, utiliza sus colores y una composición potente, con iluminación cuidada y un fondo limpio. Texto principal: "{EQUIPO_LOCAL} VS {EQUIPO_VISITANTE}". Incluye competición, fecha y hora de forma legible. Evita inventar jugadores o patrocinadores.';
export function upgradeCreativeSettings(settings: Settings): Settings {
  return {
    ...settings,
    scene: settings.scene ?? "stadium",
    headline: settings.headline ?? "ORGULLO EN JUEGO",
    ...(settings.prompt === legacyPrompt
      ? { prompt: defaultSettings.prompt, quality: "high" as const }
      : {}),
  };
}
