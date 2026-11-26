# AyniNexo

AyniNexo acerca oportunidades educativas y profesionales a estudiantes universitarios. Es un proyecto independiente nacido en Perú. La Fase 2 de la Public Beta v0.1 conecta el frontend Rosewood con Supabase Auth y PostgreSQL.

## Configuración desde el navegador

La guía cubre la migración en SQL Editor, las variables de Codex Web, la cuenta Owner y una comprobación del flujo de aportes. [Configurar el proyecto de Supabase](docs/configuracion-supabase.md)

| Ruta | Experiencia |
| --- | --- |
| `/`, `/explorar` | Portada y catálogo público de convocatorias aprobadas |
| `/oportunidades/:id`, `/mi-nexo` | Fuente, requisitos y orientación determinística |
| `/sesion` | Registro, confirmación de correo, sesión y recuperación |
| `/perfil`, `/guardadas`, `/mi-ruta` | Datos y progreso de la cuenta autenticada |
| `/compartir` | Envío de oportunidades y seguimiento de los aportes propios |
| `/administracion` | Revisión, creación, edición, publicación y archivo por la persona Owner |

El catálogo real empieza vacío. Mi Nexo aplica reglas determinísticas a convocatorias aprobadas. La extracción y las recomendaciones generativas corresponden a la Fase 3.

## Desarrollo y pruebas

Para trabajar dentro de un entorno de ejecución se recomienda Node.js 22.12 o posterior.

```sh
npm ci
npm run dev
npm run lint
npm test
npm run build
```

En desarrollo, puedes configurar `VITE_AYNI_DEMO=true` con las dos variables de Supabase vacías para explorar un catálogo ficticio identificado. Las operaciones que requieren una cuenta se habilitan al conectar Supabase. Los datos de la Fase 1 permanecen separados de esta base.

## Documentación

- [Arquitectura](docs/arquitectura.md)
- [Migraciones](docs/migraciones.md)
- [Seguridad y roles](docs/seguridad-y-roles.md)
- [Pruebas](docs/pruebas.md)
- [Roadmap del proyecto](docs/roadmap.md)
- [Sistema visual](docs/diseno.md)
- [Capturas de referencia de la Fase 1](docs/capturas/README.md)
