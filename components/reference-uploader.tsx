"use client";
import { ImagePlus, Trash2 } from "lucide-react";
import { referenceRoles } from "@/lib/creative";
import type { StudioState } from "@/hooks/use-studio";
export function ReferenceUploader({ app }: { app: StudioState }) {
  return (
    <section className="reference-section">
      <div className="prompt-heading">
        <label htmlFor="reference-files">Imágenes de referencia</label>
        <span>{app.references.length}/4</span>
      </div>
      <label
        className={"reference-drop " + (app.generating ? "disabled" : "")}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!app.generating)
            app.addReferences(Array.from(e.dataTransfer.files));
        }}
      >
        <ImagePlus size={24} />
        <strong>Añade camisetas, una escena o un estilo</strong>
        <span>Arrastra imágenes o pulsa para elegir</span>
        <small>PNG, JPG, WebP · hasta 4 MB por imagen · 8 MB en total</small>
        <input
          id="reference-files"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          disabled={app.generating || app.references.length >= 4}
          onChange={(e) => {
            app.addReferences(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </label>
      <div className="reference-list">
        {app.references.map((ref, index) => (
          <article key={ref.id} className="reference-item">
            <img src={ref.preview} alt={"Referencia " + (index + 1)} />
            <div>
              <label htmlFor={"ref-role-" + ref.id}>
                Referencia {index + 1}
              </label>
              <select
                id={"ref-role-" + ref.id}
                value={ref.role}
                disabled={app.generating}
                onChange={(e) =>
                  app.updateReference(ref.id, {
                    role: e.target.value as typeof ref.role,
                  })
                }
              >
                {referenceRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
              <input
                aria-label={"Indicaciones para referencia " + (index + 1)}
                placeholder="Qué quieres conservar de esta imagen…"
                value={ref.notes}
                maxLength={500}
                disabled={app.generating}
                onChange={(e) =>
                  app.updateReference(ref.id, { notes: e.target.value })
                }
              />
            </div>
            <button
              className="icon-button"
              disabled={app.generating}
              onClick={() => app.removeReference(ref.id)}
              aria-label={"Quitar referencia " + (index + 1)}
            >
              <Trash2 size={14} />
            </button>
          </article>
        ))}
      </div>
      <p className="field-hint">
        Las referencias de estilo se adaptan al partido elegido. Para reproducir
        una camiseta concreta, asigna «Camiseta local» o «Camiseta visitante».
      </p>
    </section>
  );
}
