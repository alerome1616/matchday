# Corrección de la jornada

La publicación inicial utilizaba seis encuentros sintéticos. El modo de demostración de imágenes también forzaba el proveedor de fútbol a mock y por eso cambiar la fecha repetía los mismos emparejamientos.

Ahora FOOTBALL_PROVIDER=espn es el valor predeterminado, independiente de la demo de imágenes. La consulta de ESPN no necesita clave. La respuesta se normaliza con equipos local/visitante, estadio, competición, estado y resultado. La app consulta días adyacentes para compensar la fecha de emisión del proveedor y filtra por el inicio real en Europe/Madrid, con deduplicación. API-Football también filtra por el día local solicitado.

La interfaz identifica la fuente, la fecha consultada y la hora de actualización, con enlace a la jornada y botón para actualizar. Al cambiar de día se vacían inmediatamente los resultados anteriores. Un error o una jornada vacía nunca introduce partidos de muestra. Solo FOOTBALL_PROVIDER=mock habilita explícitamente encuentros ficticios.

Se añadieron regresiones para el cambio de día UTC/Madrid, horario de invierno y cambio de hora, orden local/visitante, deduplicación, errores del proveedor y la independencia entre los modos demo y fútbol. La cobertura corresponde al calendario disponible en ESPN; no es una garantía de todos los partidos del mundo. Su endpoint público puede cambiar. Se conserva API-Football como proveedor alternativo con clave.
