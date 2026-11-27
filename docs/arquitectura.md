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

| Función | Entrada interna | Gemini | Respuesta y permisos |
| --- | --- | --- | --- |
| `match-opportunities` | Consulta acotada, hasta seis IDs públicos anteriores y uso opcional del perfil | Taxonomía, intención y categorías permitidas. Ranking por tema entre candidatos reales y selección de un consejo de preparación | IDs y evaluación de requisitos producida en AyniNexo. Las cuentas fuera del piloto reciben reglas. |
| `extract-opportunity` | Enlace, texto público pegado y confirmación de la Owner | Extracción con JSON Schema y fragmentos literales, sin herramientas de búsqueda | Borrador y evidencia. El servicio exige rol Owner y piloto. La publicación sigue en el flujo editorial de Fase 2. |
| `generate-roadmap` | ID publicado, horizonte de 3, 6 o 12 meses y uso opcional del perfil | Selección y orden de actividades generales de una lista fija | AyniNexo añade brechas, requisitos, prioridades y recursos previamente definidos. Una transacción guarda la ruta y su origen, o conserva la existente. |

La SPA guarda hasta ocho intercambios en memoria por cuenta y pestaña. Un nuevo hilo, un cambio de cuenta o una recarga descartan la sesión conversacional. Los IDs anteriores se resuelven de nuevo en el catálogo. El motor usa temas, categorías, restricciones explícitas y requisitos tipados. Distingue afinidad, elegibilidad actual y preparación. Una oportunidad cerrada o vencida se muestra con su estado si el usuario la identifica por nombre. Las condiciones sin representación estructurada se marcan por confirmar.

Los POST verifican la cuenta mediante Supabase Auth. Las lecturas de perfil y catálogo usan el JWT del usuario para aplicar RLS. Las únicas acciones de servicio reservan cuota y persisten planes con origen AI. El proyecto concede acceso a usuarios adultos autorizados en Perú mediante una lista privada con vencimiento. Los límites diarios siguen la zona del Pacífico usada por Gemini. Se reservan juntos el cupo de la cuenta, el global y el minuto del proyecto mediante un bloqueo transaccional. El caché en memoria conserva únicamente selecciones públicas de match durante quince minutos y vuelve a comprobar membresía y cupo de la cuenta en cada acceso.

Gemini 3.1 Flash-Lite tiene nivel gratuito y salida estructurada. El backend usa tiempo máximo, límites de tokens, un modelo configurable y esquemas validados al recibir la respuesta. Una respuesta fuera de esquema, un fallo o una cuota agotada activa orientación por reglas. Para el extractor, los valores faltantes se señalan y las citas se verifican contra el fragmento proporcionado. Los requisitos de años, notas y certificaciones ambiguas permanecen manuales. [Modelo](https://aistudio.google.com/docs/models/gemini-3.1-flash-lite) · [Precios](https://aistudio.google.com/docs/pricing#gemini-3.1-flash-lite)

La búsqueda puede evolucionar a RAG indexando únicamente descripciones, temas y requisitos de convocatorias públicas, con IDs y fuentes. Un índice léxico de PostgreSQL sería el primer paso. Si el catálogo crece y se justifica búsqueda semántica, se puede agregar un índice de embeddings sobre las mismas fuentes públicas. El filtrado de estado, RLS, requisitos y documentación oficial seguirían resolviéndose antes de responder.

[Guía de despliegue y pruebas reales](despliegue-fase-3.md)
