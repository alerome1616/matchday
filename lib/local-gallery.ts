"use client";
import type { GalleryImage } from "./types";
type Stored = { id: string; image: Omit<GalleryImage, "url">; blob: Blob };
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("matchday-gallery", 1);
    req.onupgradeneeded = () =>
      req.result.createObjectStore("images", { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new Error("No se pudo abrir la galería local."));
  });
}
export async function listLocalImages(): Promise<GalleryImage[]> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const request = db
        .transaction("images", "readonly")
        .objectStore("images")
        .getAll();
      request.onsuccess = () =>
        resolve(
          (request.result as Stored[])
            .map((r) => ({ ...r.image, url: URL.createObjectURL(r.blob) }))
            .sort((a, b) => b.created_at.localeCompare(a.created_at)),
        );
      request.onerror = () =>
        reject(new Error("No se pudo recuperar la galería local."));
    });
  } finally {
    db.close();
  }
}
export async function saveLocalImage(image: GalleryImage, blob: Blob) {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("images", "readwrite");
      const { url: _, ...metadata } = image;
      tx.objectStore("images").put({ id: image.id, image: metadata, blob });
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(
          new Error(
            "No hay espacio para guardar el diseño. Descárgalo antes de cerrar.",
          ),
        );
      tx.onabort = () =>
        reject(
          new Error(
            "No se pudo guardar el diseño. Descárgalo antes de cerrar.",
          ),
        );
    });
  } finally {
    db.close();
  }
}
export async function deleteLocalImage(id: string) {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("images", "readwrite");
      tx.objectStore("images").delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(new Error("No se pudo eliminar el diseño local."));
    });
  } finally {
    db.close();
  }
}
