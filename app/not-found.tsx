import Link from "next/link";
export default function NotFound() {
  return (
    <main className="page-loading">
      <h1>Este partido se juega en otra página.</h1>
      <p>No encontramos lo que buscas.</p>
      <Link className="primary" href="/">
        Volver al estudio
      </Link>
    </main>
  );
}
