# Activar cuentas propias en Vercel

Matchday utiliza su propio esquema PostgreSQL para usuarios, contraseñas, sesiones, claves de OpenAI, preferencias y galería. Este modo no necesita Supabase Auth. La base puede estar alojada en un proveedor conectado a Vercel; sigue siendo una base dedicada a tu proyecto. Subir el código no crea ni contrata esos servicios automáticamente.

## 1. Conectar PostgreSQL y crear las tablas

En tu proyecto de Vercel, abre **Storage → Create Database** y conecta una base PostgreSQL desde Marketplace, por ejemplo Neon. Elige la región y el plan antes de confirmar. También puedes usar una base PostgreSQL existente.

En **Settings → Environment Variables**, configura `DATABASE_URL` con la conexión privada proporcionada por el proveedor. Usa su URL con pool de conexiones y TLS. Si la integración crea la variable con otro nombre, añade `DATABASE_URL` con el valor correspondiente. No compartas esa URL: contiene la contraseña de la base de datos.

Si tu integración ya proporciona `POSTGRES_URL`, la aplicación y `npm run db:migrate` la usan directamente; no necesitas copiar ni revelar la conexión. `DATABASE_URL` tiene prioridad cuando existen ambas. Una base PostgreSQL alojada en Supabase también sirve para este modo de cuentas propias, sin Supabase Auth. La migración activa RLS sin políticas públicas y revoca los permisos de `anon` y `authenticated` sobre las siete tablas para impedir el acceso mediante su API pública. Ejecútala con el propietario de la base.

En el editor SQL del proveedor, ejecuta `db/migrations/001_accounts.sql`. Crea únicamente tablas con el prefijo `matchday_`, puede ejecutarse de nuevo y no borra datos. Las migraciones antiguas de `supabase/` no corresponden a este modo.

Alternativa desde tu ordenador: instala las dependencias, guarda `DATABASE_URL` en `.env.local` y ejecuta `npm run db:migrate`. Ese comando carga el archivo privado y no imprime la conexión. La compilación no ejecuta migraciones ni necesita conectarse a la base.

Las conexiones remotas verifican el certificado y el nombre del servidor. Para los dominios oficiales de PostgreSQL y del pool de Supabase se incluye su certificado raíz público, tomado de la misma dirección que utiliza su panel. Para otro proveedor con una CA privada, configura `DATABASE_CA_CERT` con el PEM completo. No desactives la validación TLS para resolver errores de certificados. Solo las conexiones locales de desarrollo usan HTTP/TCP sin TLS. Si Preview comparte la base de Production, ambos deben usar el mismo secreto de cifrado; con bases separadas, usa secretos distintos. No pruebes a modificar datos de usuarios reales desde Preview.

## 2. Configurar las variables privadas

Genera un secreto una sola vez en tu terminal:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Configura en Vercel:

| Variable                    | Valor                                                         |
| --------------------------- | ------------------------------------------------------------- |
| `AUTH_PROVIDER`             | `postgres`                                                    |
| `DATABASE_URL`              | Conexión privada de PostgreSQL                                |
| `API_KEY_ENCRYPTION_SECRET` | El secreto de 64 caracteres hexadecimales generado            |
| `APP_URL`                   | Origen HTTPS exacto de tu aplicación, sin ruta ni barra final |
| `IMAGE_PROVIDER`            | `openai`                                                      |
| `FOOTBALL_PROVIDER`         | `espn`                                                        |
| `DAILY_GENERATION_LIMIT`    | Opcional; 100 por usuario y día UTC por defecto               |

Conserva el mismo secreto de cifrado entre despliegues y haz una copia privada: si lo pierdes o sustituyes, cada usuario tendrá que volver a guardar su clave. No uses el prefijo `NEXT_PUBLIC_` para conexiones, claves privadas o secretos.

Cuando existe `DATABASE_URL` o `AUTH_PROVIDER=postgres`, las cuentas no utilizan las variables antiguas de Supabase ni `NEXT_PUBLIC_DEMO_MODE`. Sin las dos variables de PostgreSQL, la app conserva el modo local anterior; para mostrar el acceso pendiente puedes fijar `AUTH_PROVIDER=postgres` sin conexión.

## 3. Conectar la galería privada

En **Storage**, crea o conecta un almacén **Vercel Blob** con acceso **Private**. Al conectarlo al proyecto se añade `BLOB_READ_WRITE_TOKEN`. Comprueba que esté disponible en el entorno del despliegue.

PostgreSQL conserva la información de cada imagen y Blob conserva el PNG. `/api/gallery/[id]/file` comprueba la sesión y el propietario antes de entregar el archivo. El navegador no recibe el token de Blob ni una URL pública de la imagen. Sin este almacén, las cuentas y las claves funcionan, pero la generación indica que falta conectar el almacenamiento antes de gastar saldo.

## 4. Desplegar y comprobar

Aplica las variables al entorno **Production** y, si pruebas una rama, a **Preview**. Utiliza una base de pruebas separada para Preview. `APP_URL` debe coincidir con el dominio del entorno: no fijes el dominio de producción para una vista previa en otro host.

Vercel utiliza el `vercel.json` incluido, con `npm run build:next`. Tras configurar las variables, utiliza **Redeploy** o despliega el commit con estos cambios.

1. Crea una cuenta con correo y contraseña de al menos ocho caracteres. El registro inicia la sesión directamente.
2. Guarda tu clave en **Conectar OpenAI**, o introdúcela y genera: se guardará cifrada en tu cuenta.
3. Cierra sesión y vuelve a entrar. Verás la terminación de la clave y podrás usarla sin volver a pegarla.
4. Con otra cuenta, comprueba que no aparecen la clave ni las imágenes de la primera.
5. En móvil, abre el generador desde la barra inferior. El botón de generar aparece al principio del panel.
6. Selecciona partidos de hoy y mañana. La lista conserva las fechas. **Seleccionar N** añade o quita solo los partidos de la vista actual.

## Sesiones, claves y límites

Las contraseñas se guardan como hashes scrypt con sal aleatoria (N=131072, r=8, p=1). La sesión usa un token aleatorio de 256 bits en una cookie HttpOnly, Secure en producción y SameSite=Lax. La base guarda solo el hash del token. La sesión caduca a los siete días y cerrar sesión la revoca. Los límites de intentos de acceso se comparten entre todas las instancias mediante la base. Un cambio de cuenta limpia la selección, referencias y claves temporales en memoria.

Las claves de OpenAI se cifran con AES-256-GCM y se vinculan al propietario. El navegador recibe únicamente estado y terminación. El administrador que controla el backend y el secreto puede descifrarlas: no es cifrado de extremo a extremo. No hay verificación ni recuperación por correo, ni migración automática de contraseñas de Supabase en esta versión. Las cuentas de esta base se registran de nuevo.

La selección admite más de cuatro partidos, cada uno con su fecha. Cada petición vuelve a consultar el encuentro en la fuente de fútbol. Una generación correcta sale de la lista; las pendientes y fallidas permanecen. Puedes detener el lote tras la imagen en curso. Debes mantener la pestaña abierta: no es una cola que siga tras cerrar el navegador. La selección se conserva mientras usas el estudio y se vacía al recargar o cambiar de cuenta.

En **Tu lista → Editar**, cada partido tiene su propio prompt, título y referencias. Los campos sin personalizar heredan los ajustes generales actuales; un título personalizado vacío omite el titular automático. Puedes excluir las referencias generales. El límite de cuatro archivos y 4 MB se aplica al conjunto efectivo de cada partido. La cola valida todos los diseños antes de hacer peticiones y envía los archivos de cada encuentro por separado. Los archivos de referencia y los borradores se mantienen solo en memoria; la galería guarda el prompt y los ajustes finales de las imágenes generadas.

El límite diario es independiente de la cantidad seleccionable. Las referencias siguen limitadas a cuatro archivos y 4 MB en total para dejar margen al formulario dentro del límite de solicitud de Vercel. El adaptador OpenAI espera hasta 240 segundos y la ruta permite 300. Las pruebas no hacen llamadas facturables; acceso al modelo, saldo y permisos requieren una generación con tu cuenta.

## Pruebas

```powershell
npm test
npm run test:postgres
npm run test:accounts
npm run test:creative
npm run typecheck
npm run build:next
```

`test:postgres` aplica la migración sobre PostgreSQL embebido PGlite y comprueba registro, acceso, contraseñas, sesiones, caducidad, revocación, cifrado, aislamiento y límites. No se conecta a producción. Es necesaria una comprobación con tu base y Blob conectados para validar la configuración real de Vercel.

Fuentes: [almacenamiento de Vercel](https://vercel.com/docs/storage), [Blob privado](https://vercel.com/docs/vercel-blob/private-storage), [límites de funciones](https://vercel.com/docs/functions/limitations), [contraseñas y scrypt](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
