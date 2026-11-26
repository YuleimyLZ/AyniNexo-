# Arquitectura de AyniNexo

React, TypeScript estricto y React Router componen las páginas sobre Vite. Tailwind comparte los tokens CSS con los componentes de interfaz. Lucide aporta los iconos funcionales.

| Carpeta | Responsabilidad |
| --- | --- |
| `src/pages` | Rutas y orquestación de flujos |
| `src/components` | Sistema de componentes, tarjetas y navegación |
| `src/types` | Contratos de perfil, oportunidades, requisitos, aportes y rutas |
| `src/features` | Motor de elegibilidad, recomendaciones, preparación y moderación |
| `src/services` | Adaptadores del catálogo, almacenamiento y guía demostrativa |
| `tests` | Reglas, fechas, recomendaciones, URL y moderación |

El repositorio de demostración combina un catálogo fijo con los cambios del panel y guarda el estado en `localStorage`. Las oportunidades archivadas quedan fuera del catálogo público. La puntuación interna ordena la afinidad textual y no se muestra como probabilidad. El motor compara requisitos estructurados y modela las brechas académicas de forma independiente.

## Fase 2 — Supabase

1. Con autorización de la fundadora, crear un proyecto en el panel de Supabase y usar el SQL Editor o Supabase CLI para aplicar futuras migraciones versionadas.
2. Modelar perfiles, oportunidades, requisitos, aportes, guardados, rutas, acciones y roles. Configurar RLS y probar el acceso de visitante, estudiante autenticado y administradora. La asignación de Owner se hará mediante un mecanismo administrativo.
3. Configurar la URL y la clave publicable del proyecto en el archivo local `.env` del frontend a partir de `.env.example`. Configurar en Supabase Auth la URL local y los destinos autorizados de redirección.
4. Implementar adaptadores persistentes y reemplazar la sesión de demostración. La aprobación y publicación serán una operación de backend con validación de rol. Verificar que usuarios sin rol solo vean oportunidades aprobadas y no puedan modificar aportes ajenos.

## Fase 3 — Gemini

Configurar `GEMINI_API_KEY` en **Supabase → Edge Functions → Secrets** cuando la integración esté autorizada. El frontend llamará a `extract-opportunity`, `match-opportunities` y `generate-roadmap` mediante un adaptador de `GuidanceService`. Validar entradas, esquema de cada salida y correspondencia entre IDs devueltos y el catálogo aprobado. Mantener revisión humana de la extracción y probar límites persistentes, fallos del proveedor y el fallback informado. Enviar solo los atributos académicos necesarios, sin identificadores personales.

## Fase 5 — Vercel

Tras validar datos y permisos y con autorización para publicar, importar el repositorio existente en Vercel como proyecto Vite. Usar `npm run build` y `dist`. Configurar la reescritura de rutas SPA a `index.html` y las variables públicas de Supabase. Agregar la URL desplegada a los destinos autorizados en Supabase Auth. Verificar el ingreso directo a rutas internas, la navegación en móvil y los permisos por rol.
