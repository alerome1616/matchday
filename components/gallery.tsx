"use client";
import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ImagePlus,
  LoaderCircle,
  RefreshCw,
  Trash2,
} from "lucide-react";
import type { StudioState } from "@/hooks/use-studio";
import type { GalleryImage } from "@/lib/types";
import { styles, formats } from "@/lib/defaults";
import {
  galleryRecords,
  galleryTitle,
  galleryCompetition,
} from "@/lib/gallery-records";
import { Modal } from "./modal";
export function Gallery({ app }: { app: StudioState }) {
  const [detail, setDetail] = useState<GalleryImage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [search, setSearch] = useState("");
  const records = galleryRecords(app.images);
  const visible = records.images.filter((i) =>
    (
      galleryTitle(i) +
      " " +
      galleryCompetition(i) +
      " " +
      (i.settings.headline ?? "")
    )
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">TU ARCHIVO CREATIVO</div>
          <h1>
            Mi galería
            <span className="count-tag">
              {app.images.length}
              {app.hasMore ? "+" : ""}
            </span>
          </h1>
          <p>Tus partidos y tus ideas, en un mismo lugar.</p>
        </div>
        <button className="primary" onClick={() => app.setView("matches")}>
          <ImagePlus size={17} />
          Nuevo diseño
        </button>
      </div>
      <div className="gallery-toolbar">
        <label className="search-box">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, equipo o competición…"
            aria-label="Buscar diseños"
          />
        </label>
        <span>
          {visible.length} diseños{app.config.demo ? " · guardado local" : ""}
        </span>
        {!app.config.demo && (
          <button
            className="secondary"
            onClick={app.refresh}
            disabled={app.galleryLoading}
          >
            <RefreshCw size={15} />
            Actualizar
          </button>
        )}
      </div>
      {records.unreadable > 0 && (
        <p className="gallery-data-warning" role="alert">
          No se han podido leer los datos de {records.unreadable} diseños. Sus
          archivos siguen guardados; los demás se muestran a continuación.
        </p>
      )}
      {app.galleryLoading && app.images.length === 0 ? (
        <div className="empty">
          <LoaderCircle className="spin" />
          <p>Cargando tus diseños…</p>
        </div>
      ) : visible.length ? (
        <div className="gallery-grid">
          {visible.map((i) => (
            <article className="gallery-card" key={i.id}>
              <button
                className="poster-button"
                onClick={() => {
                  setDetail(i);
                  setConfirm(false);
                }}
                aria-label={"Ver diseño de " + galleryTitle(i)}
              >
                <img
                  src={i.url}
                  alt={"Diseño de " + galleryTitle(i)}
                  loading="lazy"
                />
                <span className="poster-type">
                  {formats[i.settings.format]?.ratio ?? "Formato libre"}
                  {i.demo ? " · DEMO" : ""}
                </span>
              </button>
              <div className="gallery-card-info">
                <h3>{galleryTitle(i)}</h3>
                <button
                  className="icon-button"
                  title="Descargar diseño"
                  aria-label={"Descargar " + galleryTitle(i)}
                  onClick={() => app.download(i)}
                >
                  <ArrowDownToLine size={17} />
                </button>
                <p>
                  {galleryCompetition(i)} ·{" "}
                  {styles.find((s) => s.id === i.settings.style)?.name}{" "}
                  <span>
                    · {new Date(i.created_at).toLocaleDateString("es-ES")}
                  </span>
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty gallery-empty">
          <div className="empty-icon">
            <ImagePlus size={32} strokeWidth={1.4} />
          </div>
          <h2>
            {search
              ? "Ningún diseño coincide"
              : "Tu galería empieza con una idea"}
          </h2>
          <p>
            {search
              ? "Prueba con otro título, equipo o competición."
              : "Elige partidos o crea una imagen libre con tu título y tu prompt."}
          </p>
          <button
            className="primary"
            onClick={() => (search ? setSearch("") : app.setView("matches"))}
          >
            {search ? "Limpiar búsqueda" : "Crear un diseño"}
            <ArrowRight size={17} />
          </button>
        </div>
      )}
      {app.hasMore && (
        <button
          className="secondary load-more"
          disabled={app.galleryLoading}
          onClick={app.loadMore}
        >
          {app.galleryLoading ? "Cargando…" : "Ver más diseños"}
        </button>
      )}
      <Modal
        open={!!detail}
        onClose={() => {
          setDetail(null);
          setConfirm(false);
        }}
        title="Tu diseño"
        className="detail-modal"
      >
        {detail && (
          <div className="detail-layout">
            <img src={detail.url} alt={"Diseño de " + galleryTitle(detail)} />
            <div>
              <span className="eyebrow">
                {detail.demo ? "DISEÑO DE DEMOSTRACIÓN" : "DISEÑO GENERADO"}
              </span>
              <h3>{galleryTitle(detail)}</h3>
              <p className="muted">{galleryCompetition(detail)}</p>
              <dl>
                <dt>Estilo</dt>
                <dd>
                  {styles.find((s) => s.id === detail.settings.style)?.name}
                </dd>
                <dt>Formato</dt>
                <dd>
                  {formats[detail.settings.format]?.ratio ?? "Formato libre"}
                </dd>
                <dt>Creado</dt>
                <dd>{new Date(detail.created_at).toLocaleString("es-ES")}</dd>
              </dl>
              <details>
                <summary>Ver prompt utilizado</summary>
                <p className="detail-prompt">{detail.prompt}</p>
              </details>
              <button className="primary" onClick={() => app.download(detail)}>
                <ArrowDownToLine size={16} />
                Descargar {detail.demo ? "SVG" : "PNG"}
              </button>
              {confirm ? (
                <div className="delete-confirm">
                  <p>¿Eliminar este diseño de tu galería?</p>
                  <button
                    className="danger"
                    disabled={deleting}
                    onClick={async () => {
                      setDeleting(true);
                      await app.removeImage(detail.id);
                      setDeleting(false);
                      setConfirm(false);
                      setDetail(null);
                    }}
                  >
                    {deleting ? "Eliminando…" : "Sí, eliminar"}
                  </button>
                  <button
                    className="text-button"
                    onClick={() => setConfirm(false)}
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  className="delete-button"
                  onClick={() => setConfirm(true)}
                >
                  <Trash2 size={15} />
                  Eliminar diseño
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
