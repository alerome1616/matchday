# Activar cuentas y guardar la clave de OpenAI

El código de registro, inicio y cierre de sesión ya está incluido. Para utilizar cuentas reales necesitas crear tu proyecto de Supabase. Hasta completar estos pasos, la app sigue funcionando con galería local y clave temporal; no inventa cuentas ni guarda contraseñas en el navegador.

## 1. Crear el proyecto

1. Entra en [Supabase](https://supabase.com/dashboard) y crea una cuenta.
2. Pulsa **New project**, elige una organización, nombre y región, y guarda la contraseña de la base de datos en un lugar privado.
3. Espera a que termine la creación.
4. En **Connect** o **Project Settings → API / API Keys**, copia la URL del proyecto y la clave pública **Publishable**. Copia también una clave **Secret** para el backend; en proyectos antiguos se llama `service_role`.

La clave pública y la Secret son distintas. La Secret nunca se pega en la interfaz web ni se publica en el código. Tampoco es la contraseña de la base de datos.

## 2. Crear tablas y almacenamiento

En **SQL Editor → New query**, abre y ejecuta estos archivos del proyecto por orden:

1. `supabase/migrations/202610210001_initial.sql`
2. `supabase/migrations/202610210002_reference_generation.sql`
3. `supabase/migrations/202610210003_user_api_credentials.sql`

Si ya ejecutaste alguna migración, ejecuta únicamente las que faltan. La tercera crea una tabla de credenciales inaccesible directamente desde el navegador, incluso con sesión iniciada. El backend verifica la cuenta antes de guardar o leer su fila. Las imágenes siguen en el bucket privado `match-images` con permisos por usuario.

## 3. Configurar el correo y los enlaces

En **Authentication → Providers / Sign In**, activa **Email** y el registro por correo y contraseña. Mantén la confirmación de correo activada.

En **Authentication → URL Configuration** configura:

- **Site URL:** `http://127.0.0.1:3000`
- **Redirect URLs:** `http://127.0.0.1:3000/auth/callback` y `http://localhost:3000/auth/callback`

Durante una confirmación, abre el correo en el mismo navegador y con la misma dirección local donde creaste la cuenta: el flujo PKCE usa las cookies de ese navegador. No alternes `localhost` y `127.0.0.1` durante ese proceso.

Para una instalación futura, añade su dirección HTTPS y su `/auth/callback`. El correo de prueba de Supabase está restringido a direcciones del equipo del proyecto y tiene límites de envío. Para registrar usuarios con otras direcciones, configura SMTP propio en Authentication siguiendo [la guía de correo de Supabase](https://supabase.com/docs/guides/auth/auth-smtp). Puedes comenzar probando con el correo de tu propia cuenta de Supabase.

## 4. Configurar el archivo privado

Edita `.env.local` en la carpeta desde la que ejecutas la aplicación. No lo incluyas en un ZIP ni lo subas a un repositorio. Si aún no existe, copia `.env.example` a `.env.local`.

```dotenv
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=TU-CLAVE-PUBLICA
SUPABASE_SECRET_KEY=TU-CLAVE-SECRET-DEL-BACKEND
API_KEY_ENCRYPTION_SECRET=TU-SECRETO-DE-64-CARACTERES-HEXADECIMALES
APP_URL=http://127.0.0.1:3000
IMAGE_PROVIDER=openai
FOOTBALL_PROVIDER=espn
```

Genera el secreto de cifrado en la terminal local con:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copia el resultado en `API_KEY_ENCRYPTION_SECRET`. Guárdalo en una copia privada: es necesario para abrir las claves cifradas. Debe ser el mismo entre reinicios y entre instancias. Si lo cambias o lo pierdes, cada usuario deberá volver a guardar su clave de OpenAI; no se recupera desde el cifrado anterior. Una rotación con conservación de las credenciales requiere descifrar y volver a cifrar con ambos secretos mediante un procedimiento aparte.

No hace falta definir `OPENAI_API_KEY`: cada usuario podrá guardar la suya. Si el administrador configura una clave compartida de servidor, también podrá usarse por usuarios autenticados cuando no tengan clave personal. Orden de uso: clave temporal enviada para esa petición, clave guardada del usuario, clave del servidor.

## 5. Reiniciar y probar

Detén el servidor de desarrollo con **Ctrl+C** en su terminal y vuelve a ejecutar:

```powershell
npm run dev
```

Abre `http://127.0.0.1:3000` y sigue esta comprobación:

1. Pulsa **Iniciar sesión → Crea una cuenta**.
2. Introduce correo y contraseña de al menos ocho caracteres.
3. Confirma el correo y entra con tus datos.
4. En **Conectar OpenAI**, pega tu clave de API y pulsa **Guardar clave en mi cuenta**. El campo se vacía y aparece únicamente su terminación.
5. Cierra la sesión y vuelve a entrar: debe aparecer **Clave guardada en tu cuenta** sin pedirla de nuevo.
6. Comprueba con otra cuenta que no aparecen la clave ni la galería de la primera.
7. Puedes sustituir la clave guardando otra o borrarla con **Eliminar clave guardada**. Borrarla aquí no la revoca en OpenAI; para revocarla, utiliza el panel de OpenAI.

Guardar la clave no comprueba saldo, permisos ni acceso al modelo, y no genera imágenes. Una generación sí puede consumir saldo de API. El inicio de sesión de Matchday es independiente del acceso a ChatGPT.

## Protección y comprobaciones

La clave se cifra con AES-256-GCM, un nonce aleatorio por guardado y el identificador de usuario como datos autenticados. Supabase almacena el texto cifrado, los últimos cuatro caracteres y la fecha; nunca el texto completo sin cifrar. El secreto de cifrado se conserva únicamente en el entorno privado del backend. Un administrador con acceso al backend y a ese secreto puede descifrarla; no es cifrado de extremo a extremo.

La ruta `/api/account/openai-key` exige una sesión validada con `getUser()`. `GET` devuelve solo estado y terminación; `PUT` guarda o sustituye; `DELETE` elimina. El usuario propietario se obtiene de la sesión y no se acepta en el cuerpo de la petición. Las respuestas usan `private, no-store`. La aplicación no registra las claves ni las guarda en localStorage o en la galería. El campo temporal vive solo en memoria hasta que se guarda o se recarga.

En producción utiliza HTTPS. El localhost de desarrollo usa HTTP. `APP_URL` debe ser el origen público exacto para validar peticiones y construir los enlaces de vuelta tras confirmar el correo.

Pruebas de código sin claves reales ni peticiones de pago:

```powershell
npm test
npm run test:accounts
npm run test:creative
npm run typecheck
```

Después de aplicar las migraciones, puedes ejecutar `supabase/tests/credentials.sql` en el SQL Editor para comprobar que las credenciales no son accesibles a los roles del navegador. La prueba revierte su transacción.

Documentación: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs), [permisos de filas](https://supabase.com/docs/guides/database/postgres/row-level-security), [tratamiento de claves de OpenAI](https://developers.openai.com/api/reference/overview#authentication).
