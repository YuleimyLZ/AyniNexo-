# Seguridad y roles

| Rol | Acceso en la API |
| --- | --- |
| Visitante | Columnas públicas de convocatorias aprobadas y requisitos asociados |
| Student | Catálogo público, su propio perfil, guardados, rutas, avances y estado de sus aportes |
| Owner | Acceso Student sobre su cuenta, catálogo administrado, bandeja y auditoría de moderación |

Todas las tablas del aplicativo tienen RLS y permisos explícitos. Un Owner conserva el aislamiento de perfiles y rutas de otras personas. El identificador de publicación y las observaciones de revisión quedan fuera de las columnas públicas. Los permisos sobre las tablas y los controles de las RPC son independientes de React Router.

Las cuentas de Auth reciben Student mediante un trigger. Solo una sesión administrativa del Dashboard puede asignar Owner según la guía. La aplicación lee el rol desde `user_roles` y la base limita el cargo a una cuenta. Los roles de la interfaz nunca amplían los permisos de la API.

Las RPC de moderación verifican el rol con `auth.uid()`, tienen un `search_path` fijo y registran las transiciones. La aprobación bloquea el aporte mientras se guarda el conjunto. Una repetición de una aprobación exitosa devuelve la convocatoria ya publicada. El archivo retira la convocatoria y sus requisitos del catálogo público. Archivar el aporte es independiente de archivar su publicación.

El envío autenticado valida campos, normaliza la fuente, impide duplicar aportes activos o fuentes publicadas y establece un límite de cinco aportes por cuenta por hora. El conteo vive en la base y se serializa por cuenta con un bloqueo de transacción. El aporte pendiente solo está disponible para quien lo envió y para Owner mediante su RPC. La aplicación abre enlaces por acción del usuario. Los servicios nunca descargan los enlaces aportados.

Supabase Auth mantiene la sesión en el navegador y renueva tokens. Para las pruebas se usan cuentas y datos sintéticos. La clave publicable se puede incluir en el frontend porque los permisos se aplican a cada solicitud. Las claves privadas se reservan para sus respectivos servicios de servidor.


## Piloto de Gemini

Cada Edge Function verifica la sesión en Supabase Auth. Las escrituras de origen AI y las reservas de cuota están limitadas al rol de servicio. Gemini recibe taxonomías y referencias públicas del catálogo. La evaluación del perfil y el texto original de conversación permanecen en AyniNexo. El extractor Owner requiere confirmación de que el texto es público, aplica un filtro para identificadores comunes y conserva citas verificadas para revisión. La Owner debe revisar el fragmento antes de enviarlo, ya que un filtro automatizado puede omitir datos personales no estructurados.

Los orígenes de navegador se configuran con una lista exacta. El piloto requiere una membresía privada vigente, mayoría de edad y verificación de participación desde Perú por la administradora. El control de región es administrativo. Los términos del proveedor deben revisarse antes de ampliar el acceso. [Despliegue y permisos](despliegue-fase-3.md)
