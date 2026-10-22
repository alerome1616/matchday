"use client";
import { useState, type FormEvent } from "react";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { Modal } from "./modal";
import { createClient } from "@/lib/supabase/client";
import type { RuntimeConfig, StudioUser } from "@/lib/types";
export function AuthModal({
  open,
  onClose,
  config,
  email,
  onAuthenticated,
}: {
  open: boolean;
  onClose: () => void;
  config: RuntimeConfig;
  email?: string;
  onAuthenticated: (user: StudioUser) => void;
}) {
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (config.demo || !config.configured) return;
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const credentials = {
        email: String(data.get("email")),
        password: String(data.get("password")),
      };
      if (config.authProvider === "postgres") {
        const response = await fetch(
          `/api/auth/${register ? "register" : "login"}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials),
          },
        );
        const data = (await response.json()) as {
          user?: StudioUser;
          error?: string;
        };
        if (!response.ok || !data.user)
          throw new Error(data.error || "No se pudo iniciar sesión.");
        onAuthenticated(data.user);
        onClose();
        return;
      }
      const db = createClient();
      const result = register
        ? await db.auth.signUp({
            ...credentials,
            options: { emailRedirectTo: location.origin + "/auth/callback" },
          })
        : await db.auth.signInWithPassword(credentials);
      if (result.error) throw result.error;
      if (register && !result.data.session)
        setNotice(
          "Revisa tu correo para confirmar la cuenta. Después podrás iniciar sesión.",
        );
      else onClose();
    } catch (e) {
      setError(
        config.authProvider === "postgres" && e instanceof Error
          ? e.message
          : register
            ? "No se pudo crear la cuenta. Revisa los datos y vuelve a intentarlo."
            : "No se pudo iniciar sesión. Revisa tu correo y contraseña.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        email
          ? "Tu cuenta"
          : register
            ? "Crea tu espacio creativo"
            : "Bienvenido a Matchday"
      }
    >
      <p className="muted">
        Tus partidos. Tu estilo. Todos tus diseños en un solo lugar.
      </p>
      {email ? (
        <div className="auth-demo">
          <LockKeyhole size={28} />
          <h3>Tu sesión está activa</h3>
          <p>{email}</p>
          <p>
            Tu galería privada y tus preferencias están vinculadas a esta
            cuenta. Puedes guardar tu clave de OpenAI en Conectar OpenAI para
            usarla en tus próximas sesiones.
          </p>
          <button className="primary" onClick={onClose}>
            Volver al estudio
            <ArrowRight size={17} />
          </button>
        </div>
      ) : config.demo || !config.configured ? (
        <div className="auth-demo">
          <LockKeyhole size={28} />
          <h3>
            {config.demo
              ? "Estás en el estudio local"
              : "La conexión está pendiente"}
          </h3>
          <p>
            {config.demo
              ? "Consulta los partidos y genera imágenes reales con tu clave temporal de OpenAI. Tu galería se guarda en este navegador."
              : "El servicio de cuentas está pendiente de activar. Contacta con el administrador del estudio."}
          </p>
          <button className="primary" onClick={onClose}>
            Explorar el estudio <ArrowRight size={17} />
          </button>
        </div>
      ) : (
        <>
          <form onSubmit={submit} className="auth-form">
            <label>
              Correo electrónico
              <div className="input-icon">
                <Mail size={17} />
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="tu@correo.com"
                  maxLength={254}
                />
              </div>
            </label>
            <label>
              Contraseña
              <input
                name="password"
                type="password"
                minLength={8}
                maxLength={128}
                required
                autoComplete={register ? "new-password" : "current-password"}
                placeholder="Mínimo 8 caracteres"
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="form-success" role="status">
                {notice}
              </p>
            )}
            <button className="primary" disabled={busy}>
              {busy
                ? "Un momento…"
                : register
                  ? "Crear cuenta"
                  : "Iniciar sesión"}
              <ArrowRight size={17} />
            </button>
          </form>
          <p className="auth-switch">
            {register ? "¿Ya tienes cuenta?" : "¿Primera vez por aquí?"}{" "}
            <button
              className="text-button"
              onClick={() => {
                setRegister(!register);
                setError("");
                setNotice("");
              }}
            >
              {register ? "Inicia sesión" : "Crea una cuenta"}
            </button>
          </p>
        </>
      )}
    </Modal>
  );
}
