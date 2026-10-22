# Generación creativa con referencias

Esta versión retira la creación de carteles SVG de muestra. La interfaz prepara escenas fotorealistas y permite adjuntar imágenes de estilo, composición o camisetas. Cada generación llama a OpenAI realmente; la ausencia de credenciales bloquea la operación.

En el sitio publicado puede usarse una clave temporal, introducida por su propietario. No se conserva ni se incorpora al proyecto descargable. Los PNG se guardan localmente con IndexedDB. Para galería por cuenta y clave de servidor, activa Supabase siguiendo el README.

Las referencias proporcionadas en el chat se han utilizado para entender el objetivo visual; sus archivos no se han publicado ni incluido en el código. Puedes adjuntarlos desde el editor. Las pruebas automatizadas verifican el prompt por función, el envío binario a /images/edits, los límites y tipos de archivo, el rechazo de llamadas sin clave y la devolución de un PNG. Se simula la respuesta de OpenAI en esas pruebas: no equivalen a una generación real, que requiere una clave y saldo.
