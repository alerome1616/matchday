"use client";
import { useId, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Clapperboard,
  RectangleVertical,
  Save,
  SlidersHorizontal,
  Sparkles,
  Square,
  RectangleHorizontal,
  Eye,
  KeyRound,
} from "lucide-react";
import { styles, formats, defaultSettings } from "@/lib/defaults";
import { scenes } from "@/lib/creative";
import { buildFreePrompt, buildPrompt } from "@/lib/prompt";
import type { StudioState } from "@/hooks/use-studio";
import { ReferenceUploader } from "./reference-uploader";
import { Modal } from "./modal";
import { SelectionList } from "./selection-list";
export function SettingsPanel({
  app,
  expanded = false,
}: {
  app: StudioState;
  expanded?: boolean;
}) {
  const { settings, updateSettings } = app;
  const free = app.generationMode === "free";
  const [preview, setPreview] = useState(false);
  const prefix = useId();
  return (
    <section
      className={
        "settings-panel creative-panel " + (expanded ? "expanded" : "")
      }
      aria-label="Configuración del diseño"
    >
      <div className="panel-title">
        <span className="section-icon">
          <SlidersHorizontal size={17} />
        </span>
        <h2>Tu dirección creativa</h2>
        <span className="step">02</span>
      </div>
      <div
        className="generation-mode-switch"
        role="group"
        aria-label="Tipo de creación"
      >
        <button
          disabled={app.generating}
          aria-pressed={!free}
          onClick={() => app.setGenerationMode("match")}
        >
          Por partido
        </button>
        <button
          disabled={app.generating}
          aria-pressed={free}
          onClick={() => app.setGenerationMode("free")}
        >
          Creación libre
        </button>
      </div>
      <p className="panel-intro">
        {free
          ? "Escribe un título y describe tu idea. Puedes añadir imágenes de referencia; no necesitas seleccionar partidos."
          : "Ajustes generales. En tu lista, pulsa Editar para personalizar cada partido."}
      </p>
      {!free && (
        <>
          <SelectionList app={app} />
          {!app.selected.length && (
            <button
              className="text-button"
              disabled={app.generating}
              onClick={() => app.setGenerationMode("free")}
            >
              ¿Sin partido? Crea una imagen libre
            </button>
          )}
          <label className="field-label" htmlFor={prefix + "scene"}>
            Escena
          </label>
          <select
            id={prefix + "scene"}
            className="creative-select"
            value={settings.scene ?? "stadium"}
            disabled={app.generating}
            onChange={(e) =>
              updateSettings({ scene: e.target.value as typeof settings.scene })
            }
          >
            {scenes.map((scene) => (
              <option key={scene.id} value={scene.id}>
                {scene.name}
              </option>
            ))}
          </select>
          <p className="field-hint">
            {
              scenes.find((scene) => scene.id === (settings.scene ?? "stadium"))
                ?.description
            }
          </p>
        </>
      )}
      <label className="field-label" htmlFor={prefix + "style"}>
        Acabado visual
      </label>
      <div className="select-wrap">
        <Clapperboard size={16} />
        <select
          id={prefix + "style"}
          value={settings.style}
          disabled={app.generating}
          onChange={(e) =>
            updateSettings({ style: e.target.value as typeof settings.style })
          }
        >
          {styles.map((s) => (
            <option value={s.id} key={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <ChevronDown size={15} />
      </div>
      <label className="field-label">Formato de imagen</label>
      <div className="format-options">
        {Object.entries(formats).map(([id, f]) => {
          const Icon =
            id === "story"
              ? RectangleVertical
              : id === "square"
                ? Square
                : RectangleHorizontal;
          return (
            <button
              key={id}
              className={settings.format === id ? "active" : ""}
              disabled={app.generating}
              onClick={() =>
                updateSettings({ format: id as typeof settings.format })
              }
              aria-pressed={settings.format === id}
            >
              <Icon size={20} strokeWidth={1.5} />
              <b>{f.ratio}</b>
              <small>{f.label}</small>
            </button>
          );
        })}
      </div>
      <label className="field-label" htmlFor={prefix + "headline"}>
        {free ? "Título de la creación" : "Titular para la imagen"}
      </label>
      <input
        className="creative-input"
        id={prefix + "headline"}
        value={settings.headline ?? ""}
        placeholder={
          free ? "Ej.: UNA CIUDAD ENTRE LAS NUBES" : "Ej.: ORGULLO EN JUEGO"
        }
        maxLength={160}
        disabled={app.generating}
        onChange={(e) => updateSettings({ headline: e.target.value })}
      />
      <p className="field-hint">
        {free
          ? "El título se incluirá en la imagen y te ayudará a encontrarla en la galería."
          : "Déjalo vacío si tu prompt ya define el texto o no quieres titular."}
      </p>
      <div className="prompt-heading">
        <label htmlFor={prefix + "prompt"}>Prompt maestro</label>
        <span>
          EDITABLE
          <ArrowUpRight size={11} />
        </span>
      </div>
      <textarea
        id={prefix + "prompt"}
        value={settings.prompt}
        placeholder={
          free
            ? "Describe lo que quieres crear: sujetos, escenario, iluminación, composición y detalles. Mínimo 20 caracteres."
            : undefined
        }
        maxLength={4000}
        minLength={20}
        disabled={app.generating}
        onChange={(e) => updateSettings({ prompt: e.target.value })}
        rows={expanded ? 10 : 7}
      />
      <div className="prompt-actions">
        <button
          className="text-button"
          disabled={app.generating}
          onClick={() =>
            updateSettings(
              free ? { prompt: "", headline: "" } : { ...defaultSettings },
            )
          }
        >
          {free ? "Vaciar título y prompt" : "Usar prompt fotorealista"}
        </button>
        <button
          className="text-button"
          disabled={free ? !app.hasGenerationTarget : !app.selected.length}
          onClick={() => setPreview(true)}
        >
          <Eye size={12} />
          Ver prompt final
        </button>
      </div>
      <ReferenceUploader app={app} />
      <div className="quality-row">
        <label htmlFor={prefix + "quality"}>Calidad</label>
        <select
          id={prefix + "quality"}
          value={settings.quality}
          disabled={app.generating}
          onChange={(e) =>
            updateSettings({
              quality: e.target.value as typeof settings.quality,
            })
          }
        >
          <option value="low">Borrador</option>
          <option value="medium">Estándar</option>
          <option value="high">Alta</option>
        </select>
      </div>
      <details className="openai-connection" open>
        <summary>
          <KeyRound size={14} />
          {app.canGenerate ? "OpenAI conectado" : "Conectar OpenAI"}
        </summary>
        {app.config.generationConfigured && (
          <p>
            La clave del servidor está disponible. Los diseños se guardarán en
            tu cuenta.
          </p>
        )}
        {app.user && app.keyStatus?.saved && (
          <p role="status">
            Clave guardada en tu cuenta: ••••{app.keyStatus.suffix}. Se
            utilizará automáticamente al generar.
          </p>
        )}
        <label htmlFor={prefix + "openai-key"}>
          {app.user
            ? app.keyStatus?.saved
              ? "Sustituir clave de OpenAI"
              : "Tu clave de OpenAI"
            : "Clave temporal de API"}
          <input
            id={prefix + "openai-key"}
            type="password"
            value={app.apiKey}
            autoComplete="off"
            spellCheck={false}
            disabled={app.generating || app.keyBusy}
            placeholder="Introduce tu clave de OpenAI"
            onChange={(e) => app.setApiKey(e.target.value)}
          />
        </label>
        <p>
          {app.user
            ? app.config.authProvider === "postgres"
              ? "Tu clave se guarda cifrada en tu cuenta al generar. También puedes guardarla ahora para usarla en tus próximas sesiones."
              : "Guarda tu clave para usarla al volver a iniciar sesión, también desde otro dispositivo. Se cifra en el servidor y nunca se devuelve completa al navegador."
            : "La clave temporal se olvida al recargar. Inicia sesión para poder guardarla en tu cuenta."}
        </p>
        {app.user && (
          <div className="key-actions">
            <button
              className="secondary"
              disabled={
                app.generating ||
                app.keyBusy ||
                !app.keyStatus?.available ||
                app.apiKey.trim().length < 20
              }
              onClick={app.saveApiKey}
            >
              {app.keyBusy
                ? "Guardando cambios…"
                : "Guardar clave en mi cuenta"}
            </button>
            {app.keyStatus?.saved && (
              <button
                className="text-button"
                disabled={app.generating || app.keyBusy}
                onClick={app.deleteApiKey}
              >
                Eliminar clave guardada
              </button>
            )}
          </div>
        )}
        {app.user && app.keyStatus && !app.keyStatus.available && (
          <p>
            El administrador debe activar el guardado de claves siguiendo la
            guía de instalación.
          </p>
        )}
        {app.apiKey && (
          <button
            className="text-button"
            disabled={app.generating || app.keyBusy}
            onClick={() => app.setApiKey("")}
          >
            Vaciar campo
          </button>
        )}
        <a
          href="https://platform.openai.com/api-keys"
          target="_blank"
          rel="noreferrer"
        >
          Gestionar claves de OpenAI
          <ArrowUpRight size={11} />
        </a>
      </details>
      {!free && (
        <button
          className="save-settings"
          onClick={app.saveSettings}
          disabled={app.generating || app.saved}
        >
          {app.saved ? <Check size={15} /> : <Save size={15} />}{" "}
          {app.saved ? "Configuración guardada" : "Guardar configuración"}
        </button>
      )}
      <div className="generate-area">
        <div>
          <span>
            {free
              ? "1 creación libre"
              : app.selected.length +
                (app.selected.length === 1
                  ? " partido seleccionado"
                  : " partidos seleccionados")}
          </span>
          <small>{app.references.length} referencias</small>
        </div>
        <button
          className="primary generate"
          onClick={app.generate}
          disabled={
            !app.hasGenerationTarget || app.generating || !app.canGenerate
          }
        >
          <Sparkles size={17} />
          {app.generating
            ? "Generando " + app.progress.done + "/" + app.progress.total + "…"
            : free
              ? "Generar creación libre"
              : "Generar con OpenAI"}
          {!app.generating && <ArrowUpRight size={18} />}
        </button>
        {app.generating && (
          <button className="secondary" onClick={app.stopGeneration}>
            Detener tras esta imagen
          </button>
        )}
        <p>
          {app.canGenerate
            ? "Envía el prompt y las referencias a OpenAI · consumo de API"
            : "Añade tu clave en Conectar OpenAI para generar imágenes reales."}
        </p>
      </div>
      <Modal
        open={preview}
        onClose={() => setPreview(false)}
        title="Lo que recibirá OpenAI"
        className="prompt-preview-modal"
      >
        <p className="muted">
          {free
            ? "Esta imagen usará tu título, tu prompt y las referencias adjuntas."
            : "Cada imagen usará el prompt, el título y las referencias de su partido."}
        </p>
        {free && (
          <div className="prompt-final">
            <h3>{settings.headline}</h3>
            <pre>
              {buildFreePrompt(
                settings,
                app.references.map(({ role, notes }) => ({ role, notes })),
              )}
            </pre>
          </div>
        )}
        {!free &&
          app.selectedMatches.map(({ fixture: f, key, date }) => {
            const design = app.getMatchDesign(key);
            return (
              <div className="prompt-final" key={key}>
                <h3>
                  {f.home.name} × {f.away.name} · {date}
                </h3>
                <p>{design.references.length} referencias</p>
                <pre>
                  {buildPrompt(
                    f,
                    design.settings,
                    design.references.map(({ role, notes }) => ({
                      role,
                      notes,
                    })),
                  )}
                </pre>
              </div>
            );
          })}
      </Modal>
    </section>
  );
}
