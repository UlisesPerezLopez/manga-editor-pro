"""
Catálogo Legendario de Estilos (MEP) - 100% Genérico y Libre de Copyright.
Proporciona prompts adaptados para LLMs (guion/diálogo) y FLUX.1 (imágenes).
"""

LEGENDARY_PRESETS = {
    "shonen_legendario": {
        "nombre_ui": "Shōnen Legendario",
        "subtitulo": "Espíritu marcial, superación física y energía desbordante",
        "escuela": "manga",
        "icono": "/assets/legendary_styles/shonen_legendario.png",
        "prompt_guion": (
            "Tono heroico juvenil de artes marciales y superación. Enfoque en la perseverancia, "
            "vínculos inquebrantables, determinación visceral y enfrentamientos contra adversarios de convicciones opuestas. "
            "Diálogos viscerales, directos, con gritos de convicción y remates de alto impacto emocional."
        ),
        "prompt_imagen": (
            "manga artstyle, dynamic action shonen panel, bold energetic ink lines, speed lines, "
            "screentone shading, high contrast black and white inks, intense facial expressions, "
            "kinetic impact frame, Japanese graphic novel masterpiece"
        )
    },
    "fantasia_oscura": {
        "nombre_ui": "Fantasía Oscura",
        "subtitulo": "Trama densa de plumilla, fatalismo y armaduras desgastadas",
        "escuela": "manga",
        "icono": "/assets/legendary_styles/fantasia_oscura.png",
        "prompt_guion": (
            "Tono de fantasía oscura y cruda. Dilemas morales sin salida, atmósfera opresiva, "
            "supervivencia extrema y fatalismo. Diálogos cortantes, reflexiones internas sobre "
            "el dolor, la ambición desmedida y la pérdida de la humanidad."
        ),
        "prompt_imagen": (
            "dark fantasy manga style, intricate cross-hatching, heavy black ink shadows, gritty medieval textures, "
            "grim atmospheric lighting, visceral detailed lineart, masterfully inked panels, gothic masterpiece"
        )
    },
    "cyberpunk_209X": {
        "nombre_ui": "Cyberpunk 209X",
        "subtitulo": "Cables expuestos, megalópolis sombrías y cibernética",
        "escuela": "manga",
        "icono": "/assets/legendary_styles/cyberpunk_209X.png",
        "prompt_guion": (
            "Ciencia ficción distópica y ciberpunk filosófico. Temas de transhumanismo, corporaciones "
            "omnipresentes, soledad urbana y mejoras sintéticas. Lenguaje técnico, argot marginal y conversaciones existenciales."
        ),
        "prompt_imagen": (
            "cyberpunk manga aesthetic, 90s anime linework, ultra-detailed mechanical cables, cybernetic augmentations, "
            "harsh architectural cityscapes, solid ink blacks with halftone dot screens, mechanical sci-fi masterpiece"
        )
    },
    "anime_pastoral": {
        "nombre_ui": "Naturaleza Espiritual",
        "subtitulo": "Espíritus del bosque, melancolía y entornos orgánicos",
        "escuela": "manga",
        "icono": "/assets/legendary_styles/anime_pastoral.png",
        "prompt_guion": (
            "Narrativa contemplativa y pastoral. Convivencia entre la civilización y las fuerzas naturales, "
            "protagonistas empáticos, determinación pacífica y asombro infantil. Diálogos sensibles, sutiles y evocadores."
        ),
        "prompt_imagen": (
            "hand-drawn pastoral anime style, organic clean ink outlines, painterly background feeling, lush greenery textures, "
            "whimsical spirit creatures, soft clean comic lines, atmospheric pastoral visual feeling"
        )
    },
    "mecha_clasico": {
        "nombre_ui": "Mecha Clásico",
        "subtitulo": "Blindajes angulares, robots gigantes y disciplina táctica",
        "escuela": "manga",
        "icono": "/assets/legendary_styles/mecha_clasico.png",
        "prompt_guion": (
            "Guerra biomecánica y drama bélico. Pilotos bajo presión psicológica extrema, jerarquías "
            "militares estrictas y advertencias contra la tecnología descontrolada. Diálogos estratégicos y códigos tácticos."
        ),
        "prompt_imagen": (
            "retro mecha manga style, angular giant robot plating, hydraulic joints, forced dynamic isometric perspective, "
            "bold industrial inking, metallic sheen lineart, classic anime mechanical design"
        )
    },
    "gotico_vampirico": {
        "nombre_ui": "Gótico Vampírico",
        "subtitulo": "Claroscuro absoluto, elegancia aristocrática y crueldad",
        "escuela": "manga",
        "icono": "/assets/legendary_styles/gotico_vampirico.png",
        "prompt_guion": (
            "Terror gótico de acción aristocrática. Cazadores de monstruos implacables, maldiciones "
            "ancestrales y solemnidad teatral. Monólogos mordaces, sarcasmo refinado y sentencias de muerte poéticas."
        ),
        "prompt_imagen": (
            "high-contrast gothic manga inking, pure solid pitch-black shadows, extreme sharp silhouettes, Victorian collar details, "
            "stylized sinister eyes, radical noir balance, occult graphic novel panel"
        )
    },
    "jidaigeki_samurai": {
        "nombre_ui": "Jidaigeki Samurai",
        "subtitulo": "Pinceladas sumi-e, honor marcial y filos al alba",
        "escuela": "manga",
        "icono": "/assets/legendary_styles/jidaigeki_samurai.png",
        "prompt_guion": (
            "Drama histórico de samuráis y ninjas. Código del Bushido, expiación de pecados pasados, "
            "lealtad quebrantada y filosofía zen. Frases breves, silencios significativos y máxima tensión antes del desenfunde."
        ),
        "prompt_imagen": (
            "jidaigeki samurai comic style, traditional sumi-e ink splatter strokes, dynamic katana cut arcs, bamboo forest atmosphere, "
            "delicate brushwork, historical Edo period manga art"
        )
    },
    "shojo_mistico": {
        "nombre_ui": "Shōjo Místico",
        "subtitulo": "Transformaciones astrales, romance etéreo y destellos",
        "escuela": "manga",
        "icono": "/assets/legendary_styles/shojo_mistico.png",
        "prompt_guion": (
            "Magical girl y romance lírico. Sentimientos profundos, destino cósmico, sacrificio por amor "
            "y elegancia etérea. Diálogos poéticos, confesiones emotivas y exaltación de la bondad intrínseca."
        ),
        "prompt_imagen": (
            "classic shojo manga aesthetic, slender graceful silhouettes, celestial stars and floating rose petals, "
            "luminous crystal reflections, ornate fine ink linework, large expressive starry eyes"
        )
    },
    "seinen_psicologico": {
        "nombre_ui": "Seinen Psicológico",
        "subtitulo": "Partidas mentales, encuadres forenses y tensión sobria",
        "escuela": "manga",
        "icono": "/assets/legendary_styles/seinen_psicologico.png",
        "prompt_guion": (
            "Thriller intelectual y suspenso criminal. Manipulación psicológica, investigaciones forenses "
            "y deducción fría. Monólogos internos minuciosos analizando cada movimiento del oponente."
        ),
        "prompt_imagen": (
            "cinematic seinen manga panels, realistic facial proportions, intense psychological gazes, meticulous hatching, "
            "dramatic interrogation room lighting, fine technical pen precision"
        )
    },
    "cosmos_mitologico": {
        "nombre_ui": "Cosmos Mitológico",
        "subtitulo": "Armaduras sagradas, constelaciones y mitos ancestrales",
        "escuela": "manga",
        "icono": "/assets/legendary_styles/cosmos_mitologico.png",
        "prompt_guion": (
            "Epopeya mitológica caballeresca. Guerreros juramentados protegiendo a deidades benevolentes, "
            "combates basados en cosmos estelares y resistencia heroica ante el sufrimiento físico."
        ),
        "prompt_imagen": (
            "mythological anime warrior style, reflective ornate metallic armor plating, constellation star map auras, "
            "angular dynamic heroic poses, retro 80s heroic linework aesthetic"
        )
    },
    "belleza_melancolica": {
        "nombre_ui": "Belleza Melancólica",
        "subtitulo": "Detalle textil primoroso, luz crepuscular y cartas íntimas",
        "escuela": "manga",
        "icono": "/assets/legendary_styles/belleza_melancolica.png",
        "prompt_guion": (
            "Drama intimista de época posbélica. Búsqueda del significado del amor, redención "
            "emocional y empatía hacia los incomprendidos. Diálogos ceremoniosos y educados."
        ),
        "prompt_imagen": (
            "ultra-detailed Kyoto studio inspired artstyle, exquisite fabric folds, delicate hair strands, warm ambient lighting, "
            "shallow depth of field, tender emotional expressions, masterpiece linework"
        )
    },
    "isekai_fantasia": {
        "nombre_ui": "Isekai Fantasía",
        "subtitulo": "Reinos mágicos, gremios de aventureros y runas arcanas",
        "escuela": "manga",
        "icono": "/assets/legendary_styles/isekai_fantasia.png",
        "prompt_guion": (
            "Aventura de rol y fantasía medieval estilizada. Leyes de magia precisas, rangos de aventureros, "
            "vida cotidiana en tabernas y viajes a mazmorras inexploradas. Balance entre humor ligero y táctica."
        ),
        "prompt_imagen": (
            "modern fantasy light novel manga style, crisp clean digital lines, glowing magic summoning runes, "
            "charming medieval fantasy equipment, vibrant screentones, contemporary anime art"
        )
    },
    "kodomo_aventura": {
        "nombre_ui": "Kodomo Aventura",
        "subtitulo": "Compañeros fantásticos, humor entrañable y optimismo",
        "escuela": "manga",
        "icono": "/assets/legendary_styles/kodomo_aventura.png",
        "prompt_guion": (
            "Narrativa accesible para todos los públicos. Descubrimiento del mundo, criaturas con "
            "habilidades singulares, travesuras y resolución pacífica de conflictos. Diálogos cómicos y enérgicos."
        ),
        "prompt_imagen": (
            "kodomo manga style, rounded adorable shapes, thick cheerful cartoon outlines, expressive bouncy anatomy, "
            "whimsical creature companion, bright flat textures, clean readable panels"
        )
    },
    "mortadela_y_salchichon": {
        "nombre_ui": "Humor Bruguera Slapstick",
        "subtitulo": "Disfraces disparatados, dinamita y persecuciones frenéticas",
        "escuela": "europeo",
        "icono": "/assets/legendary_styles/mortadela_y_salchichon.png",
        "prompt_guion": (
            "Comedia de enredo absurdo y slapstick ibérico. Malentendidos continuos entre subordinados "
            "torpes y directores coléricos. Insultos castizos tradicionales, explicaciones ridículas y huidas finales."
        ),
        "prompt_imagen": (
            "classic Spanish caricature comic style, Escuela Bruguera aesthetic, Francisco Ibáñez cartoon art, "
            "thick expressive black ink contours, clean flat primary colors, humorous dynamic cartoon character, "
            "lively comic panel composition, traditional European comic coloring"
        )
    },
    "superperez": {
        "nombre_ui": "Superhéroe Cotidiano",
        "subtitulo": "Parodia de oficina, vuelos torpes y villanos domésticos",
        "escuela": "europeo",
        "icono": "/assets/legendary_styles/superperez.png",
        "prompt_guion": (
            "Sátira social y parodia heroica. Un oficinista anodino con capa y escudo que lidia con "
            "amenazas interplanetarias entre sorbos de café. Pragmatismo frente a discursos grandilocuentes."
        ),
        "prompt_imagen": (
            "expressive satirical comic art, lively curving ink stroke, slouching heroic posture with oversized flowing cape, "
            "bustling detailed city backdrop, cartoonish charm, vintage European comic printing"
        )
    },
    "el_capitan_rayo": {
        "nombre_ui": "Cruzada Aventurera",
        "subtitulo": "Honor medieval, rescates leales y espadachines andantes",
        "escuela": "europeo",
        "icono": "/assets/legendary_styles/el_capitan_rayo.png",
        "prompt_guion": (
            "Aventura clásica de espadachines y caballeros andantes. Defensa del débil, compañerismo "
            "inquebrantable en combate y travesías marítimas. Prosa noble, lemas de honor y valor frente al peligro."
        ),
        "prompt_imagen": (
            "classic mid-century European adventure comic, detailed pen and ink hatching, muscular chivalric knights, heraldic shields, "
            "dramatic broadsword fencing clashes, historic castle backgrounds, realistic pulp lineart"
        )
    },
    "galos_y_druidas": {
        "nombre_ui": "Bande Dessinée Gala",
        "subtitulo": "Aldeas indomables, pócimas de fuerza y banquetes al jabalí",
        "escuela": "europeo",
        "icono": "/assets/legendary_styles/galos_y_druidas.png",
        "prompt_guion": (
            "Comedia histórica ingeniosa y aventuras clásicas galas. Astucia combinada con "
            "fuerza prodigiosa para desbaratar legiones enteras. Juegos de palabras satíricos y festejos comunitarios."
        ),
        "prompt_imagen": (
            "classic Franco-Belgian master comic art, bouncy expressive caricatures, historical Celtic iron helmets, "
            "magnificent ink line weight variations, rich lively crowd scenes, clean gouache coloring"
        )
    },
    "franco_belga": {
        "nombre_ui": "Línea Clara Clásica",
        "subtitulo": "Contorno uniforme, expedición documental y precisión geométrica",
        "escuela": "europeo",
        "icono": "/assets/legendary_styles/franco_belga.png",
        "prompt_guion": (
            "Misterio de investigación y expedición geográfica rigurosa. Respeto al método deductivo, "
            "periodismo comprometido y sobriedad. Diálogos meticulosos, cultos y medidos."
        ),
        "prompt_imagen": (
            "pure Ligne Claire comic style, uniform black line weight without shading or gradients, architectural geometric precision, "
            "perfect flat colors, realistic vehicles and environments, vintage European album aesthetic"
        )
    },
    "indie_underground": {
        "nombre_ui": "Novela Gráfica Gritty",
        "subtitulo": "Plumilla libre, existencialismo urbano y trazo desgarrado",
        "escuela": "europeo",
        "icono": "/assets/legendary_styles/indie_underground.png",
        "prompt_guion": (
            "Realismo sucio y memoria autobiográfica. Soledad en pequeños apartamentos, desamor, "
            "crisis vocacionales y reflexiones poéticas cotidianas. Diálogos coloquiales y honestidad descarnada."
        ),
        "prompt_imagen": (
            "gritty indie graphic novel art, scratchy unrefined dip-pen hatching, heavy ink bleed textures, raw expressive brushwork, "
            "moody underground comic feeling, matte off-white paper tone"
        )
    },
    "hero_vintage_modern": {
        "nombre_ui": "Justiciero Mutante",
        "subtitulo": "Perspectivas forzadas, telarañas de sombras y sacrificio moral",
        "escuela": "americano",
        "icono": "/assets/legendary_styles/hero_vintage_modern.png",
        "prompt_guion": (
            "Drama heroico de gran responsabilidad y rechazo social. Héroes con problemas cotidianos "
            "luchando por una sociedad que no los comprende. Monólogos dinámicos en combate y dramatismo ético."
        ),
        "prompt_imagen": (
            "classic American bronze-age comic book art, dynamic foreshortening, detailed muscle anatomy, dramatic cross-hatch shading, "
            "striking primary colored spandex, webbed and armored textures, energetic superhero composition"
        )
    },
    "vigilante_nocturno": {
        "nombre_ui": "Vigilante de la Noche",
        "subtitulo": "Gárgolas bajo la lluvia, mente deductiva y sombras implacables",
        "escuela": "americano",
        "icono": "/assets/legendary_styles/vigilante_nocturno.png",
        "prompt_guion": (
            "Vigilantismo detectivesco en metrópolis corruptas. Juramentos inquebrantables, adversarios "
            "con patologías psiquiátricas complejas y dolor interior. Prosa seca y análisis criminal meticuloso."
        ),
        "prompt_imagen": (
            "noir superhero comic art, deep pitch black ink shadows, jagged cowl silhouettes against rain, architectural gothic spires, "
            "high-contrast moody cityscapes, classic graphic novel noir masterpiece"
        )
    },
    "reloj_del_juicio": {
        "nombre_ui": "Realismo Deconstructivo",
        "subtitulo": "Retícula estricta, cinismo geopolítico y tiempo fragmentado",
        "escuela": "americano",
        "icono": "/assets/legendary_styles/reloj_del_juicio.png",
        "prompt_guion": (
            "Deconstrucción psicológica del arquetipo de superhéroe en tiempos de guerra fría. Figuras "
            "enmascaradas con taras morales, nihilismo o pragmatismo homicida. Citas literarias y diarios personales."
        ),
        "prompt_imagen": (
            "sober realistic comic book art, strict balanced panel composition, calculated precise inking, unexaggerated human anatomy, "
            "subdued realistic colors, graphic novel narrative masterpiece"
        )
    },
    "heroe_miltru": {
        "nombre_ui": "Fuerza Devastadora",
        "subtitulo": "Líneas ultra-limpias, cinética brutal y consecuencias reales",
        "escuela": "americano",
        "icono": "/assets/legendary_styles/heroe_miltru.png",
        "prompt_guion": (
            "Narrativa contemporánea de superhéroes viscerales. Consecuencias físicas y letales directas, "
            "conflictos filiales traumáticos e invasiones cósmicas despiadadas. Diálogos modernos y directos."
        ),
        "prompt_imagen": (
            "modern dynamic superhero comic style, ultra-clean bold contour lines, vibrant flat color fills, "
            "explosive kinetic shockwaves, pristine line precision with visceral combat power"
        )
    },
    "barabaros": {
        "nombre_ui": "Espada y Brujería Salvaje",
        "subtitulo": "Furia primitiva, anatomía hercúlea y civilizaciones en ruinas",
        "escuela": "americano",
        "icono": "/assets/legendary_styles/barabaros.png",
        "prompt_guion": (
            "Supervivencia primitiva contra sacerdotes hechiceros y deidades arcaicas. El filo de la espada "
            "frente a la decadencia de imperios corrompidos. Prosa pulp rítmica, juramentos primitivos y combate salvaje."
        ),
        "prompt_imagen": (
            "epic 70s sword and sorcery fantasy comic art, heavy ink brushwork, raw leather and fur textures, "
            "towering ancient ruined temples, muscular brutal combat stance, heroic fantasy linework"
        )
    },
    "us_vintage": {
        "nombre_ui": "Edad Dorada Gráfica",
        "subtitulo": "Puntos Ben-Day, tramas de imprenta retro e impacto pop",
        "escuela": "americano",
        "icono": "/assets/legendary_styles/us_vintage.png",
        "prompt_guion": (
            "Heroísmo altruista de la Edad de Plata. Científicos ilustres, invasiones desde el espacio exterior, "
            "bases secretas y optimismo ante el progreso. Exclamaciones solemnes y proclamas de libertad."
        ),
        "prompt_imagen": (
            "vintage 1960s pop comic book style, visible Ben-Day halftone dot printing pattern, bold flat primary inks, "
            "aged pulp paper background texture, dynamic cosmic krackle effects, retro classic comic cover"
        )
    }
}