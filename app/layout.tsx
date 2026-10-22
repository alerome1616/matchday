import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Matchday Studio · El fútbol, a tu manera",
  description:
    "Tu estudio creativo para convertir partidos de fútbol en imágenes memorables.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
