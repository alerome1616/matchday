"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="page-loading">
      <h1>El estudio necesita un momento.</h1>
      <p>No se pudo cargar esta pantalla.</p>
      <button className="primary" onClick={reset}>
        Volver a intentar
      </button>
    </main>
  );
}
