// flashIdeas.js
// Catálogo de sugerencias rápidas (Flash Ideas) y diccionarios temáticos para el Guionista IA (MEP).

export const GENEROS_DISPONIBLES = [
  "Shōnen / Aventura",
  "Seinen / Psicológico",
  "Fantasía Oscura",
  "Cyberpunk / Sci-Fi",
  "Terror / Sobrenatural",
  "Romance / Slice of Life",
  "Acción / Artes Marciales",
  "Comedia / Humor",
  "Histórico / Samurai",
  "Mecha / Distopía"
]

export const TONOS_DISPONIBLES = [
  "Épico y emotivo",
  "Oscuro y crudo",
  "Filosófico y reflexivo",
  "Ligero y cómico",
  "Trágico y dramático",
  "Deconstructivo / Misterio",
  "Intenso y frenético",
  "Esperanzador y mágico"
]

export const TIPOS_LAYOUT = [
  { id: 'standard', label: 'Estándar (4-5 viñetas balanceadas)' },
  { id: 'action', label: 'Acción Dinámica (diagonales / speed lines)' },
  { id: 'dialogue', label: 'Diálogo Intimista (planos medios y primeros planos)' },
  { id: 'splash', label: 'Splash Page (Gran viñeta de impacto a toda página)' },
  { id: 'double_splash', label: 'Doble Splash (Impacto a 2 páginas)' },
  { id: 'dramatic', label: 'Dramático / Tensión (viñetas alargadas y sombras)' },
  { id: 'transition', label: 'Transición / Silencio (planos detalle / ambiente)' },
  { id: 'cliffhanger', label: 'Cliffhanger / Cierre de impacto' }
]

export const ANGULOS_CAMARA = [
  'Plano general',
  'Plano medio',
  'Primer plano',
  'Plano detalle',
  'Plano picado',
  'Plano contrapicado',
  'Plano holandés / aberrante',
  'Plano americano',
  'Plano panorámico'
]

export const ESTILO_A_GENERO = {
  // Manga
  shonen_legendario: "Shōnen / Aventura",
  fantasia_oscura: "Fantasía Oscura",
  cyberpunk_209X: "Cyberpunk / Sci-Fi",
  anime_pastoral: "Romance / Slice of Life",
  mecha_clasico: "Mecha / Distopía",
  gotico_vampirico: "Terror / Sobrenatural",
  jidaigeki_samurai: "Histórico / Samurai",
  shojo_mistico: "Romance / Slice of Life",
  seinen_psicologico: "Seinen / Psicológico",
  cosmos_mitologico: "Shōnen / Aventura",
  belleza_melancolica: "Romance / Slice of Life",
  isekai_fantasia: "Shōnen / Aventura",
  kodomo_aventura: "Comedia / Humor",
  // Europeo
  mortadela_y_salchichon: "Comedia / Humor",
  superperez: "Comedia / Humor",
  el_capitan_rayo: "Histórico / Samurai",
  galos_y_druidas: "Comedia / Humor",
  franco_belga: "Shōnen / Aventura",
  indie_underground: "Seinen / Psicológico",
  // Americano
  hero_vintage_modern: "Acción / Artes Marciales",
  vigilante_nocturno: "Seinen / Psicológico",
  reloj_del_juicio: "Seinen / Psicológico",
  heroe_miltru: "Acción / Artes Marciales",
  barabaros: "Fantasía Oscura",
  us_vintage: "Acción / Artes Marciales",
}

export function obtenerGeneroPorEstilo(estiloId) {
  if (!estiloId) return "Shōnen / Aventura"
  const cleanId = String(estiloId).replace(/^aleatorio_/, '')
  return ESTILO_A_GENERO[cleanId] || "Shōnen / Aventura"
}

export const FLASH_PROJECT_IDEAS = {
  "Shōnen / Aventura": [
    "En un archipiélago de islas flotantes que pierden altitud cada década, un joven cartógrafo del viento halla el mapa prohibido hacia el Núcleo Primordial, perseguido por la guardia imperial aérea.",
    "Un herrero novato descubre que puede despertar las almas durmientes de armas rotas; al rescatar la espada de un héroe caído, hereda una deuda de honor que lo lleva a desafiar a los Nueve Campeones.",
    "En un mundo donde los cometas otorgan dones elementales a quienes tocan sus fragmentos, un chico sin poderes hereda el núcleo de una estrella extinta capaz de anular cualquier habilidad ajena.",
    "Una tripulación de jóvenes navegantes de tormentas busca las siete puertas del abismo marino para salvar a su pueblo de una maldición de piedra que avanza con la marea."
  ],
  "Seinen / Psicológico": [
    "Un detective retirado con un implante de memoria defectuoso revive los últimos minutos de las víctimas de un asesino en serie, descubriendo que los crímenes recrean sus propias pesadillas de infancia.",
    "Un cirujano brillante que pierde el pulso tras un atentado recibe una oferta clandestina: operar las mentes de criminales de élite extrayendo sus remordimientos como mercancía neurológica.",
    "En una metrópoli donde el valor social se mide por la predictibilidad emocional, un analista de datos descubre una anomalía humana que no puede ser clasificada por el algoritmo central.",
    "Un falsificador de arte descubre que sus cuadros reproducen con exactitud escenas de crímenes antes de que ocurran, convirtiéndose en el blanco simultáneo de la policía y el bajo mundo."
  ],
  "Fantasía Oscura": [
    "Los últimos guardianes de la llama de ceniza deben escoltar a una niña maldita cuyo llanto calcina ciudades enteras, asediados por una inquisición fanática que planea usarla como arma de asedio.",
    "En un reino sumergido en un eclipse perpetuo, un caballero renegado porta una armadura viva que se alimenta de sus recuerdos a cambio de la fuerza para cazar a los siete señores de la noche.",
    "Una orden de alquimistas herejes cosecha la sangre de deidades agonizantes en las profundidades de la tierra para forjar la única medicina que detiene la putrefacción del mundo.",
    "Tras caer el último bastión de la humanidad, un verdugo arrepentido pacta con una criatura del bosque sombrío para purgar a los nobles corruptos que entregaron la corona a los monstruos."
  ],
  "Cyberpunk / Sci-Fi": [
    "En los suburbios inundados de Neo-Kyoto, una mensajera cibernética intercepta un procesador biológico que alberga la conciencia fragmentada del fundador de la megacorporación hegemónica.",
    "Un hacker especializado en borrar identidades digitales acepta un último contrato y descubre que el objetivo a eliminar de los registros mundiales es su propia existencia física.",
    "En una estación orbital autosuficiente, un técnico de mantenimiento descubre que la inteligencia artificial reguladora ha estado clonando discretamente a los ciudadanos que mueren en accidentes.",
    "Un cazarrecompensas con prótesis militares obsoletas debe proteger a la primera androide que manifiesta sueños y creatividad artística espontánea ante un escuadrón de demolición corporativo."
  ],
  "Terror / Sobrenatural": [
    "En un internado aislado entre montañas nevadas, los alumnos descubren que a las 3:33 AM el espejo del salón principal intercambia a un estudiante con su reflejo hostil e idéntico.",
    "Una restauradora de libros antiguos recibe un grimorio encuadernado en piel humana cuyas páginas en blanco comienzan a escribir en tiempo real los secretos inconfesables de su familia.",
    "Un pueblo costero celebra un festival centenario donde todos deben usar máscaras de madera; un forastero descubre que al amanecer quienes se quitan la máscara ya no tienen rostro.",
    "Un empleado nocturno del metro de Tokio empieza a notar estaciones fantasma que solo aparecen cuando el tren viaja sin pasajeros en el último recorrido de medianoche."
  ],
  "Romance / Slice of Life": [
    "Dos mangakas rivales descubren por accidente que colaboran anónimamente en el webcómic más popular del momento, compitiendo en público mientras se enamoran a través de sus bocetos compartidos.",
    "Una talentosa barista con sinestesia y un pianista clásico con bloqueo creativo unen sus pasiones para crear una cafetería sensorial que transforma recuerdos en melodías y aromas.",
    "Un joven que hereda una papelería tradicional japonesa y una diseñadora gráfica hipermoderna deben convivir para salvar el negocio del barrio organizando talleres de encuadernación.",
    "Dos amigos de la infancia que prometieron encontrarse tras diez años se cruzan a diario en la misma estación de tren sin reconocerse, hasta que un cuaderno de notas extraviado los conecta."
  ],
  "Acción / Artes Marciales": [
    "El heredero de un dojo clandestino de kenjutsu prohibido debe participar en un torneo continental en las sombras para recuperar los pergaminos sagrados robados por un sindicato internacional.",
    "Un luchador callejero que utiliza un estilo de combate basado en el ritmo y el sonido descubre que su técnica es la clave ancestral para sellar a entidades que se alimentan del caos sonoro.",
    "En un valle custodiado por tres clanes rivales, un discípulo desterrado regresa con un arte marcial híbrido capaz de canalizar la energía de la naturaleza contra armas de fuego modernas.",
    "Una guardaespaldas de élite que juró no volver a empuñar una espada debe proteger al hijo de su antiguo enemigo a lo largo de un peligroso cruce fronterizo asediado por mercenarios."
  ],
  "Comedia / Humor": [
    "El temible Rey Demonio reencarna en el Japón moderno como el gato doméstico de una oficinista estresada, obligado a hacer travesuras cotidianas para ganar 'puntos de maldad' inútiles.",
    "Un grupo de supervillanos de serie B intenta abrir un restaurante de ramen para lavar dinero, pero la comida resulta tan deliciosa que se convierten en el local de moda de los superhéroes.",
    "Una princesa guerrera invocada a un instituto moderno se une al club de cocina creyendo que la repostería es un ritual mágico de guerra psicológica contra los exámenes trimestrales.",
    "Un nigromante incompetente que solo puede resucitar verduras parlantes se ve forzado a resolver misterios vecinales junto a un puerro que se cree detective victoriano."
  ],
  "Histórico / Samurai": [
    "Durante el ocaso del shogunato Tokugawa, un ronin ciego y una joven mensajera imperial deben custodiar el último tratado de paz a través de provincias sublevadas antes de la guerra.",
    "En la era Sengoku, una armera que forja katanas imbuidas con ceniza de santuarios sagrados es perseguida por un señor de la guerra que busca convertirlas en hojas inmortales.",
    "Un shinobi retirado que abrió una botica medicinal en Edo es chantajeado por su antiguo clan para una última misión de infiltración en el castillo del Shogun.",
    "Dos espadachines de escuelas opuestas traban una amistad inquebrantable sin saber que han sido contratados por señores feudales rivales para el duelo definitivo en la playa de Ganryu."
  ],
  "Mecha / Distopía": [
    "En una Tierra desértica asediada por colosos biomecánicos, una joven recolectora de chatarra reactiva un mecha titán clase Génesis que solo responde a las pulsaciones de su corazón.",
    "Pilotos de mechas tácticos descubren que el sistema de sincronización neuronal extrae las memorias felices de sus mentes para alimentar los reactores de combate durante la guerra.",
    "En una colonia subterránea, una brigada de perforadores utiliza excavadoras acorazadas gigantes para defender los últimos acuíferos de enjambres de insectoides cibernéticos.",
    "Un viejo piloto veterano y una cadete rebelde deben pilotar un mecha biplaza legendario pero inestable para romper el bloqueo que asfixia a la última ciudadela flotante."
  ]
}

export const FLASH_CHAPTER_IDEAS = {
  intro: [
    "Ruptura de la rutina: El protagonista experimenta un suceso anómalo en su jornada ordinaria que revela un objeto o secreto prohibido, provocando el primer ataque enemigo y forzando su huida.",
    "Llamada al destino: Tras el colapso de su entorno seguro, el héroe se encuentra con un mentor misterioso que le encomienda una misión crítica antes de que el peligro se extienda.",
    "El incidente detonante: Un enfrentamiento imprevisto en un mercado o callejón expone el potencial latente del protagonista, sellando su compromiso con la causa.",
    "El pacto inicial: Ante una amenaza insuperable, el protagonista toma una decisión extrema y acepta una alianza o poder peligroso que cambia el rumbo de su vida."
  ],
  middle: [
    "Infiltración y trampa: El equipo se infiltra en territorio enemigo para conseguir información vital, pero una emboscada revela la presencia de un informante en sus propias filas.",
    "Prueba de fuego: El protagonista se enfrenta a un rival implacable cuyas convicciones desafían directamente sus ideales; la batalla deja lecciones amargas y un arma dañada.",
    "Revelación del pasado: El descubrimiento de unas ruinas o un archivo secreto arroja luz sobre el verdadero origen del conflicto, redefiniendo las lealtades del grupo.",
    "Crisis y sacrificio táctico: Acorralados por una fuerza superior, uno de los aliados arriesga su posición para abrir una ruta de escape en medio de un colapso inminente.",
    "Dilema moral: Los personajes deben elegir entre asegurar el objetivo principal de la misión o rescatar a un grupo de inocentes atrapados en el fuego cruzado."
  ],
  climax: [
    "Confrontación decisiva: En el epicentro del conflicto, los protagonistas y el antagonista chocan con su máxima técnica en un duelo donde cada viñeta define el destino del mundo.",
    "El giro maestro: El plan del villano parece completarse hasta que un detalle sembrado en los primeros compases es detonado por el protagonista para revertir el colapso.",
    "Resolución épica y despedida: El clímax de la batalla exige un coste personal definitivo; el polvo se asienta revelando un nuevo horizonte de esperanza y madurez.",
    "El golpe final de impacto: Superando sus propios límites físicos, el héroe ejecuta una estrategia combinada con sus camaradas para sellar la amenaza definitivamente."
  ]
}

/**
 * Devuelve una sugerencia aleatoria de premisa general de proyecto adaptada al género y tono.
 */
export function obtenerIdeaPremisa(genero, tono, ideaActual = '') {
  const listaGenero = FLASH_PROJECT_IDEAS[genero] || FLASH_PROJECT_IDEAS["Shōnen / Aventura"]
  const candidatas = listaGenero.filter(idea => idea !== ideaActual)
  const pool = candidatas.length > 0 ? candidatas : listaGenero
  const index = Math.floor(Math.random() * pool.length)
  return pool[index]
}

/**
 * Devuelve una sugerencia rápida para un capítulo según su posición (Cap 1, Intermedio o Final).
 */
export function obtenerIdeaCapitulo(numCapitulo, totalCapitulos = 5, ideaActual = '') {
  const num = parseInt(numCapitulo, 10) || 1
  const total = Math.max(1, parseInt(totalCapitulos, 10) || 5)

  let tipo = 'middle'
  if (num === 1) {
    tipo = 'intro'
  } else if (num >= total) {
    tipo = 'climax'
  }

  const lista = FLASH_CHAPTER_IDEAS[tipo] || FLASH_CHAPTER_IDEAS.middle
  const candidatas = lista.filter(idea => idea !== ideaActual)
  const pool = candidatas.length > 0 ? candidatas : lista
  const index = Math.floor(Math.random() * pool.length)
  return pool[index]
}
