# Configurar Supabase desde el navegador

Usa el proyecto **AyniNexo** que ya creaste. Estos pasos se realizan en GitHub, Supabase Dashboard y Codex Web.

## 1. Instala el esquema

1. En GitHub, abre la rama `ayni-nexo/fase-2` y el archivo [20261126000100_fase_2.sql](../supabase/migrations/20261126000100_fase_2.sql).
2. Pulsa **Raw** y copia el archivo completo, desde `begin;` hasta `commit;`.
3. En Supabase Dashboard, selecciona el proyecto **AyniNexo**. En la barra lateral abre **SQL Editor → New query**.
4. Pega el contenido y pulsa **Run**. Es una sola migración y se ejecuta una vez. Si aparece un error, conserva el mensaje y revisa la consulta antes de repetirla.
5. Ve a **Table Editor** y selecciona el esquema `public`. Busca `profiles`, `opportunities`, `opportunity_requirements`, `submissions`, `saved_opportunities`, `roadmaps`, `roadmap_actions`, `user_roles` y `moderation_events`. El catálogo empieza vacío.
6. Verifica RLS con una consulta nueva en **SQL Editor**. Las nueve filas deben mostrar `true`. La segunda consulta enumera las políticas y los roles a los que se aplican.

```sql
select relname, relrowsecurity as rls_activo
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in (
    'profiles', 'opportunities', 'opportunity_requirements', 'submissions',
    'saved_opportunities', 'roadmaps', 'roadmap_actions', 'user_roles', 'moderation_events'
  )
order by relname;

select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and policyname like 'ayni_%'
order by tablename, policyname;
```

SQL Editor ejecuta como rol administrativo. Para comprobar las restricciones desde la perspectiva de un estudiante, usa la aplicación con una cuenta Student y revisa los resultados de las pruebas bajo roles restringidos. [Migraciones y comprobaciones](migraciones.md)

## 2. Carga la conexión en Codex Web

1. En Supabase Dashboard, abre **Connect** en la parte superior del proyecto. Copia **Project URL** y **Publishable Key**. La URL tiene la forma `https://<referencia>.supabase.co` y la clave empieza por `sb_publishable_`. También puedes localizar la clave en **Settings → API Keys**. [Guía de claves de Supabase](https://supabase.com/docs/guides/getting-started/api-keys)
2. En Codex Web, abre la configuración del entorno Cloud de AyniNexo con **Edit Environment** y entra en **Environment variables**. Añade estas dos variables, una por fila.

   | Nombre | Valor que copias de Supabase |
   | --- | --- |
   | `VITE_SUPABASE_URL` | Project URL |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable Key |

3. Aplica el cambio al chat cuando el editor ofrezca **Apply to this chat**. Si solo permite guardar la configuración del entorno, inicia una tarea con el entorno guardado y selecciona la rama `ayni-nexo/fase-2`. En los entornos que solicitan una referencia del Vault para variables, introduce los dos valores en la configuración y vincúlalos a los mismos nombres.
4. Para ver la aplicación desde Codex Web, agrega el puerto `5173` en **Edit Environment → HTTP Previews** y aplica el cambio. El entorno de esta tarea reportó solo el puerto SSH. La URL HTTP autenticada aparece al habilitar el puerto y servir la aplicación. Si la opción HTTP Previews no aparece, puedes pedir que se compruebe la app en el Chrome del entorno Cloud. [Guía de Codex Cloud](https://help.openai.com/en/articles/20001545-using-codex-cloud)
5. En el chat de Codex pide que arranque o reinicie AyniNexo desde la rama de la Fase 2 en el puerto `5173` y que abra su vista HTTP. Si se va a comprobar la API desde la máquina de Codex y el acceso a Internet está restringido, agrega el nombre de host exacto de tu Project URL a los dominios permitidos del entorno.
6. Abre **Explorar**. La conexión está lista cuando aparece el catálogo vacío con el mensaje **Tu próxima oportunidad empieza aquí** o aparecen convocatorias ya publicadas. **Conexión pendiente** indica variables ausentes. **No pudimos cargar el catálogo** indica que la app intentó conectar. Revisa URL, clave, migración y acceso al host.

Los nombres con prefijo `VITE_` se incluyen en el frontend. Úsalos para la URL y la clave publicable. Conserva la Secret Key, la clave `service_role`, las credenciales de PostgreSQL y las claves de IA fuera de esos campos, del chat y de GitHub.

## 3. Configura correo y redirecciones

1. Copia el origen de tu vista HTTP de Codex, desde `https://` hasta el dominio, sin una ruta final. En **Supabase Dashboard → Authentication → URL Configuration**, indica ese origen en **Site URL** durante esta prueba.
2. En **Redirect URLs → Add URL**, añade una entrada para cada ruta con ese origen.
   - `https://<dominio-de-la-vista>/sesion`
   - `https://<dominio-de-la-vista>/sesion?modo=actualizar`
3. En **Authentication → Sign In / Providers → Email**, habilita el proveedor Email y conserva **Confirm email** activado. Verifica que el registro de nuevos usuarios esté permitido en la configuración de Authentication.
4. Completa la confirmación de cuenta y la recuperación en el mismo navegador y origen donde iniciaste el flujo. Supabase Auth usa el verificador PKCE que guardó allí.

El servicio de correo integrado de Supabase está limitado a direcciones autorizadas del equipo del proyecto. Puedes verificar el flujo con tu correo de integrante. El registro y la recuperación para estudiantes externos requerirán un SMTP autorizado antes de abrir la beta. Mantén la confirmación activa. [Redirecciones de Auth](https://supabase.com/docs/guides/auth/redirect-urls) · [Límites de correo](https://supabase.com/docs/guides/auth/auth-smtp)

## 4. Asigna el rol Owner a tu cuenta

1. Abre la vista previa, elige **Iniciar sesión → Crear cuenta**, registra tu correo y abre el enlace de confirmación recibido.
2. Vuelve a **Supabase Dashboard → Authentication → Users**. Busca tu cuenta confirmada y copia su **User UID**.
3. Abre **SQL Editor → New query**. Reemplaza `TU_USER_UID` por el UUID que copiaste, conserva las comillas y pulsa **Run**.

```sql
update public.user_roles as r
set role = 'owner'
from auth.users as u
where r.user_id = u.id
  and u.id = 'TU_USER_UID'::uuid
  and u.email_confirmed_at is not null
returning r.user_id, r.role;
```

4. Comprueba que devolvió una fila con tu UID y el rol `owner`. La restricción de la base admite una sola cuenta Owner. Si devuelve cero filas, comprueba el UID y que el correo ya figure confirmado.
5. Cierra sesión y vuelve a iniciar sesión. En **Mi perfil** aparecerá **Administración**. Abre esa sección y comprueba que se muestran los indicadores.

## 5. Comprueba el primer aporte

1. Usa una cuenta Student de prueba. Si todavía solo tienes el correo integrado de Supabase, puedes crear una cuenta de prueba confirmada desde **Authentication → Users → Add user → Create new user**, con **Auto Confirm User**, y usarla para comprobar los permisos. Esto conserva la confirmación obligatoria en el registro público.
2. Con esa cuenta entra a **Compartir oportunidad**. Envía el enlace de una convocatoria real que quieras incorporar. En **Mis aportes** debe aparecer **Pendiente**. En una ventana privada, comprueba que el explorador todavía no la muestra.
3. Inicia sesión como Owner en otra sesión de navegador. En **Administración**, filtra por **Pendiente**, abre **Revisar aporte** y visita la fuente oficial. Completa los campos y la fecha de verificación. Puedes marcar **Pasar a revisión** antes de terminar.
4. Pulsa **Aprobar y publicar**. Comprueba que el aporte figura **Aprobada** y que la convocatoria aparece en **Explorar** en una ventana sin sesión iniciada.
5. Con la cuenta Student, actualiza **Mis aportes** y guarda la convocatoria desde su detalle. Comprueba que el guardado se conserva tras recargar y que **Administración** muestra **Acceso restringido** para esa cuenta.
6. Si quieres comprobar el archivo, vuelve a la cuenta Owner, elige **Archivar** y verifica que la convocatoria y sus requisitos dejan de mostrarse públicamente. Puedes restaurarla desde el mismo panel.

## Vercel en una fase posterior

Cuando autorices el despliegue, abre **Vercel → Project → Settings → Environment Variables** y agrega las mismas dos variables al entorno correspondiente. Configura una reescritura SPA a `index.html` y, en Supabase, agrega las dos rutas Auth del dominio asignado. Actualiza **Site URL** al dominio público aprobado. [Arquitectura](arquitectura.md)
