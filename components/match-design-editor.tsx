"use client";
import { useId } from "react";
import type { StudioState } from "@/hooks/use-studio";
import { Modal } from "./modal";
import { ReferenceUploader } from "./reference-uploader";
import { buildPrompt } from "@/lib/prompt";

export function MatchDesignEditor({ app }: { app: StudioState }) {
  const prefix = useId();
  const match = app.selectedMatches.find((m) => m.key === app.editingMatchKey);
  if (!match) return null;
  const { key, fixture, date } = match;
  const draft = app.matchDrafts[key];
  const design = app.getMatchDesign(key);
  const ownReferences = draft?.references ?? [];
  const includeGeneral = draft?.includeGeneralReferences !== false;
  return (
    <Modal
      open
      onClose={() => app.setEditingMatchKey(null)}
      title="Diseño de este partido"
      className="match-design-editor"
    >
      <p className="match-editor-heading">
        <strong>
          {fixture.home.name} × {fixture.away.name}
        </strong>
        <span>{date}</span>
      </p>
      <p className="field-hint">
        Personaliza este encuentro. Los demás siguen usando sus propios ajustes
        o la configuración general.
      </p>
      <p className="field-hint">
        Tu prompt propio define la escena. El formato, acabado visual y calidad
        se toman de los ajustes generales.
      </p>
      <fieldset disabled={app.generating}>
        <div className="prompt-heading">
          <label htmlFor={prefix + "prompt"}>
            Prompt maestro de este partido
          </label>
          {draft?.prompt !== undefined && (
            <button
              className="text-button"
              onClick={() => app.updateMatchDraft(key, { prompt: undefined })}
            >
              Usar general
            </button>
          )}
        </div>
        <textarea
          id={prefix + "prompt"}
          rows={7}
          maxLength={4000}
          value={design.settings.prompt}
          onChange={(e) =>
            app.updateMatchDraft(key, { prompt: e.target.value })
          }
        />
        <p className="field-hint">
          {draft?.prompt === undefined
            ? "Usando el prompt general"
            : "Prompt exclusivo de este partido"}{" "}
          · {design.settings.prompt.length}/4.000
        </p>
        <div className="prompt-heading">
          <label htmlFor={prefix + "headline"}>Título de este partido</label>
          {draft?.headline !== undefined && (
            <button
              className="text-button"
              onClick={() => app.updateMatchDraft(key, { headline: undefined })}
            >
              Usar general
            </button>
          )}
        </div>
        <input
          id={prefix + "headline"}
          maxLength={160}
          value={design.settings.headline ?? ""}
          placeholder="Escribe el texto que aparecerá en la imagen"
          onChange={(e) =>
            app.updateMatchDraft(key, { headline: e.target.value })
          }
        />
        <p className="field-hint">
          {draft?.headline === undefined
            ? "Usando el título general"
            : "Título exclusivo de este partido. Déjalo vacío para omitirlo."}
        </p>
        <label className="inherit-references">
          <input
            type="checkbox"
            checked={includeGeneral}
            onChange={(e) =>
              app.updateMatchDraft(key, {
                includeGeneralReferences: e.target.checked,
              })
            }
          />
          Usar también las referencias generales ({app.references.length})
        </label>
        {includeGeneral && app.references.length > 0 && (
          <div className="inherited-reference-list">
            {app.references.map((r) => (
              <img
                key={r.id}
                src={r.preview}
                alt={"Referencia general: " + r.file.name}
              />
            ))}
          </div>
        )}
        <ReferenceUploader
          app={{
            generating: app.generating,
            references: ownReferences,
            addReferences: (files) => app.addMatchReferences(key, files),
            updateReference: (id, patch) =>
              app.updateMatchReference(key, id, patch),
            removeReference: (id) => app.removeMatchReference(key, id),
          }}
          inheritedCount={includeGeneral ? app.references.length : 0}
        />
        <p className="field-hint">
          Estas imágenes se envían únicamente para este partido. Hasta 4
          referencias y 4 MB en total, incluidas las generales.
        </p>
        <details className="match-prompt-preview">
          <summary>
            Ver prompt final · {design.references.length} referencias
          </summary>
          <pre>{buildPrompt(fixture, design.settings, design.references)}</pre>
        </details>
        {app.error && (
          <p className="match-editor-error" role="alert">
            {app.error}
          </p>
        )}
        <div className="match-editor-actions">
          <button
            className="secondary"
            onClick={() => {
              app.clearMatchDrafts([key]);
              app.setEditingMatchKey(key);
              app.setError("");
            }}
          >
            Restablecer generales
          </button>
          <button
            className="primary"
            onClick={() => app.setEditingMatchKey(null)}
          >
            Listo
          </button>
        </div>
        <p className="field-hint">
          Los ajustes se mantienen al cambiar de día mientras este partido siga
          en tu lista. Se vacían al quitarlo o recargar.
        </p>
      </fieldset>
    </Modal>
  );
}
