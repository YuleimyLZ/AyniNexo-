# Migraciones de base de datos

La instalación inicial usa una sola migración. Abre [20261126000100_fase_2.sql](../supabase/migrations/20261126000100_fase_2.sql). El archivo ya contiene el SQL consolidado para un proyecto Supabase vacío de tablas de AyniNexo. Abre su versión **Raw**, cópiala íntegra y ejecútala en **SQL Editor → New query → Run**. [Guía paso a paso](configuracion-supabase.md)

La migración usa `begin` y `commit`. Crea nueve tablas vacías y agrega el rol Student a las cuentas de Auth que ya existan. Ninguna fila de ejemplo forma parte de la migración. No se añade una segunda migración de instalación. Si se amplía el esquema después de aplicarla, agrega un archivo con un identificador posterior. Conserva el archivo aplicado para que Dashboard, repositorio y entorno de pruebas coincidan.

En un entorno de desarrollo, las pruebas de políticas están en [supabase/tests/rls.sql](../supabase/tests/rls.sql). El archivo de pruebas requiere una base desechable, un rol administrativo local, `psql` y la opción de sesión `ayni.disposable_test=on`. Los usuarios y las convocatorias sintéticos se revierten con `rollback`.

## Fase 3

La migración [20261127000100_fase_3_ia.sql](../supabase/migrations/20261127000100_fase_3_ia.sql) se aplica sobre Fase 2. Agrega membresías privadas del piloto, cuotas transaccionales y un RPC de servicio para registrar el origen de las rutas asistidas. El RPC anterior conserva su contrato e idempotencia. [Pasos de instalación](despliegue-fase-3.md#1-aplica-la-migración-incremental)
