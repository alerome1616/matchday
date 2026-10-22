"use client";
import { X } from "lucide-react";
import type { StudioState } from "@/hooks/use-studio";
export function SelectionList({ app }: { app: StudioState }) {
  return (
    <section className="selected-matches" aria-label="Partidos seleccionados">
      <div className="selected-heading">
        <strong>Tu lista · {app.selectedMatches.length}</strong>
        {app.selected.length > 0 && (
          <button
            className="text-button"
            disabled={app.generating}
            onClick={app.clearSelection}
          >
            Vaciar
          </button>
        )}
      </div>
      {!app.selected.length && (
        <p>Elige partidos de cualquier día. Aparecerán aquí.</p>
      )}
      <div className="selected-scroll">
        {app.selectedMatches.map(({ key, date, fixture }) => (
          <div className="selected-match" key={key}>
            <span>
              <strong>
                {fixture.home.name} × {fixture.away.name}
              </strong>
              <small>
                {new Date(date + "T12:00:00Z").toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "short",
                  timeZone: "Europe/Madrid",
                })}
              </small>
            </span>
            <button
              className="icon-button"
              disabled={app.generating}
              onClick={() => app.removeSelected(key)}
              aria-label={`Quitar ${fixture.home.name} contra ${fixture.away.name}`}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
      {app.selected.length > 0 && (
        <p>
          Se generará una imagen por partido, de una en una. Cada imagen consume
          saldo de tu API.
        </p>
      )}
    </section>
  );
}
