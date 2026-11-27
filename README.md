# AyniNexo

AyniNexo acerca oportunidades educativas y profesionales a estudiantes universitarios. Es un proyecto independiente nacido en Perú. La Fase 3 incorpora conversación sobre convocatorias, rutas asistidas y extracción editorial con Gemini para un piloto privado.

## Configuración desde el navegador

La guía de Fase 3 incluye migración incremental, archivos para el editor de Supabase, acceso al piloto, Preview protegido y comprobaciones desde la aplicación. [Desplegar la Fase 3](docs/despliegue-fase-3.md)

| Ruta | Experiencia |
| --- | --- |
| `/`, `/explorar` | Portada y catálogo público de convocatorias aprobadas |
| `/oportunidades/:id`, `/mi-nexo` | Fuente, requisitos y conversación sobre el catálogo |
| `/sesion` | Registro, confirmación de correo, sesión y recuperación |
| `/perfil`, `/guardadas`, `/mi-ruta` | Datos y progreso de la cuenta autenticada |
| `/compartir` | Envío de oportunidades y seguimiento de los aportes propios |
| `/administracion` | Revisión, creación, edición, publicación y archivo por la persona Owner |

Mi Nexo trabaja con convocatorias aprobadas. La evaluación del perfil y de requisitos se ejecuta dentro de AyniNexo. La cuenta Owner puede completar un borrador con Gemini y aprobarlo mediante el flujo editorial existente.

## Desarrollo y pruebas

Para trabajar dentro de un entorno de ejecución se recomienda Node.js 22.12 o posterior.

```sh
npm ci
npm run dev
npm run lint
npm test
npm run build
npm run build:edge
```

En desarrollo, puedes configurar `VITE_AYNI_DEMO=true` con las dos variables de Supabase vacías para explorar un catálogo ficticio identificado. Las operaciones que requieren una cuenta se habilitan al conectar Supabase. Los datos de la Fase 1 permanecen separados de esta base.

## Documentación

- [Arquitectura](docs/arquitectura.md)
- [Migraciones](docs/migraciones.md)
- [Seguridad y roles](docs/seguridad-y-roles.md)
- [Pruebas](docs/pruebas.md)
- [Roadmap del proyecto](docs/roadmap.md)
- [Sistema visual](docs/diseno.md)
- [Capturas de Fase 3 y de referencia](docs/capturas/README.md)
