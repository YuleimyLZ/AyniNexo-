# AyniNexo Fase 3 desde el navegador

Usa la rama `ayni-nexo/fase-3` y el proyecto Supabase de Fase 2. Los pasos dejan el Preview protegido y habilitan Gemini para las cuentas que autorices en el piloto.

## 1. Aplica la migración incremental

1. Abre [20261127000100_fase_3_ia.sql](../supabase/migrations/20261127000100_fase_3_ia.sql) en GitHub en la rama de Fase 3 y pulsa **Raw**.
2. En Supabase Dashboard abre **SQL Editor → New query**. Pega el archivo completo y pulsa **Run** una vez. Fase 2 es un prerrequisito y ya está aplicada en el proyecto actual.
3. Autoriza cada cuenta después de verificar que pertenece a una persona mayor de edad, que participa desde Perú y que acepta el piloto. Ve a **Authentication → Users**, copia el **User UID** de la cuenta confirmada y ejecuta esta consulta en **SQL Editor**. Incluye la cuenta Owner si usará el extractor.

```sql
insert into ayni_private.ai_pilot_members (user_id, region, adult_verified, authorized_until)
values ('REEMPLAZA_POR_USER_UID'::uuid, 'PE', true, now() + interval '30 days')
on conflict (user_id) do update
set region = excluded.region,
    adult_verified = excluded.adult_verified,
    authorized_until = excluded.authorized_until;
```

Puedes ajustar los 30 días. Para retirar acceso, actualiza `authorized_until` a `now()` para esa fila. La membresía del piloto es independiente del rol Owner.

## 2. Configura el Preview protegido de Vercel

1. En **Settings → Environments** confirma que la rama de producción sigue siendo la que ya usas. En **Settings → Deployment Protection**, habilita **Vercel Authentication** con **Standard Protection** para Preview. Otorga acceso a las cuentas del piloto mediante los controles de acceso de Vercel.
2. En **Settings → Environment Variables**, conserva `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` en **Preview**. Si están limitadas a una rama, agrega la Fase 3 o asigna las mismas dos variables a sus builds.
3. Para permitir nuevos builds de ambas fases, abre **Settings → Build and Deployment → Ignored Build Step**, selecciona **Custom** y guarda este comando. Vercel interpreta `exit 0` como omitir el build.

```sh
case "$VERCEL_GIT_COMMIT_REF" in
  ayni-nexo/fase-2|ayni-nexo/fase-3) exit 1 ;;
  *) exit 0 ;;
esac
```

4. Para el primer build, abre **Deployments → ⋯ → Create Deployment**, elige `ayni-nexo/fase-3` como referencia y pulsa **Create Deployment**. Verifica que su entorno sea **Preview**. Si un deploy aparece como **Canceled** por el filtro anterior, abre su menú **Redeploy** tras guardar el filtro.
5. En el deployment listo, abre **Domains** y copia la URL de la rama que Vercel mantiene entre commits. Suele contener `-git-` y el nombre de la rama. Abre esa URL en una ventana privada para comprobar que pide autenticación de Vercel.

[Vercel Authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication) · [Ignored Build Step](https://vercel.com/docs/project-configuration/project-settings#ignored-build-step) · [Deploy manual por referencia](https://vercel.com/changelog/manually-create-deployments-by-commit-or-branch-in-the-dashboard) · [URLs generadas](https://vercel.com/docs/deployments/generated-urls)

## 3. Configura Auth en la URL estable

1. En Supabase Dashboard abre **Authentication → URL Configuration → Redirect URLs**, y agrega `https://<dominio-estable>/sesion` y `https://<dominio-estable>/sesion?modo=actualizar`. Conserva las entradas existentes que utilicen otras vistas.
2. Si **Site URL** ya corresponde a un dominio estable que usas para el acceso principal, mantenlo. Si sigue apuntando a un deployment efímero y el Preview será tu entrada predeterminada durante el piloto, configura su origen estable como **Site URL**.
3. Prueba registro o recuperación desde la URL estable. Abre el correo en el mismo navegador y origen para conservar el verificador PKCE. Verifica que **Email** y **Confirm email** continúan activos. El SMTP integrado de Supabase limita los destinatarios. Para las pruebas iniciales, utiliza cuentas confirmadas ya disponibles y revisa el alcance del correo integrado antes de invitar participantes.

[Redirecciones de Supabase Auth](https://supabase.com/docs/guides/auth/redirect-urls) · [Flujo PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow) · [SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

## 4. Despliega las tres Edge Functions

1. En GitHub abre cada archivo de esta tabla en la rama de Fase 3 y pulsa **Raw**. Cada archivo está preparado para pegarse completo como `index.ts`.

| Nombre de función | Archivo para el editor |
| --- | --- |
| `match-opportunities` | [match-opportunities.ts](../supabase/dashboard/match-opportunities.ts) |
| `extract-opportunity` | [extract-opportunity.ts](../supabase/dashboard/extract-opportunity.ts) |
| `generate-roadmap` | [generate-roadmap.ts](../supabase/dashboard/generate-roadmap.ts) |

2. En Supabase Dashboard abre **Edge Functions → Deploy a new function → Via Editor**. Selecciona una plantilla básica, asigna el nombre exacto de la tabla, sustituye el contenido de `index.ts` por el archivo correspondiente y pulsa **Deploy function**. Para una función que ya existe, edita su código con el mismo archivo y vuelve a desplegarla.
3. En **Details** de cada función desactiva **Verify JWT with legacy secret** y guarda el ajuste. La función exige un bearer token en cada POST y lo verifica con Supabase Auth. Esto permite tokens de proyectos con claves de firma nuevas y respuestas CORS a preflight. La opción corresponde a `verify_jwt = false` en [supabase/config.toml](../supabase/config.toml).
4. Abre **Edge Functions → Secrets**. Usa el `GEMINI_API_KEY` que ya está guardado. Define los siguientes valores y reemplaza el marcador de origen por la URL estable de Preview, sin barra final.

| Variable | Valor de arranque |
| --- | --- |
| `GEMINI_MODEL` | `gemini-3.1-flash-lite` |
| `AYNI_AI_ORIGINS` | `https://<dominio-estable>` |
| `AYNI_AI_STUDENT_DAILY` | `5`, compartidas por conversación y rutas |
| `AYNI_AI_OWNER_DAILY` | `10` extracciones |
| `AYNI_AI_GLOBAL_DAILY` | `20` llamadas al proveedor |
| `AYNI_AI_GLOBAL_MINUTE` | `3` llamadas al proveedor |
| `AYNI_AI_ENABLED` | `true`, tras los controles del siguiente paso |

5. En Google AI Studio comprueba **Rate limits** para el proyecto asociado al secreto y confirma que tiene **Free Tier** y que Flash-Lite está disponible para él. Ajusta los límites si su cuota efectiva es menor. Conserva el proyecto de Google sin Cloud Billing. Configura `AYNI_AI_ENABLED=false` para pausar Gemini mientras revisas el acceso o las cuotas.

El runtime toma `SUPABASE_URL` y las claves de API que Supabase inyecta por defecto. Admite las claves publicables y secretas actuales y las claves JWT anteriores. El servicio gratuito de Gemini permite que Google use entradas y salidas para mejorar productos. El piloto de AyniNexo está limitado a adultos autorizados en Perú. Antes de una apertura pública, revisa los términos para aplicaciones accesibles a menores y para otras regiones, así como la cobertura de las verificaciones.

[Editor de Supabase](https://supabase.com/docs/guides/functions/quickstart-dashboard) · [Autenticación de Edge Functions](https://supabase.com/docs/guides/functions/auth) · [Cuotas de Gemini](https://aistudio.google.com/docs/rate-limits) · [Términos de Gemini](https://aistudio.google.com/docs/terms) · [Regiones disponibles](https://aistudio.google.com/docs/available-regions)

## 5. Comprueba una llamada real a Gemini

1. Entra desde la URL estable, primero con tu acceso de Vercel y luego con una cuenta Supabase autorizada para el piloto.
2. Abre **Mi Nexo IA**, elige si quieres usar el perfil guardado y envía «Quiero investigar sobre inteligencia artificial en el extranjero». Espera **Asistencia de Gemini** y comprueba que los enlaces y fechas coinciden con las fichas del catálogo.
3. Envía «¿Cuál de las dos se adapta mejor a mí?». Revisa la comparación y despliega **Elegibilidad y brechas**. Con ETH y CERN, los años académicos registrados para revisión manual deben aparecer como **Por confirmar**.
4. Guarda una oportunidad y elige **Generar mi ruta**. Selecciona un horizonte, genera el plan y verifica el origen en **Mi ruta**. Usa una convocatoria sin ruta previa si quieres probar generación, porque una ruta guardada conserva su progreso.
5. Si aparece **Orientación por reglas**, lee la causa mostrada por el chat. Para revisar un error, abre **Edge Functions → Logs** de la función correspondiente y comprueba el código HTTP. Si el navegador bloquea la solicitud, verifica que el origen visible sea exactamente uno de `AYNI_AI_ORIGINS`.

## 6. Prueba el extractor con KAUST

1. Con tu cuenta Owner autorizada, abre **Administración → Registrar oportunidad → Completar con IA**.
2. Pega la [URL oficial de KAUST](https://admissions.kaust.edu.sa/study/internships) en **Enlace oficial para la extracción**. Abre esa página y copia un fragmento de texto del programa VSRP con los requisitos y beneficios. Omite formularios de contacto, nombres, correos, teléfonos y datos privados.
3. Pega el fragmento en **Texto público de la convocatoria**, marca la confirmación y pulsa **Extraer información con IA**. El extractor procesa el texto que pegaste.
4. Abre **Ver fragmentos de la fuente** y **Campos y requisitos por verificar**. Contrasta los resultados y edita el formulario. El campo de fecha límite queda vacío si el texto solo indica postulación durante todo el año. Los años de carrera se verifican manualmente.
5. Para esta prueba, cierra el editor sin pulsar **Publicar oportunidad**. El mismo flujo aparece al abrir **Revisar aporte** sobre un aporte pendiente o en revisión. Su enlace se prellena y puedes pegar un extracto contrastado con la fuente.
