# Validación de la versión creativa

- 5 pruebas básicas de prompt, fechas, validación, SVG legado y formatos.
- 2 pruebas de adaptadores de fútbol y OpenAI con respuestas simuladas.
- 5 pruebas de proveedor real, día local de Madrid, cambio de hora, duplicados y errores.
- 6 pruebas creativas: referencias por función, preservación de prompts personalizados, validación de imágenes, archivos binarios multipart, ruta de edición de OpenAI y generación con clave temporal.
- 1 prueba de persistencia y recuperación exacta del PNG en IndexedDB, con un entorno de base de datos simulado.
- 3 pruebas HTTP con el servidor local: contrato de partidos reales, ausencia de secretos, validación, rechazo de origen externo y ruta 404.

Las pruebas del proveedor OpenAI devuelven un PNG de prueba mediante una respuesta simulada. No se ha usado una clave real ni se ha hecho una generación facturable. La calidad visual y el acceso al modelo requieren una generación con la cuenta del usuario.

Comprobación de interfaz: se adjuntaron las dos imágenes facilitadas en el chat, se asignaron funciones de estilo y composición, se seleccionó Real Madrid contra RB Leipzig y se comprobó el prompt final con los equipos del partido y ambas referencias en el orden correcto. La generación se mantiene deshabilitada hasta introducir una clave válida o conectar el servidor autenticado. Los archivos de referencia no se han incluido en el repositorio.

La integración de Supabase requiere aplicar las migraciones y configurar credenciales del proyecto del usuario. Se incluye una prueba SQL de aislamiento con rollback para un proyecto de desarrollo.
