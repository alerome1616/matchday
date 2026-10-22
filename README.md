# Matchday Studio

Estudio web con Next.js, React y TypeScript para convertir partidos reales en imágenes originales mediante OpenAI. Interfaz blanca y verde oscuro, partidos por fecha y horario de Madrid.

## Vercel: cuentas propias y selección de varios días

La aplicación puede gestionar usuarios y sesiones en PostgreSQL propio. Sigue [Activar cuentas propias en Vercel](docs/VERCEL-POSTGRES.md): conecta `DATABASE_URL`, aplica `db/migrations/001_accounts.sql`, configura `AUTH_PROVIDER=postgres` y un `API_KEY_ENCRYPTION_SECRET` privado. Para guardar imágenes, conecta Vercel Blob privado mediante `BLOB_READ_WRITE_TOKEN`. No se necesita Supabase Auth en este modo. Subir el código no crea servicios ni configura credenciales automáticamente.

Cada usuario conserva su clave de OpenAI cifrada entre sesiones. Puede guardarla desde el editor; al generar con una clave introducida y sesión iniciada también se guarda automáticamente. El navegador recibe solo el estado y los últimos cuatro caracteres. El backend valida la sesión y la cookie es HttpOnly.

Puedes seleccionar más de cuatro partidos de varias fechas. Cambiar de día o filtro conserva la lista; quitar los partidos de la vista actual conserva los demás días. Cada imagen se genera por separado con la fecha de su encuentro. Puedes detener el lote después de la imagen en curso. En móvil, **Abrir generador** permanece en la barra inferior y abre un panel con acceso directo a generar. La selección se mantiene mientras usas el estudio y se vacía al recargar o cambiar de cuenta.

## Empezar

En **Tu lista**, pulsa **Editar** junto a cada partido para asignarle un prompt maestro, un título y referencias exclusivas. Puedes sumar las referencias generales o desactivarlas para ese encuentro. Los ajustes se mantienen al navegar entre jornadas y se vacían al quitar el partido, recargar o cambiar de cuenta. La vista previa y la galería conservan el prompt y título realmente utilizados. Cada solicitud admite cuatro referencias y 4 MB en total, contando las generales.

Las integraciones de Vercel que proporcionan `POSTGRES_URL` se detectan automáticamente como PostgreSQL. `DATABASE_URL` tiene prioridad. La migración también protege las tablas frente a los roles públicos de Supabase; las cuentas siguen gestionadas por la aplicación.

Node.js 22.13+ y npm.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

En PowerShell: Copy-Item .env.example .env.local. Abre http://localhost:3000.

Los partidos se consultan en ESPN por defecto. En el editor, elige una escena, un titular, el formato y el prompt. Adjunta imágenes, asígnales una función y selecciona partidos de uno o varios días. Abre **Conectar OpenAI** e introduce una clave de API temporal o utiliza la guardada en tu cuenta. Pulsa **Generar con OpenAI**. No se generan carteles SVG ni resultados simulados. Sin clave, la generación queda deshabilitada.

## Dos modos de almacenamiento

### Galería local (por defecto)

NEXT_PUBLIC_DEMO_MODE=true mantiene la consulta de partidos sin login de Supabase y guarda las imágenes reales en IndexedDB del navegador. Esta variable conserva su nombre por compatibilidad: **no activa una simulación de generación**. La clave temporal solo vive en memoria de React; no se escribe en localStorage, IndexedDB, cookies, archivos, preferencias, galería ni registros de la aplicación. Se envía por HTTPS al servidor de la app y de ahí al endpoint fijo de OpenAI. En localhost el transporte de desarrollo es HTTP. Al recargar se olvida la clave y debes introducirla otra vez. Las referencias permanecen en memoria durante la edición; no se guardan como archivos públicos.

Cada generación usa el saldo y los límites de la clave que introduce el usuario. La API se configura en platform.openai.com; la app no usa cookies ni sesiones de ChatGPT, no abre el chat ni extrae sus credenciales. La clave temporal se usa exclusivamente en la solicitud del usuario, nunca como clave compartida de servidor. No existe reintento automático de generación. Mantén la ventana abierta hasta que termine; si pierdes la respuesta, el proveedor puede haber generado y facturado la imagen aunque la app no la haya recibido.

La galería local persiste en ese navegador y dispositivo. Si borras los datos del sitio, se pierde. Un error de cuota de almacenamiento conserva la imagen en memoria y permite descargarla antes de cerrar. Las muestras SVG de versiones anteriores se mantienen identificadas como demo; no se crean nuevas.

### Galería Supabase por usuario

1. Crea un proyecto Supabase.
2. Aplica las tres migraciones de `supabase/migrations/` en orden: `202610210001_initial.sql`, `202610210002_reference_generation.sql` y `202610210003_user_api_credentials.sql`. Si ya aplicaste alguna, ejecuta solo las que faltan. También puedes usar supabase link y supabase db push.
3. Configura Email/Password y las URLs autorizadas de confirmación: http://localhost:3000/auth/callback y la correspondiente de tu dominio.
4. Configura las variables del ejemplo, pon NEXT_PUBLIC_DEMO_MODE=false e IMAGE_PROVIDER=openai.
5. Configura `SUPABASE_SECRET_KEY` y `API_KEY_ENCRYPTION_SECRET` para activar el guardado cifrado de claves personales. Regístrate, confirma el correo, inicia sesión y pulsa **Guardar clave en mi cuenta** en Conectar OpenAI. La clave estará disponible en tus siguientes sesiones y dispositivos. Puedes sustituirla o eliminarla. `OPENAI_API_KEY` sigue siendo una alternativa opcional del administrador.

Este modo valida al usuario, reserva cada generación en PostgreSQL con límite de 20 intentos por día UTC y una petición activa por usuario, llama a OpenAI y guarda el PNG en un bucket privado. La galería usa RLS y URLs firmadas de una hora. Las referencias se usan para generar; el registro guarda el prompt utilizado, pero no almacena las imágenes de referencia originales. La galería usa la sesión del usuario; la clave Secret del backend solo se necesita para las credenciales cifradas, una tabla sin permisos de acceso desde el navegador.

La guía [Activar cuentas y claves guardadas](docs/CUENTAS-SUPABASE.md) explica desde cero cómo crear Supabase, configurar el correo y comprobar el inicio de sesión. Las claves se cifran con AES-256-GCM y se vinculan al usuario. Nunca se devuelven completas al navegador. Conserva el secreto de cifrado entre reinicios y haz una copia privada. No hay una migración automática de claves temporales: cada usuario decide guardarla con el botón correspondiente.

## Referencias y dirección creativa

- Hasta 4 imágenes PNG, JPG o WebP, con un máximo de 4 MB en conjunto.
- Validación de tamaño, MIME y firma binaria en servidor. No se aceptan SVG.
- Cada imagen tiene una función: estilo/ambiente, camiseta local, camiseta visitante o composición. Admite una indicación adicional de hasta 500 caracteres.
- Se mantiene el orden de las imágenes en el prompt y en la petición multipart enviada a OpenAI.
- Las referencias de estilo se adaptan a los equipos del encuentro seleccionado. Las referencias de camiseta solicitan preservar sus detalles visibles. La precisión final depende del modelo y del material aportado; una imagen de referencia no garantiza un resultado idéntico.
- Escenas: duelo en estadio, camisetas en interior, historia editorial y una idea personalizada.
- Titular editable, prompt maestro editable, acabado visual y vista previa del prompt final de cada partido.
- Formatos: historia 9:16 (864×1536), cuadrado 1:1 (1024×1024), horizontal 16:9 (1536×864).

El prompt sustituye {EQUIPO_LOCAL}, {EQUIPO_VISITANTE}, {COMPETICION}, {FECHA}, {HORA} y {ESTADIO}. Los datos del encuentro se aportan como contexto y no se imprimen automáticamente como ficha. Se priorizan escenas fotorealistas, prendas con volumen y textura, luz cinematográfica, profundidad y narrativa visual.

## Integración OpenAI

Sin referencias: POST https://api.openai.com/v1/images/generations. Con referencias: POST https://api.openai.com/v1/images/edits, con campos image[] en multipart/form-data. El prompt, modelo, calidad, dimensiones y los archivos reales se envían al proveedor; no se sustituye el resultado por una plantilla. Se solicita PNG y se decodifica b64_json. El timeout es 240 segundos. Las rutas tienen maxDuration=300; el alojamiento debe admitirlo. No se incluye una cola durable.

Modelo configurable: OPENAI_IMAGE_MODEL, por defecto gpt-image-2.5-sunburst. Si lo cambias, comprueba que admita edición con múltiples referencias y las dimensiones personalizadas configuradas. Los errores del proveedor se traducen a mensajes sin devolver respuestas privadas ni claves.

## Variables

| Variable                             | Función                                                                |
| ------------------------------------ | ---------------------------------------------------------------------- |
| NEXT_PUBLIC_DEMO_MODE                | true: galería local; false: auth y galería Supabase                    |
| NEXT_PUBLIC_SUPABASE_URL             | URL pública de Supabase, solo necesaria en modo Supabase               |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Clave pública, con políticas RLS                                       |
| SUPABASE_SECRET_KEY                  | Secret o service_role, solo backend para credenciales cifradas         |
| API_KEY_ENCRYPTION_SECRET            | 64 caracteres hexadecimales aleatorios, privados y persistentes        |
| APP_URL                              | Origen público exacto para validación y vuelta de confirmación         |
| FOOTBALL_PROVIDER                    | espn por defecto, api-football o mock explícito para pruebas           |
| FOOTBALL_API_KEY                     | Clave privada directa API-Sports, para api-football                    |
| IMAGE_PROVIDER                       | openai para generación real del servidor                               |
| OPENAI_API_KEY                       | Clave secreta del servidor; alternativa a la temporal en modo Supabase |
| OPENAI_IMAGE_MODEL                   | Modelo de imagen configurado en servidor                               |

Nunca pongas claves privadas en variables NEXT_PUBLIC_. No hay claves reales en el proyecto. El servidor no utiliza su clave de entorno en la ruta sin auth de generación temporal: esa ruta exige la clave del solicitante. La clave de entorno solo se usa en el flujo autenticado de Supabase. Cambiar variables NEXT_PUBLIC_ exige recompilar.

## Partidos reales

ESPN no requiere clave. Se consultan los días adyacentes y se filtra el inicio real por Europe/Madrid, eliminando duplicados. La interfaz muestra fuente y hora de consulta, enlace a la jornada y actualización manual. No se introducen partidos ficticios ante errores. La cobertura depende del calendario de ESPN; el endpoint público puede cambiar y no garantiza todos los encuentros del mundo. Se conserva API-Football como proveedor alternativo con clave.

## Estructura

```text
app/api/fixtures            Partidos normalizados y metadatos de la fuente
app/api/generate            Generación autenticada, cuotas y persistencia Supabase
app/api/generate-session    Generación con clave temporal y respuesta PNG privada
app/api/gallery             Galería por usuario, paginación y URLs firmadas
app/api/settings            Preferencias por usuario
app/api/account/openai-key   Estado, guardado y eliminación de la clave personal
app/auth/callback           Confirmación PKCE
components/                 Estudio, editor, referencias, escenas y galería
hooks/use-studio.ts         Orquestación de selección, referencias y generación
lib/adapters/               Proveedores de fútbol y generación de imágenes
lib/generation-request.ts   Lectura acotada de multipart y validación de archivos
lib/prompt.ts               Prompt final contextual y funciones de las referencias
lib/creative.ts             Escenas y funciones de las imágenes
lib/local-gallery.ts        Persistencia de PNG en IndexedDB
lib/supabase/               Clientes servidor/navegador
lib/key-cipher.ts            Cifrado autenticado de credenciales por propietario
lib/user-api-key.ts          Acceso a credenciales exclusivo del backend
supabase/migrations/        Tablas, RLS, bucket privado y cuotas
supabase/tests/             Pruebas SQL de aislamiento con rollback
tests/                     Pruebas de lógica, adaptadores y rutas
scripts/, worker/           Compatibilidad opcional con Sites/Vinext
```

## Comprobar y desplegar

```sh
npm test
npm run test:adapters
npm run test:fixtures
npm run test:creative
npm run test:gallery
npm run test:accounts
npm run build
npm start
```

El build principal compila Next.js y Sites/Vinext. Para un servidor Next.js o Vercel, usa npm run build:next. Para Sites/Workers, npm run build:sites. En PowerShell, con el servidor abierto: $env:TEST_HTTP='true'; npm run test:http.

Las pruebas de generación y subida usan respuestas de OpenAI simuladas, nunca una clave real ni solicitudes facturables. Es necesario verificar una generación real con tu cuenta para confirmar acceso al modelo, saldo y límites. La generación con clave temporal y la de servidor usan el mismo adaptador de OpenAI.

Fuentes: [OpenAI Images](https://developers.openai.com/api/docs/guides/image-generation), [OpenAI Images edits](https://developers.openai.com/api/reference/resources/images/methods/edit), [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs), [ESPN](https://www.espn.com/soccer/scoreboard).
