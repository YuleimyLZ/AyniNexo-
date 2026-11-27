# Verificación de la Fase 2

## Pruebas de código

```sh
npm ci
npm run lint
npm test
npm run build
```

Pasaron 18 pruebas unitarias, lint y compilación de producción. Vitest cubre elegibilidad, fechas, normalización, moderación de borradores, validación de URLs, claves aptas para el navegador, retorno tras iniciar sesión y conversión de registros. Las pruebas unitarias usan datos sintéticos en memoria. `npm run build` ejecuta TypeScript en modo estricto antes de compilar.

## PostgreSQL desechable

Se aplicó la migración a PostgreSQL 17 y se ejecutaron las pruebas con los roles `anon` y `authenticated`. Se comprobó el aislamiento de los datos de dos estudiantes, la reserva de las notas de revisión, el rechazo de escrituras administrativas, el control de duplicados y el límite persistente de aportes. Se verificó el rechazo y el archivo de aportes, que un requisito inválido revierta la aprobación completa y que una convocatoria archivada deje de exponer sus requisitos.

Para repetir estas pruebas como parte del desarrollo, usa una base de pruebas recién migrada. El siguiente comando es para el entorno de ejecución con `psql`, no para la configuración en Supabase Dashboard.

```sh
PGOPTIONS=-cayni.disposable_test=on psql -v ON_ERROR_STOP=1 \
  -f supabase/tests/rls.sql
```

La conexión `PGHOST`, `PGPORT`, `PGDATABASE` y `PGUSER` debe apuntar al entorno de pruebas. El archivo revierte todas sus filas sintéticas.

## Navegador y API de pruebas

Pasó el recorrido de Chromium con Playwright contra GoTrue v2.186, PostgREST v14, PostgreSQL 17 y Mailpit. El navegador comprobó registro con enlace de confirmación, inicio y cierre de sesión, recuperación PKCE, cambio de contraseña y retorno al inicio de sesión tras expirar la sesión. También probó perfil persistente, aprobación, catálogo público, reglas sobre requisitos reales de la base de pruebas, guardados, rutas, actualización, archivo y restauración.

Las solicitudes directas a PostgREST comprobaron permisos sin pasar por los controles de la interfaz. Incluyeron visitante, dos estudiantes y Owner. El navegador de móvil verificó portada, explorador, Mi Nexo y acceso a la sesión a 390 px de ancho. La prueba de desconexión interceptó solo la solicitud del catálogo y verificó el aviso, la ausencia de datos ficticios y el reintento.

## Proyecto AyniNexo de Supabase

La migración, la configuración de redirecciones y la comprobación contra el proyecto alojado de la fundadora están pendientes. Después de aplicar la migración desde Dashboard y configurar la URL y la clave publicable en Codex Web, ejecuta el recorrido de registro, aporte, aprobación y catálogo de la guía. [Configuración y comprobación manual](configuracion-supabase.md)
