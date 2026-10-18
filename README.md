# Evoluciona · Mi desarrollo personal

Aplicación **local** para registrar avances, objetivos, reflexiones, hitos e indicadores de desarrollo personal. Hecha con HTML, CSS y JavaScript, sin frameworks, sin cuentas y sin Supabase.

## Qué incluye esta primera versión

- Panel personal con nivel, puntos XP, resumen mensual y actividad de los últimos 14 días.
- Registro de entrenamiento, peso, masa muscular estimada, porcentaje de grasa, cintura, lectura, estudio, idiomas, aprendizajes, autocuidado, reflexiones, experiencias, logros profesionales, hábitos y descanso.
- Siete áreas de desarrollo. Los registros se guardan con su fecha y una nota opcional.
- Objetivos con área, fecha límite, unidad medible, progreso acumulado y estado de completado.
- 12 insignias que se desbloquean automáticamente a partir de los registros y metas.
- Historial con filtro por áreas, posibilidad de eliminar registros y gráficos de evolución de las medidas corporales.
- Copia de seguridad completa en JSON, importación de copias, borrado voluntario y solicitud de almacenamiento persistente.
- Diseño adaptable a ordenador y móvil, manifest y service worker para instalar como PWA y navegar sin conexión tras una primera carga exitosa.

Los puntos XP recompensan el registro y ciertos hitos, **no** cuánto pesas, cuánto duermes ni cómo te sientes.

## Cómo publicarla en GitHub Pages

1. En GitHub, crea un repositorio **nuevo**, por ejemplo `evoluciona`. No hace falta Supabase.
2. Sube **todos** los archivos y carpetas de este paquete a la raíz del repositorio. Es importante mantener `icons/`.
3. En el repositorio, abre **Settings → Pages**.
4. En **Build and deployment**, selecciona **Deploy from a branch**, `main` y `/ (root)` y guarda.
5. GitHub Pages publicará la app, normalmente en `https://TU-USUARIO.github.io/evoluciona/`.
6. Ábrela en Safari del iPhone o el navegador del ordenador. En el iPhone puedes usar **Compartir → Añadir a pantalla de inicio** para instalarla.

> Nota: GitHub Pages sirve el código de la web públicamente; **no publica tus registros** porque estos se guardan solo en el navegador que los introduce. Aun así, cualquier persona con acceso a ese navegador/perfil podría verlos. No guardes datos sensibles allí si compartes el dispositivo.

## Dónde se guardan los datos

En IndexedDB, bajo el origen específico de la app. Si usas el iPhone y el Mac, **no se sincronizan**; cada uno tendrá sus propios registros. Puedes exportar desde uno e importar en otro, pero **importar sustituye**, no fusiona, la información existente.

**IMPORTANTE: haz copias de seguridad periódicas.** El navegador puede eliminar datos locales, por ejemplo al limpiar la web o gestionar espacio. Instalar la PWA no reemplaza una copia externa. Los archivos JSON descargados no están cifrados: guárdalos en un lugar seguro.

## Desarrollo local

Sirve la carpeta con un servidor HTTP en lugar de abrir `index.html` con `file://`. Ejemplo:

```bash
python3 -m http.server 8000
```

Luego visita `http://localhost:8000`.

## Estructura

- `index.html`: estructura principal.
- `style.css`: interfaz y diseño responsive.
- `app.js`: modelo de datos, vistas, gráficos, guardado en IndexedDB, logros e importación/exportación.
- `sw.js`: caché de archivos estáticos para acceso sin conexión.
- `manifest.webmanifest`: configuración de PWA.
- `icons/`: iconos de instalación.

## Próximas ampliaciones posibles

Biblioteca de libros individualizados; medidas corporales adicionales; desafíos semanales; gráficos por cada métrica; exportación CSV; foto de cada hito; objetivos con subtareas; integración opcional y voluntaria con NutriTrack; sincronización con un backend si resulta necesaria.

Versión 1.2 — prototipo personal. No está pensada para almacenar datos clínicos ni para utilizarse como copia única de información importante.


## Versión 1.1
Las metas se pueden vincular a actividades. Los registros nuevos incrementan automáticamente el objetivo y, al borrar un registro, el total se recalcula. Se conserva el progreso manual anterior al vincular.


## Novedades 1.2

- Las tarjetas de **Áreas de desarrollo** ahora abren una vista específica: registro contextual, historial filtrado y objetivos de esa área. El botón «Registrar» también se adapta al área abierta.
- Se añade **Trabajo en proyecto** al selector global y a «Objetivos y proyectos».
- En «Objetivos y proyectos» puedes crear proyectos con nombre (por ejemplo, English365, NutriTrack), pulsar «He trabajado hoy» para guardar un registro instantáneo o «Añadir detalle» para indicar fecha y nota. Evita registrar dos veces el mismo proyecto en un mismo día; si ya existe puedes completar la nota del registro.
- Los proyectos pueden archivarse y reactivarse sin borrar su historial. Los objetivos automáticos vinculados a «Trabajo en proyecto» pueden limitarse a un proyecto concreto.
- Dos nuevas insignias reconocen el trabajo en proyectos. Las copias de seguridad conservan también los proyectos, sin perder compatibilidad con las copias 1.0 y 1.1.

**Actualización:** sube los archivos nuevos manteniendo la misma dirección GitHub Pages. No borres los datos del navegador. Haz una exportación JSON previa desde Ajustes.
