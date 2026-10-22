export const scenes = [
  {
    id: "stadium",
    name: "Duelo en estadio",
    description: "Dos camisetas protagonistas, luces del estadio y rivalidad.",
    prompt:
      "Escena fotorealista en un estadio al atardecer: las dos camisetas del encuentro flotan de forma natural a poca altura, con volumen realista y textura textil visible. Gradas, banderas y bufandas desenfocadas, luz cálida en un lado y luz dramática en el otro. Composición editorial vertical, profundidad y atmósfera cinematográfica.",
  },
  {
    id: "interior",
    name: "Camisetas en interior",
    description: "Una escena cálida, cuidada y con historia.",
    prompt:
      "Fotografía editorial en un interior elegante de aficionado al fútbol, con madera, luz cálida lateral de última hora y plantas discretas. Dos camisetas de los clubes del partido colocadas como protagonistas en primer plano, tejido detallado y volumen real. Al fondo, elementos sutiles de las ciudades y los clubes, con profundidad de campo y sombras suaves.",
  },
  {
    id: "editorial",
    name: "Historia editorial",
    description: "Una escena original para contar la rivalidad.",
    prompt:
      "Inventa una escena fotorealista original que represente la rivalidad de los equipos mediante camisetas, bufandas, banderas y elementos de sus ciudades. Diseña una fotografía publicitaria cuidada, con un concepto narrativo, perspectiva y luz natural creíble. Cada encuentro debe tener una composición distinta.",
  },
  {
    id: "custom",
    name: "Mi propia idea",
    description: "Tu prompt y tus referencias dirigen la escena.",
    prompt:
      "Sigue la dirección creativa del usuario y las referencias adjuntas. Compón una escena original con coherencia fotográfica y atención a materiales, luz y profundidad.",
  },
] as const;
export const referenceRoles = [
  {
    id: "style",
    label: "Estilo y ambiente",
    instruction:
      "Usar como referencia de iluminación, color, realismo y ambiente. Adaptar equipos y escenario al partido actual; no copiar los equipos ni el texto del ejemplo.",
  },
  {
    id: "home-kit",
    label: "Camiseta local",
    instruction:
      "Usar para reproducir la camiseta del equipo local: diseño, colores, escudo y detalles visibles, sin inventar patrocinadores.",
  },
  {
    id: "away-kit",
    label: "Camiseta visitante",
    instruction:
      "Usar para reproducir la camiseta del visitante: diseño, colores, escudo y detalles visibles, sin inventar patrocinadores.",
  },
  {
    id: "composition",
    label: "Composición",
    instruction:
      "Tomar la distribución, perspectiva y jerarquía visual como referencia; adaptar los elementos y equipos al partido actual.",
  },
] as const;
export type ReferenceRole = (typeof referenceRoles)[number]["id"];
export type ReferenceInstruction = { role: ReferenceRole; notes: string };
export const MAX_REFERENCE_FILES = 4;
export const MAX_REFERENCE_BYTES = 4 * 1024 * 1024;
export const MAX_TOTAL_REFERENCE_BYTES = 8 * 1024 * 1024;
