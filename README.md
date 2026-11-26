# AyniNexo

AyniNexo acerca oportunidades educativas y profesionales a estudiantes universitarios. Es un proyecto independiente nacido en Perú. Esta **Public Beta v0.1, Fase 1** es una demostración del frontend, con convocatorias ficticias, datos locales y recomendaciones por reglas.

## Ejecución local

Necesitas Node.js 22.12 o posterior (recomendado Node.js 24) y npm.

```sh
npm ci
npm run dev
```

Abre [localhost:5173](http://localhost:5173). Si Vite usa otro puerto, el terminal mostrará la URL correspondiente.

| Ruta | Experiencia |
| --- | --- |
| `/` | Portada, categorías, oportunidades destacadas e historia |
| `/explorar` | Búsqueda, seis filtros, orden, guardado y detalle |
| `/mi-nexo` | Objetivos, afinidad y recomendaciones explicadas |
| `/perfil`, `/guardadas`, `/mi-ruta` | Perfil y progreso en este navegador |
| `/compartir` | Formulario de aportes |
| `/admin-demo` | Revisión, extracción simulada, edición, aprobación y archivo |

Para ver un ejemplo de brechas, entra a **Mi Nexo IA**, marca **Usar perfil de ejemplo** y elige el objetivo sobre un intercambio en tercer ciclo. En el detalle puedes comparar el perfil que guardaste y generar una ruta.

El almacenamiento se conserva por origen y navegador. La sesión de demostración y el panel administrativo son simulaciones. No hay cuentas reales, autenticación, Supabase, Gemini ni verificación de las oportunidades de ejemplo.

## Verificación

```sh
npm run lint
npm test
npm run build
npm run preview
```

`npm run preview` sirve la compilación local. Consulta la URL que imprime el terminal.

## Documentación

- [Arquitectura e integraciones futuras](docs/arquitectura.md)
- [Sistema de diseño y procedencia de la imagen](docs/diseno.md)
- [Capturas de escritorio y móvil](docs/capturas/README.md)
