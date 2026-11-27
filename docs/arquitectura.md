# Arquitectura de AyniNexo

Vite sirve una SPA en React con TypeScript estricto y React Router. Tailwind comparte los tokens Rosewood con los componentes. El SDK de Supabase usa la clave publicable y la sesión del usuario para acceder a Auth y PostgREST.

| Ubicación | Responsabilidad |
| --- | --- |
| `src/pages`, `src/components` | Vistas, formularios, navegación y controles de acceso en la interfaz |
| `src/types/domain.ts`, `src/types/database.ts` | Tipos de interfaz y del esquema de Supabase |
| `src/features` | Elegibilidad, afinidad, preparación y edición de oportunidades |
| `src/services/repository.ts`, `records.ts` | Acceso a tablas, RPC y conversión de registros a modelos |
| `src/services/WorkspaceProvider.tsx` | Suscripción a Supabase Auth, carga del catálogo y estado privado por usuario |
| `supabase/migrations` | Esquema, permisos, políticas RLS y funciones transaccionales |

El catálogo público se consulta sin sesión y la consulta explícita mantiene el filtro publicado incluso si la persona Owner abre el explorador. El catálogo de desarrollo requiere una variable explícita y solo se carga en Vite en modo desarrollo. Los errores de Supabase se muestran en la interfaz.

Los datos académicos, aportes, guardados y rutas se mantienen en memoria mientras están en uso. Supabase Auth conserva la sesión y el verificador PKCE. Al cambiar de cuenta, la interfaz muestra solo datos asociados al nuevo identificador. El backend aplica la misma separación por RLS.

## Decisiones del esquema

- El catálogo separa `publication_status` y `is_public` de `call_status`. Una convocatoria publicada puede estar cerrada, vencida por fecha en la zona de Lima o abierta. La fecha ausente se muestra por confirmar.
- Cada requisito conserva su clase, condición, valor estructurado, carácter obligatorio, fuente y orden. Las ediciones mantienen los identificadores de los requisitos existentes. Una edición desactualizada recibe un error de concurrencia.
- Los guardados y las rutas son únicos por `user_id` y `opportunity_id`. La creación de la ruta y sus acciones es atómica. Un reintento recupera la ruta existente. `origin` distingue `deterministic` y `ai`.
- El envío de aportes establece el estado pendiente en PostgreSQL. La publicación inserta la convocatoria y sus requisitos, actualiza el aporte y registra la auditoría dentro de una sola transacción.
- Las fuentes se validan como enlaces HTTP/HTTPS. La clave única normaliza esquema, host, puerto predeterminado, barras finales y fragmentos. Se preservan los parámetros de consulta.

## Fase 3

`src/services/edgeGuidance.ts` define peticiones y respuestas para `extract-opportunity`, `match-opportunities` y `generate-roadmap` y exige validación de la respuesta en el adaptador. El motor determinístico actual usa requisitos estructurados y trabaja en el cliente. La Fase 3 incorporará las Edge Functions, la autorización, las cuotas y la verificación de que las oportunidades recomendadas estén aprobadas. La extracción continuará sujeta a verificación humana. [Roadmap](roadmap.md)
