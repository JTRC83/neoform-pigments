# N€O FORM & PIGM€NT$

Repositorio seguro: `neoform-pigments`

## Vision

N€O FORM & PIGM€NT$ es una aplicacion web local-first para composicion artistica digital. El objetivo no es construir un Photoshop completo, sino una herramienta creativa centrada en formas, pigmentos, composiciones, texturas vectoriales, acabados graficos y exportacion cuidada.

La aplicacion debe sentirse directa, visual, expresiva y facil de usar con raton, trackpad o tableta grafica.

## Stack

- React
- Vite
- TypeScript
- Tailwind CSS
- Fabric.js
- Zustand
- Driver.js

### Bibliotecas De Animacion A Considerar

- Anime.js: candidata principal para cursores, rastros, animaciones SVG, motosierra, avion de papel, cohete, maquina de tatuaje y feedback visual de herramientas. Debe usarse en modulos gratuitos/open-source y de forma modular para no aumentar demasiado el bundle.
- Motion.dev: candidata para microinteracciones React, modales, paneles, transiciones del mini-Bridge, estados de botones y animaciones de entrada/salida de UI.
- Three.js: opcion reservada para futuras necesidades 3D/WebGL o efectos visuales avanzados. No debe introducirse para animaciones simples de interfaz porque anadiria complejidad y peso innecesario.

## Principios De Producto

- Local-first: el trabajo debe poder guardarse y recuperarse sin depender de servidor.
- Vector-first: formas, tramas, lineas, composiciones y texturas deben escalar sin perder calidad siempre que sea posible.
- MVP antes que complejidad: priorizar herramientas claras y utiles.
- Interfaz expresiva: estilo neobrutalista, colores fuertes, controles visibles y sin exceso de scroll.
- Composicion modular: las figuras y composiciones guardadas deben reutilizarse como bloques creativos.
- Exportacion fiable: lo que se ve en el lienzo debe exportarse de forma predecible.

## Estado Actual

La aplicacion ya incluye:

- Layout base con `TopBar`, `LeftToolbar`, `CanvasEditor`, `RightPanel` y `LibrariesPanel`.
- Fabric.js integrado como motor de canvas.
- Formas basicas: rectangulo, elipse, triangulo, rombo, pentagono, hexagono.
- Formas de biblioteca: pills, semicirculos, arcos, crescentes, pinwheel, portal, cream rings, petal burst, eye, rayos y otras figuras geometricas.
- Panel de pigmentos con paleta inspirada en Bauhaus, Chaos y azul Klein.
- Texturas vectoriales y degradados aplicables a objetos.
- Herramienta `Gradient` en el sidebar izquierdo para aplicar degradados directos a figuras ya coloreadas, con direccion editable por arrastre e intensidad configurable.
- Control de degradado basico mediante barra `Shade` para ajustes rapidos desde propiedades.
- Correccion de color por seleccion y por composicion general: exposicion, contraste, saturacion, temperatura y mezclador de canales RGB.
- Capas con seleccion, renombrado, visibilidad, bloqueo, orden y eliminacion.
- Modos de fusion y sombras por capa.
- Composiciones guardables desde seleccion.
- Multiples lienzos y formatos verticales/horizontales.
- Grid, proporcion aurea y guias verticales/horizontales movibles y eliminables.
- Zoom, fit, center y controles de viewport.
- Exportacion principal JPG/JPEG sRGB con calidad configurable.
- Los exports JPG/JPEG sRGB se guardan tambien en `Obras finales` dentro de la biblioteca visual.
- Exportaciones avanzadas internas: SVG, PDF raster de muestra, paquete y JPG/JPEG de todos los lienzos.
- Biblioteca visual full-screen con categorias para composiciones, pigmentos, mezcla de pigmentos, paletas de color, texturas y obras finales.
- Vista tipo Bridge con preview grande y carrete inferior de miniaturas para recorrer imagenes importadas.
- Assets visuales guardados en IndexedDB para evitar llenar `localStorage` con imagenes grandes.
- Extraccion de paletas desde imagenes importadas y creacion de mezclas de pigmentos reutilizables.
- Import/export JSON del proyecto.
- Guardado local en navegador.
- Undo/redo real basado en snapshots.
- Cursores configurables con animaciones.
- Herramientas de dibujo: lapiz, plumilla y rotulador con presion real cuando el dispositivo lo permite.
- Herramientas especiales: motosierra para corte y cortacesped para eliminar fondo/relleno.
- Tour inicial con Driver.js.
- Tour Driver.js ampliado para explicar export JPG, biblioteca visual, IndexedDB, Obras finales, motosierra y efectos de capa.
- Modos de color: standard, light y dark.

## MVP

El MVP debe permitir:

1. Crear composiciones con formas y figuras de biblioteca.
2. Aplicar pigmentos, texturas, degradados y acabados.
3. Ajustar color de objetos o del resultado final con controles fotograficos basicos y canales separados.
4. Gestionar capas de manera basica.
5. Crear varios lienzos.
6. Guardar y recuperar proyectos localmente.
7. Exportar resultados.

## Fase De Puesta A Punto

Esta fase tiene como objetivo convertir el prototipo actual en una aplicacion mas solida, intuitiva y preparada para produccion creativa.

### 1. Motosierra Vectorial Avanzada

Problema:

La herramienta de motosierra aun es basica. Actualmente corta figuras vectoriales simples con trazos rectos, pero necesita ser mas robusta.

Objetivo:

Convertir la motosierra en una herramienta real de corte vectorial.

Debe permitir:

- Cortar formas simples sin romperlas.
- Cortar formas complejas de biblioteca.
- Cortar grupos o composiciones.
- Cortar texto convertido o preparado para corte vectorial cuando sea posible.
- Hacer cortes multiples sobre una misma figura.
- Empezar el corte fuera de la figura y terminar fuera de ella.
- Generar nuevas figuras cerradas vectorialmente.
- Mantener rellenos, opacidad, textura, sombra y modo de fusion cuando se creen las piezas resultantes.

Criterios de aceptacion:

- Al cortar una figura, no debe aparecer una mascara blanca falsa.
- El resultado debe ser una o mas figuras vectoriales cerradas.
- La capa original debe sustituirse por las piezas nuevas o conservarse segun una decision clara de producto.
- Undo/redo debe restaurar el estado anterior correctamente.

Estado inicial de mejora:

- La motosierra ya corta usando poligonos transformados en coordenadas reales del canvas.
- Las figuras compuestas se pueden descomponer en piezas cortadas y piezas intactas.
- Un mismo trazo puede cortar varias figuras intersectadas en la misma pasada.
- Las figuras simples se cortan geometricamente como poligonos cerrados.
- Las figuras compuestas complejas de biblioteca, como `Portal Dot`, `Petal Burst`, `Green Cross` y `Tri Grid`, priorizan corte visual estable mediante clon y clip vectorial para no romper sus subformas internas.
- Los grupos simples pueden cortarse pieza por pieza cuando el resultado es seguro, pero los grupos con varias subformas visuales no deben descomponerse si eso degrada la figura.
- La normalizacion de figuras complejas debe hacerse con una matriz de casos y pruebas visuales, no con cambios globales. Las figuras que todavia se rompen al cortar deben quedar registradas y resolverse una a una.
- Los paths con curvas se muestrean a contornos cerrados y se cortan con `polygon-clipping`.
- El texto se corta actualmente como `Textbox` con clip vectorial relativo para preservar la apariencia exacta de la tipografia original.
- La conversion de texto a contornos mediante `opentype.js` queda como base tecnica experimental, pero no se usa automaticamente hasta que respete perfectamente forma, metrica y kerning.
- El texto se normaliza en una fase propia: `Textbox` debe convertirse explicitamente con `Outline text` antes de usar la motosierra, para revisar visualmente contornos, kerning, huecos internos y metricas.
- La conversion `Outline text` usa `opentype.js`, genera paths con `fillRule: evenodd`, conserva color/opacidad/sombra y queda como una capa `Text Outline` editable.
- Las formas con huecos se representan como multipoligonos con contorno exterior e interiores usando `fillRule: evenodd`.
- Las piezas recortadas recuerdan su poligono visible en coordenadas locales, por lo que se pueden mover, escalar o volver a cortar sin recalcular sobre la caja completa original.
- Las formas complejas sin contorno booleano propio siguen usando un fallback vectorial cerrado para no usar mascaras falsas.
- Las piezas resultantes conservan relleno, trazo, opacidad, sombra, modo de fusion y metadatos basicos.
- Las piezas resultantes se pueden volver a cortar.
- Si una forma no se puede cortar con seguridad, la aplicacion muestra un aviso visual y marca la pieza en vez de generar una figura rota.
- Para evitar regresiones sin perder herramientas utiles, la motosierra debe tratar las figuras compuestas por subfigura independiente antes de intentar unirlas en una sola masa geometrica.
- `Red Scallop`, `Sun Dots`, rayos y formas similares deben poder cortarse porque su geometria base no justifica bloquearlas globalmente.
- Casos pendientes de normalizacion visual fina: `Green Cross`, `Orange Petals`, `Rose Stack`, `Petal Burst`, `Portal Dot`, `Pink Eye`, formas con huecos internos y grupos con varias subformas.
- La normalizacion concreta ya contempla elipses reales dentro de grupos, como `Sun Dots` y el punto de `Portal Dot`, y rectangulos redondeados/capsulas para piezas tipo `Petal Burst`.
- Queda pendiente seguir ampliando pruebas visuales sobre todas las formas sofisticadas de la biblioteca.

### 2. Presion Real Para Wacom Y Tabletas

Problema:

Existen lapiz, plumilla y rotulador, pero todavia no se usa `pointer.pressure` para grosor dinamico.

Objetivo:

Hacer que las herramientas de dibujo respondan a la presion real de una Wacom o tableta grafica compatible.

Debe permitir:

- Grosor variable segun presion.
- Diferencias claras entre lapiz, plumilla y rotulador.
- Trazos suaves y estables.
- Fallback correcto cuando el dispositivo no informa presion.
- Ajustes de sensibilidad minima/maxima.

Criterios de aceptacion:

- Con tableta grafica, el trazo debe engrosar y afinar segun la presion.
- Con raton, el trazo debe seguir funcionando de forma estable.
- Los trazos deben poder seleccionarse como capas.

Estado inicial de mejora:

- Las herramientas de dibujo ya capturan `pointer.pressure` cuando el navegador/dispositivo lo ofrece.
- Los trazos se generan como formas vectoriales cerradas con grosor variable punto a punto.
- Lapiz, plumilla y rotulador tienen sensibilidad minima/maxima y curvas de presion diferentes.
- Si no hay presion disponible, se usa un fallback estable para raton/trackpad.
- Los trazos resultantes se pueden seleccionar, recolorear, texturizar, degradar y gestionar como capas.

### 3. Capas Avanzadas

Problema:

Las capas funcionan, pero pueden mejorar mucho para trabajos con muchas figuras.

Objetivo:

Hacer que el panel de capas sea una herramienta real de organizacion.

Debe permitir:

- Duplicar capas.
- Seleccion multiple de capas.
- Agrupar y desagrupar.
- Bloquear grupos.
- Renombrado mas comodo.
- Ordenacion mas fluida.
- Borrado multiple.
- Identificar visualmente tipo de objeto, color y estado.
- Scroll interno cuando haya muchas capas.

Criterios de aceptacion:

- Se pueden seleccionar varias capas y operar sobre ellas.
- Un grupo se puede mover, bloquear y ocultar como una unidad.
- Las acciones de capas respetan undo/redo.

Estado inicial de mejora:

- Las capas ya se pueden duplicar desde el panel.
- El panel soporta seleccion multiple con Cmd/Ctrl, rangos con Shift y una barra de acciones masivas.
- Las acciones masivas permiten borrar, bloquear/desbloquear, mostrar/ocultar y mover varias capas.
- Las capas seleccionadas se pueden agrupar en una capa `Group`.
- Los grupos se pueden desagrupar recuperando sus objetos internos como capas editables.
- El bloqueo de un grupo bloquea la interaccion del grupo completo.
- El renombrado ahora selecciona el texto al enfocar, guarda con Enter y cancela con Escape.

### 4. Gestion De Composiciones

Problema:

Las composiciones ya se pueden guardar, pero falta gestion.

Objetivo:

Convertir composiciones en una biblioteca personal reutilizable.

Debe permitir:

- Guardar composiciones de seleccion.
- Borrar composiciones guardadas.
- Renombrar composiciones.
- Editar composiciones existentes.
- Ordenar composiciones.
- Exportar composiciones propias.
- Importar composiciones propias en otro equipo o proyecto.
- Reutilizar composiciones en otros lienzos.

Criterios de aceptacion:

- Las composiciones sobreviven al reinicio del navegador.
- El usuario puede limpiar o reorganizar su biblioteca.
- Se puede mover una biblioteca de composiciones entre equipos.

Estado inicial de mejora:

- Las composiciones propias se pueden borrar.
- Las composiciones propias se pueden renombrar inline con Enter/Escape.
- Las composiciones propias se pueden actualizar usando la seleccion actual del lienzo.
- La biblioteca propia se puede ordenar con controles de subir/bajar.
- Se puede exportar una composicion propia individual como JSON.
- Se puede exportar toda la biblioteca propia como JSON.
- Se puede importar un JSON de composiciones y fusionarlo con la biblioteca local.

### 5. Texturas, Tramas Y Grano

Problema:

Las texturas y el grano estan bien como base, pero el grano final es mas raster/export que vector puro.

Objetivo:

Definir una estrategia clara para acabados artisticos.

Decision aplicada:

- Se acepta el grano analogico como acabado final raster en exportacion, porque reproduce mejor una textura de pelicula real.
- Para trabajos que deban escalar sin pixelado se incorporan alternativas vectoriales: stipple, rosette/halftone, register lines, fiber hatch, offset screen, meshes, Bauhaus blocks, Benday dots, serigraphy bars, op-art waves y pop burst.
- La biblioteca separa las texturas por familias visuales: degradados, Bauhaus vector, Pop Art vector, Serigrafia vector y utilidades vectoriales.
- Las tarjetas de textura indican si el recurso es `SVG`/vectorial; el grano analogico aparece como `Raster export` en el sidebar izquierdo para evitar confundirlo con las tramas aplicables a objetos.
- Se anaden tramas nuevas: Bauhaus Weave, Arch Grid, Pop Halftone y Offset Screen, pensadas para composiciones Bauhaus/pop art/serigrafia.
- El acabado de grano final incluye presets artisticos rapidos para ajustar suavidad, presion visual y grano agresivo sin tocar siempre los sliders.
- La herramienta `Gradient` queda separada de texturas y modos de capa: se usa desde el sidebar izquierdo para aplicar luz/sombra sobre la figura activa o arrastrar sobre una figura para definir la direccion del degradado.

Debe permitir:

- Texturas vectoriales escalables.
- Tramas que no pierdan calidad al redimensionar.
- Degradados aplicables sin sustituir completamente el color base.
- Ruido o grano analogico como acabado global.
- Control de intensidad.
- Aplicacion por objeto o como acabado final del lienzo.

Criterios de aceptacion:

- Las texturas vectoriales deben escalar sin pixelarse.
- El grano final debe previsualizarse antes de exportar.
- El usuario debe entender si un acabado es vectorial o raster.
- Las tramas vectoriales deben estar separadas visualmente del acabado de grano final.

### 5.1 Biblioteca Visual, Paletas Y Mezcla De Pigmentos

Problema:

La biblioteca visual debe poder manejar imagenes grandes sin saturar `localStorage`, y los pigmentos importados deben convertirse en material de trabajo reutilizable.

Objetivo:

Convertir la biblioteca visual en un mini-Bridge local-first con almacenamiento robusto y flujo de paletas.

Debe permitir:

- Guardar imagenes y assets visuales en IndexedDB.
- Mantener categorias separadas para composiciones, pigmentos, mezcla de pigmentos, paletas de color, texturas y obras finales.
- Extraer una paleta de color desde imagenes importadas.
- Guardar la paleta extraida como asset propio.
- Crear mezclas de pigmentos a partir de varios colores.
- Reutilizar paletas y mezclas en el lienzo o como referencia visual.

Estado inicial:

- La biblioteca visual carga y guarda assets en IndexedDB.
- Existe una carpeta `Paletas`.
- Al importar imagenes se extraen colores dominantes.
- Desde el preview se puede guardar una paleta extraida o crear una mezcla de pigmentos.

### 6. Exportacion Profesional

Problema:

La exportacion principal debe ser simple: un boton claro para JPG/JPEG sRGB con la calidad, medidas y PPP activos. Las salidas avanzadas pueden existir como base tecnica, pero no deben saturar la barra superior.

Objetivo:

Preparar exportacion para impresion, archivo y transporte.

Debe permitir:

- DPI configurable.
- Medidas reales en px, mm y cm.
- PPP por defecto a 300, modificable con minimo de 150.
- Calidad JPG/JPEG configurable por preset o manualmente.
- Exportacion JPG/JPEG siempre preparada en flujo sRGB.
- Presets de lienzo para impresion: A1, A2, A3, A4, A5 y poster.
- Cada preset debe poder crearse en vertical y horizontal.
- Sangrado y margen seguro configurables para preparar impresion.
- Presets de impresion mas finos para pantalla, prueba digital, A4, A3, galeria, riso y social.
- Marcas de corte opcionales fuera del area de corte.
- Exportar PDF raster de muestra/proof, no como salida final de imprenta.
- Exportar paquete completo del proyecto como flujo avanzado, fuera de la accion principal.
- Incluir JSON editable, JPG/JPEG profesional, SVG por lienzo, ajustes de exportacion y composiciones cuando aplique en el paquete avanzado.

Estado actual:

- El overlay del lienzo incluye ajustes basicos de salida: preset y PPP.
- El selector de lienzos incluye A1-A5 y poster, generando pixels segun el PPP activo.
- El selector de lienzos sincroniza el formato seleccionado con el lienzo activo, y el cambio manual del lienzo se refleja como preset coincidente o custom.
- El overlay principal no carga sangrado/margen seguro; los controles profesionales viven en Canvases dentro del inspector.
- La barra superior prioriza un unico boton visible: `JPG sRGB`.
- El boton `JPG sRGB` exporta el lienzo activo con las medidas, PPP, calidad JPG, bleed y marcas de corte activos.
- Cada export JPG/JPEG sRGB se archiva como imagen local en `Obras finales`.
- PDF se considera una muestra raster/proof y no una salida de imprenta final.
- El paquete completo incluye el proyecto editable y assets JPG/SVG por lienzo.
- El paquete completo incluye metadatos profesionales por lienzo: PPP, tamano fuente, tamano final, medida real en mm, bleed, safe, margen para marcas, calidad JPG y perfil sRGB.

Criterios de aceptacion:

- El usuario puede preparar un lienzo para impresion.
- El usuario entiende las medidas reales del documento.
- El export debe ser consistente con lo visible en pantalla.
- El JPG/JPEG exportado debe respetar la calidad indicada y mantenerse en sRGB.

### 7. Tour Didactico Con Driver.js

Problema:

Driver.js existe, pero el tour puede ser mucho mas didactico.

Objetivo:

Hacer que el usuario aprenda la aplicacion dentro de la propia interfaz.

Debe incluir:

- Tour por herramientas principales.
- Explicacion de la motosierra.
- Explicacion del cortacesped.
- Explicacion de exportacion `JPG sRGB`.
- Explicacion de biblioteca visual tipo Bridge.
- Explicacion de capas, seleccion multiple y acciones multiples.
- Explicacion de modos de fusion.
- Explicacion visual de texturas y degradados.
- Separacion clara entre texturas vectoriales y grano raster final.
- Mini ejemplos por herramienta.
- Pasos cortos, claros y con lenguaje no tecnico.

Criterios de aceptacion:

- Un usuario nuevo debe entender para que sirve cada panel del sidebar derecho.
- Las herramientas raras o experimentales deben explicar su funcion antes de usarse.
- El tour no debe estorbar al flujo creativo.

### 8. QA Minimo Y Pruebas Visuales

Problema:

No hay tests automaticos ni pruebas visuales.

Objetivo:

Tener una estrategia minima para seguir creciendo sin romper cosas.

Debe incluir:

- Script de build como verificacion base.
- Tests unitarios para funciones puras importantes.
- Smoke test del editor.
- Checklist visual manual.
- Matriz de pruebas visuales por figura de biblioteca.
- Casos de prueba para exportacion, undo/redo, capas y guardado.
- Casos especificos para texturas, motosierra, formas compuestas y export JPG sRGB.
- En una fase posterior, pruebas visuales automatizadas.

Criterios de aceptacion:

- Antes de subir cambios, debe existir una forma clara de comprobar que lo basico funciona.
- Los cambios grandes deben tener una checklist de validacion.
- Las funciones criticas deben tener pruebas o al menos casos manuales documentados.

Estado inicial:

- Existe `npm run qa:smoke` para verificar estructura, dependencias y workflows criticos.
- Existe `npm run check` para ejecutar smoke QA y build.
- Existe `docs/QA.md` con checklist manual de editor, herramientas, capas, guardado y exportacion.
- Existe `docs/VISUAL_QA_MATRIX.md` con una matriz de pruebas visuales por figura y escenarios de exportacion, capas, texturas y motosierra.

## Orden Recomendado De Implementacion

1. PRD y README actualizados.
2. QA minimo y checklist visual.
3. Gestion avanzada de capas.
4. Gestion de composiciones.
5. Motosierra vectorial avanzada. Base ampliada con cortes multiples y grupos.
6. Presion real para Wacom/tabletas.
7. Texturas vectoriales y decision sobre grano raster/vectorial. Implementado como base con nuevas tramas Bauhaus/pop art.
8. Exportacion profesional. Implementado con boton principal JPG sRGB, PPP, calidad, presets, bleed, safe, marcas de corte, PDF raster de muestra y manifiesto de paquete.
9. Tour didactico completo con Driver.js.

## Riesgos

- Fabric.js permite mucha flexibilidad, pero operaciones booleanas vectoriales complejas pueden requerir utilidades adicionales o geometria propia.
- El corte de texto puede requerir convertir texto a paths para que sea realmente vectorial.
- La presion de tableta depende del soporte del navegador y del dispositivo.
- La exportacion PDF actual es raster de alta resolucion; si necesitamos PDF vectorial puro podria requerir una libreria especifica.
- El grano analogico completamente vectorial puede generar muchos objetos y afectar rendimiento.

## Definicion De "Lista Para Usar"

La aplicacion estara lista para una primera version seria cuando:

- El PRD y README reflejen el estado real.
- El editor arranque sin errores.
- Las herramientas principales sean comprensibles sin explicacion externa.
- Las capas y composiciones permitan trabajar con proyectos medianos.
- Undo/redo sea fiable en acciones creativas importantes.
- La exportacion sea predecible.
- Exista una checklist de QA antes de subir cambios.
