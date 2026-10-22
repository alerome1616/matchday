"use client";
import { ArrowUpRight, Check, Shirt, Sun, Trophy, Camera } from "lucide-react";
import { scenes } from "@/lib/creative";
import type { StudioState } from "@/hooks/use-studio";
export function CreativeIdeas({
  app,
  compact = false,
}: {
  app: StudioState;
  compact?: boolean;
}) {
  const icons = [Trophy, Sun, Camera, Shirt];
  return (
    <section
      className={compact ? "inspiration creative-ideas" : "creative-ideas"}
    >
      <div className="inspiration-heading">
        <div>
          <div className="eyebrow">DIRECCIÓN CREATIVA</div>
          <h2>
            {compact
              ? "Escenas que cuentan una rivalidad"
              : "Imagina la escena. OpenAI la crea."}
          </h2>
        </div>
      </div>
      <div className={"scene-ideas-grid " + (compact ? "compact" : "")}>
        {scenes
          .filter((s) => !compact || s.id !== "custom")
          .map((s, i) => {
            const Icon = icons[i];
            return (
              <button
                disabled={app.generating}
                key={s.id}
                className={
                  "scene-idea " + (app.settings.scene === s.id ? "chosen" : "")
                }
                onClick={() => {
                  app.updateSettings({ scene: s.id, style: "cinematic" });
                  app.setMessage("Escena «" + s.name + "» seleccionada.");
                }}
              >
                <span className={"scene-idea-art " + s.id}>
                  <Icon size={compact ? 26 : 40} strokeWidth={1.2} />
                  <small>{String(i + 1).padStart(2, "0")} / ESCENA</small>
                </span>
                <h3>{s.name}</h3>
                <p>{s.description}</p>
                <span className="text-button">
                  {app.settings.scene === s.id ? (
                    <>
                      <Check size={13} />
                      Seleccionada
                    </>
                  ) : (
                    <>
                      Usar esta escena
                      <ArrowUpRight size={13} />
                    </>
                  )}
                </span>
              </button>
            );
          })}
      </div>
      <p className="creative-note">
        Estas opciones describen la dirección creativa. El resultado se genera
        desde cero con OpenAI usando tu prompt y tus referencias.
      </p>
    </section>
  );
}
