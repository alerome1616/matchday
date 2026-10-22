"use client";
import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clapperboard,
  FolderHeart,
  Images,
  LayoutGrid,
  LoaderCircle,
  LogOut,
  Menu,
  Palette,
  Search,
  RefreshCw,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import type { RuntimeConfig } from "@/lib/types";
import { useStudio, type View } from "@/hooks/use-studio";
import { displayDate, madridDate } from "@/lib/date";
import { defaultSettings, styles } from "@/lib/defaults";
import { mockFixtures } from "@/lib/mock";
import { posterDataUrl } from "@/lib/poster";
import { FixtureCard } from "./fixture-card";
import { SettingsPanel } from "./settings-panel";
import { CreativeIdeas } from "./creative-ideas";
import { Gallery } from "./gallery";
import { AuthModal } from "./auth-modal";
import { Modal } from "./modal";
import { MatchDesignEditor } from "./match-design-editor";
const navigation = [
  { id: "matches", label: "Partidos del día", Icon: CalendarDays },
  { id: "gallery", label: "Mi galería", Icon: Images },
  { id: "styles", label: "Escenas creativas", Icon: Palette },
  { id: "settings", label: "Configuración", Icon: Settings2 },
] as const;
export function Studio({ config }: { config: RuntimeConfig }) {
  const app = useStudio(config);
  const [menu, setMenu] = useState(false);
  const [help, setHelp] = useState(false);
  const [search, setSearch] = useState("");
  const [league, setLeague] = useState("Todas");
  const [helpTab, setHelpTab] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  useEffect(() => {
    if (app.view !== "matches") setGeneratorOpen(false);
  }, [app.view]);
  useEffect(() => {
    if (app.message) {
      const t = setTimeout(() => app.setMessage(""), 4500);
      return () => clearTimeout(t);
    }
  }, [app.message, app.setMessage]);
  useEffect(() => {
    if (new URLSearchParams(location.search).has("auth_error"))
      app.setError(
        "El enlace de confirmación no es válido o ha caducado. Vuelve a iniciar sesión.",
      );
  }, []);
  const filtered = app.fixtures.filter(
    (f) =>
      (league === "Todas" || f.league === league) &&
      (f.home.name + " " + f.away.name)
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const leagues = [...new Set(app.fixtures.map((f) => f.league))];

  function navigate(view: View) {
    app.setView(view);
    setMenu(false);
  }
  function shiftDate(days: number) {
    const d = new Date(app.date + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + days);
    app.setDate(d.toISOString().slice(0, 10));
    setLeague("Todas");
  }
  return (
    <div className="app-shell">
      {menu && (
        <button
          className="mobile-overlay"
          aria-label="Cerrar menú"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={"sidebar " + (menu ? "mobile-open" : "")}>
        <a href="/" className="brand" aria-label="Matchday Studio, inicio">
          <span className="brand-mark">
            <span />
            <span />
            <span />
          </span>
          <span>
            MATCHDAY<small>STUDIO</small>
          </span>
        </a>
        <div className="workspace-label">TU ESPACIO CREATIVO</div>
        <nav aria-label="Navegación principal">
          {navigation.map(({ id, label, Icon }) => (
            <button
              className={"nav-item " + (app.view === id ? "active" : "")}
              onClick={() => navigate(id)}
              key={id}
              aria-current={app.view === id ? "page" : undefined}
            >
              <Icon size={18} strokeWidth={1.7} />
              {label}
              {id === "gallery" && app.images.length > 0 && (
                <span className="nav-count">{app.images.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="note-icon">
            <Sparkles size={18} />
          </span>
          <h3>
            El fútbol se vive.
            <br />
            El diseño se crea.
          </h3>
          <p>Convierte cada encuentro en algo que merezca compartirse.</p>
          <span className="note-line" />
        </div>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setHelp(true)}>
            <CircleHelp size={18} />
            Guía del estudio
            <ArrowUpRight size={14} />
          </button>
          <div className="sidebar-profile">
            <div className="avatar">
              {app.user?.email?.[0]?.toUpperCase() ?? "M"}
            </div>
            <div>
              <strong>{app.user?.email?.split("@")[0] ?? "Tu estudio"}</strong>
              <small>
                {config.demo
                  ? "Galería local"
                  : app.user
                    ? "Cuenta personal"
                    : "Sin sesión iniciada"}
              </small>
            </div>
            {app.user && (
              <button
                className="icon-button"
                aria-label="Cerrar sesión"
                disabled={app.generating}
                onClick={app.logout}
              >
                <LogOut size={15} />
              </button>
            )}
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Abrir menú"
              onClick={() => setMenu(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{navigation.find((n) => n.id === app.view)?.label}</strong>
          </div>
          <div className="topbar-right">
            <span className="connection">
              <i />
              {config.footballMock ? "Partidos de ejemplo" : "Partidos reales"}
            </span>
            <span className="top-divider" />
            <button
              className="account-button"
              onClick={() => app.setAuthOpen(true)}
            >
              <span className="avatar small">
                {app.user?.email?.[0]?.toUpperCase() ?? "M"}
              </span>
              <span>{app.user ? "Mi cuenta" : "Iniciar sesión"}</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </header>
        <main>
          {config.demo && (
            <div className="demo-banner">
              <span>
                <span className="demo-dot" />
                {config.footballMock
                  ? "Estás explorando la demo. Partidos e imágenes de ejemplo; guardado en este navegador."
                  : "Partidos reales de " +
                    (config.footballProvider === "espn"
                      ? "ESPN"
                      : "API-Football") +
                    ". Generación real con OpenAI; conecta tu clave para crear y guardar imágenes en este navegador."}
              </span>
              <button
                onClick={() => {
                  setHelpTab(true);
                  setHelp(true);
                }}
              >
                Cómo activar la app <ArrowUpRight size={13} />
              </button>
            </div>
          )}
          {app.error && (
            <div className="alert error" role="alert">
              <span>{app.error}</span>
              <button
                className="icon-button"
                aria-label="Cerrar aviso"
                onClick={() => app.setError("")}
              >
                <X size={17} />
              </button>
            </div>
          )}
          {!config.demo && !app.user ? (
            <div className="welcome-gate">
              <span className="eyebrow">BIENVENIDO A TU ESTUDIO</span>
              <h1>
                Haz que cada partido
                <br />
                tenga su propia historia.
              </h1>
              <p>
                Entra en tu cuenta para descubrir los partidos, crear diseños y
                guardar tu galería privada.
              </p>
              <button
                className="primary"
                disabled={!app.authReady}
                onClick={() => app.setAuthOpen(true)}
              >
                {app.authReady ? "Entrar al estudio" : "Comprobando sesión…"}
                <ArrowRight size={17} />
              </button>
            </div>
          ) : app.view === "matches" ? (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <div className="eyebrow">
                    <span /> EL PARTIDO EMPIEZA EN TU DISEÑO
                  </div>
                  <h1>
                    Grandes partidos.
                    <br />
                    <em>Imágenes a su altura.</em>
                  </h1>
                  <p>
                    Elige los encuentros. Ponles tu estilo.
                    <br />
                    Crea imágenes que se sientan como el fútbol.
                  </p>
                  <div className="hero-footer">
                    <span>
                      <Sparkles size={14} /> Creado con inteligencia artificial
                    </span>
                    <span className="hero-divider" />
                    <span>Diseñado por ti.</span>
                  </div>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="pitch">
                    <div className="pitch-half" />
                    <div className="pitch-circle" />
                    <div className="pitch-box left" />
                    <div className="pitch-box right" />
                  </div>
                  <span className="art-star star-one">✳</span>
                  <span className="art-star star-two">✳</span>
                  <div className="art-word">
                    MAKE
                    <br />
                    <span>IT</span> MATCH.
                  </div>
                  <div className="art-caption">
                    THE BEAUTIFUL GAME. REIMAGINED.
                  </div>
                  <div className="hero-coordinates">
                    40°27′10″N &nbsp; 3°41′18″W
                  </div>
                </div>
              </section>
              <div className="studio-grid">
                <section className="matches-section">
                  <div className="section-heading">
                    <div className="section-heading-text">
                      <span className="section-icon">
                        <CalendarDays size={17} />
                      </span>
                      <h2>La jornada, a tu manera</h2>
                      <span className="step">01</span>
                    </div>
                    <span className="subtle-count">
                      {app.fixtures.length} partidos disponibles
                    </span>
                  </div>
                  <p className="section-description">
                    Selecciona partidos de uno o varios días. Tu lista se
                    mantiene al cambiar de fecha.
                  </p>
                  <div className="date-toolbar">
                    <div className="date-switch">
                      <button
                        className="icon-button"
                        aria-label="Día anterior"
                        disabled={app.generating}
                        onClick={() => shiftDate(-1)}
                      >
                        <ChevronLeft size={17} />
                      </button>
                      <label>
                        <CalendarDays size={15} />
                        <input
                          type="date"
                          aria-label="Fecha de los partidos"
                          value={app.date}
                          disabled={app.generating}
                          onChange={(e) => {
                            if (e.target.value) {
                              app.setDate(e.target.value);
                              setLeague("Todas");
                            }
                          }}
                        />
                      </label>
                      <button
                        className="icon-button"
                        aria-label="Día siguiente"
                        disabled={app.generating}
                        onClick={() => shiftDate(1)}
                      >
                        <ChevronRight size={17} />
                      </button>
                    </div>
                    <button
                      className="today-button"
                      disabled={app.generating || app.date === madridDate()}
                      onClick={() => app.setDate(madridDate())}
                    >
                      Hoy
                    </button>
                    <label className="search-mini">
                      <Search size={15} />
                      <input
                        type="search"
                        value={search}
                        placeholder="Buscar equipo"
                        aria-label="Buscar equipo"
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                  </div>
                  <div
                    className="league-tabs"
                    aria-label="Filtrar por competición"
                  >
                    {["Todas", ...leagues].map((l) => (
                      <button
                        className={league === l ? "active" : ""}
                        key={l}
                        onClick={() => setLeague(l)}
                      >
                        {l === "Todas" ? (
                          <LayoutGrid size={13} />
                        ) : (
                          <Trophy size={13} />
                        )}{" "}
                        {l === "UEFA Champions League" ? "Champions League" : l}
                      </button>
                    ))}
                  </div>
                  <div className="fixtures-source-row">
                    <div>
                      {app.fixturesSource ? (
                        <>
                          <span>
                            <i
                              className={
                                app.fixturesSource.mock ? "mock-dot" : ""
                              }
                            />
                            {app.fixturesSource.name} · {displayDate(app.date)}{" "}
                            · Madrid
                          </span>
                          <small>
                            Consultado a las{" "}
                            {new Date(
                              app.fixturesSource.fetchedAt,
                            ).toLocaleTimeString("es-ES", {
                              timeZone: "Europe/Madrid",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                            .{" "}
                            {config.footballMock
                              ? "Datos ficticios de prueba."
                              : "Cobertura según el calendario del proveedor."}
                          </small>
                          {app.fixturesSource.url && (
                            <a
                              href={app.fixturesSource.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Ver jornada en la fuente{" "}
                              <ArrowUpRight size={12} />
                            </a>
                          )}
                        </>
                      ) : (
                        <span>
                          {app.loading
                            ? "Consultando la jornada real…"
                            : "Jornada sin cargar"}
                        </span>
                      )}
                    </div>
                    <button
                      className="secondary"
                      disabled={app.loading || app.generating}
                      onClick={app.refreshFixtures}
                    >
                      <RefreshCw
                        size={13}
                        className={app.loading ? "spin" : ""}
                      />
                      Actualizar partidos
                    </button>
                  </div>
                  <div className="match-list-heading">
                    <span>
                      <Trophy size={14} />
                      {league === "Todas"
                        ? "PARTIDOS DE LA JORNADA"
                        : league.toUpperCase()}
                    </span>
                    <button
                      className="text-button"
                      disabled={app.generating || !filtered.length}
                      onClick={() => app.toggleVisible(filtered)}
                    >
                      {filtered.length &&
                      filtered.every((f) => app.isSelected(f.id))
                        ? "Quitar los de esta vista"
                        : "Seleccionar " + filtered.length}
                    </button>
                  </div>
                  {app.loading ? (
                    <div className="fixtures-grid" aria-busy="true">
                      {[0, 1, 2, 3].map((x) => (
                        <div className="fixture-skeleton" key={x}>
                          <span />
                          <span />
                          <span />
                        </div>
                      ))}
                    </div>
                  ) : filtered.length ? (
                    <div className="fixtures-grid">
                      {filtered.map((f) => (
                        <FixtureCard
                          key={f.id}
                          fixture={f}
                          selected={app.isSelected(f.id)}
                          disabled={app.generating}
                          onToggle={() => app.toggle(f.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="empty">
                      <CalendarDays size={28} />
                      <h3>No hay partidos para mostrar</h3>
                      <p>
                        {search
                          ? "Prueba a buscar otro equipo."
                          : "Elige otra fecha o competición."}
                      </p>
                    </div>
                  )}
                  <div className="selection-info">
                    <span>
                      <ShieldCheck size={14} />
                      Tus diseños se guardan en tu galería
                    </span>
                    <span>
                      <i />
                      {app.selected.length} seleccionados
                    </span>
                  </div>
                  <CreativeIdeas app={app} compact />
                </section>
                <div className="desktop-generator">
                  <SettingsPanel app={app} />
                </div>
              </div>
            </>
          ) : app.view === "gallery" ? (
            <Gallery app={app} />
          ) : app.view === "styles" ? (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">ENCUENTRA TU IDENTIDAD</div>
                  <h1>El fútbol tiene muchos estilos.</h1>
                  <p>
                    Define la escena, el titular y las imágenes que guiarán a
                    OpenAI.
                  </p>
                </div>
              </div>
              <CreativeIdeas app={app} />
              <div className="style-cta">
                <p>
                  ¿Ya tienes tu favorito? Tu siguiente diseño está a un partido
                  de distancia.
                </p>
                <button
                  className="primary"
                  onClick={() => app.setView("matches")}
                >
                  Elegir partidos
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">HAZLO TUYO</div>
                  <h1>Tu estudio. Tus reglas.</h1>
                  <p>
                    Guarda tu dirección creativa para los próximos encuentros.
                  </p>
                </div>
              </div>
              <div className="settings-view">
                <SettingsPanel app={app} expanded />
                <section className="connection-card">
                  <span className="section-icon">
                    <Zap size={21} />
                  </span>
                  <h2>Tu espacio de trabajo</h2>
                  <p>El estudio está preparado para acompañar cada jornada.</p>
                  <dl>
                    <dt>Partidos</dt>
                    <dd>
                      {config.footballMock
                        ? "Datos de muestra"
                        : config.footballProvider === "espn"
                          ? "ESPN · calendario real"
                          : "API-Football"}
                    </dd>
                    <dt>Generación</dt>
                    <dd>
                      {config.imageMock
                        ? "OpenAI · conecta tu clave"
                        : "OpenAI"}
                    </dd>
                    <dt>Galería</dt>
                    <dd>
                      {config.demo ? "Este navegador" : "Tu cuenta · privada"}
                    </dd>
                    <dt>Zona horaria</dt>
                    <dd>Europe/Madrid</dd>
                  </dl>
                  <button
                    className="secondary"
                    onClick={() => {
                      setHelpTab(true);
                      setHelp(true);
                    }}
                  >
                    Ver guía de configuración
                    <ArrowUpRight size={14} />
                  </button>
                </section>
              </div>
            </>
          )}
          <footer className="footer">
            <span>
              MATCHDAY STUDIO <i>© {new Date().getFullYear()}</i>
            </span>
            <span>
              Hecho para quienes sienten el fútbol.
              <span className="footer-ball">◉</span>
            </span>
          </footer>
        </main>
      </div>
      <MatchDesignEditor app={app} />
      <AuthModal
        open={app.authOpen}
        onClose={() => app.setAuthOpen(false)}
        config={config}
        email={app.user?.email}
        onAuthenticated={app.onAuthenticated}
      />
      {(config.demo || app.user) && app.view === "matches" && (
        <>
          <div className="mobile-generator-bar">
            <div>
              <strong>{app.selected.length} partidos</strong>
              <small>
                {app.generating
                  ? `Generando ${app.progress.done}/${app.progress.total}`
                  : "Tu selección de varios días"}
              </small>
            </div>
            <button className="primary" onClick={() => setGeneratorOpen(true)}>
              <Sparkles size={17} /> Abrir generador
            </button>
          </div>
          <Modal
            open={generatorOpen}
            onClose={() => setGeneratorOpen(false)}
            title="Tu generador"
            className="generator-drawer"
          >
            <div className="generator-quick-actions">
              <button
                className="primary"
                disabled={
                  !app.selected.length || !app.canGenerate || app.generating
                }
                onClick={app.generate}
              >
                <Sparkles size={17} />
                {app.generating
                  ? `Generando ${app.progress.done}/${app.progress.total}…`
                  : `Generar ${app.selected.length} imágenes`}
              </button>
              {app.generating ? (
                <button className="text-button" onClick={app.stopGeneration}>
                  Detener tras esta imagen
                </button>
              ) : (
                <p>
                  {app.canGenerate
                    ? "Una imagen por partido · consumo de tu API"
                    : "Conecta tu clave de OpenAI para generar."}
                </p>
              )}
              {app.error && <p role="alert">{app.error}</p>}
            </div>
            <SettingsPanel app={app} expanded />
          </Modal>
        </>
      )}
      <Modal
        open={help}
        onClose={() => setHelp(false)}
        title={helpTab ? "Activa tu estudio" : "De la jornada a tu galería"}
      >
        <div className="help-content">
          {helpTab ? (
            <>
              <p>
                Puedes consultar partidos sin claves. Para generar imágenes usa
                una clave temporal en Conectar OpenAI. Con una cuenta puedes
                guardarla cifrada para tus próximas sesiones. Para conectar los
                servicios reales:
              </p>
              <ol>
                <li>
                  Activa el servicio de cuentas y el almacenamiento privado de
                  tu estudio.
                </li>
                <li>
                  Configura las variables del archivo de ejemplo en tu servidor.
                </li>
                <li>
                  Los partidos de ESPN no requieren clave. Si eliges
                  API-Football, configura su clave privada.
                </li>
                <li>
                  Entra en tu cuenta y guarda tu clave de OpenAI en Conectar
                  OpenAI.
                </li>
                <li>
                  Consulta la guía de instalación incluida en el proyecto.
                </li>
              </ol>
              <p>
                Encontrarás todos los pasos en el README del proyecto. Las
                claves privadas se configuran únicamente en el servidor.
              </p>
            </>
          ) : (
            <>
              <p>Todo empieza con un encuentro.</p>
              <ol>
                <li>
                  <strong>Elige tu jornada.</strong> Busca por fecha, equipo o
                  competición y añade partidos de distintos días a tu lista.
                </li>
                <li>
                  <strong>Dale tu estilo.</strong> Ajusta el diseño, el formato
                  y el prompt maestro.
                </li>
                <li>
                  <strong>Crea y guarda.</strong> Cada imagen aparece en tu
                  galería, lista para descargar.
                </li>
              </ol>
              <p>
                {config.demo
                  ? "Las imágenes se generan realmente con OpenAI y se guardan en este navegador. La fuente de los partidos se indica junto a la jornada."
                  : "Tu galería está vinculada a tu cuenta. La generación utiliza tu configuración de OpenAI."}
              </p>
            </>
          )}
          <button
            className="primary"
            onClick={() => {
              setHelp(false);
              setHelpTab(false);
            }}
          >
            Entendido
            <Check size={16} />
          </button>
        </div>
      </Modal>
      {app.message && (
        <div className="toast" role="status">
          <span>
            <Check size={16} />
          </span>
          {app.message}
          <button
            className="icon-button"
            onClick={() => app.setMessage("")}
            aria-label="Cerrar notificación"
          >
            <X size={15} />
          </button>
        </div>
      )}
      {app.generating && (
        <div className="generation-notice" role="status">
          <LoaderCircle className="spin" size={18} />
          <div>
            <strong>Tu diseño está tomando forma</strong>
            <span>
              {app.progress.done} de {app.progress.total} completados. Mantén
              esta ventana abierta.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
