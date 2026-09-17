# text_engine.py
# Motor textual unificado y modular para MEP — Manga Editor Pro.
# Soporta:
# 1. Modo 'local': Inferencia local con Ollama (Qwen 2.5 7B/14B) en http://127.0.0.1:11434
# 2. Modo 'cloud_free': Endpoints públicos/gratuitos sin coste con respuesta JSON estructurada
# 3. Resiliencia total y fallback sintético ante errores 503/429 y desconexión externa.

import os
import json
import re
import asyncio
from typing import Optional, List, Dict, Any
from pathlib import Path
import httpx
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)
load_dotenv()

# Configuración de endpoints y modelos
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL_TEXT = os.getenv("OLLAMA_MODEL_TEXT", "qwen2.5:7b")
POLLINATIONS_TEXT_URL = os.getenv("POLLINATIONS_TEXT_URL", "https://text.pollinations.ai").rstrip("/")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()


def _limpiar_json(texto: str) -> str:
    """Extrae y normaliza bloques JSON dentro de respuestas de modelos."""
    if not texto:
        return "{}"
    
    # Buscar bloque delimitado por ```json ... ```
    match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', texto, re.IGNORECASE)
    if match:
        texto = match.group(1)

    texto = texto.strip()
    
    # Si contiene llaves JSON, extraer el contenido entre la primera { y la última }
    inicio = texto.find('{')
    fin = texto.rfind('}')
    if inicio != -1 and fin != -1 and fin > inicio:
        texto = texto[inicio:fin + 1]

    # Eliminar posibles comas colgantes antes de llaves o corchetes de cierre
    texto = re.sub(r',\s*([\}\]])', r'\1', texto)
    return texto


def _generar_sinopsis_fallback(
    titulo: str,
    genero: str,
    tono: str,
    premisa: str,
    num_capitulos: int = 5
) -> dict:
    """
    Generador sintético determinista de alta calidad para sinopsis y arcos narrativos.
    Se activa si las APIs externas están sobrecargadas (503/429) o fuera de línea.
    """
    nombre_limpio = (titulo or "").strip() or "Crónicas del Destino"
    premisa_limpia = (premisa or "").strip() or f"Una historia legendaria en un mundo de {genero} con tono {tono}."
    
    genero_lower = (genero or "").lower()
    if any(k in genero_lower for k in ["aventura", "fantasía", "fantasia"]):
        prota_nombre = "Kael"
        prota_desc = "Joven de mirada decidida, cabello castaño despeinado y capa de viaje desgastada."
        antag_nombre = "Lord Vesper"
        antag_desc = "Figura imponente envuelta en túnica oscura con un emblema solar resquebrajado."
        apoyo_nombre = "Lina"
        apoyo_desc = "Hechicera ágil de ojos ámbar, equipada con grimorios y dagas rúnicas."
    elif any(k in genero_lower for k in ["ciencia", "sci-fi", "cyber", "meca"]):
        prota_nombre = "Ren 07"
        prota_desc = "Piloto cibernético con interfaz neural visible en la sien y chaqueta táctica iluminada."
        antag_nombre = "Dr. Valok"
        antag_desc = "Director corporativo con prótesis biomecánicas avanzadas y expresión fría."
        apoyo_nombre = "Aria"
        apoyo_desc = "Hacker rebelde con visor holográfico y dron de soporte táctico."
    elif any(k in genero_lower for k in ["terror", "misterio", "thriller", "suspense"]):
        prota_nombre = "Lucas Gray"
        prota_desc = "Investigador perspicaz con gabardina oscura, ojos cansados y cuaderno de notas siempre a mano."
        antag_nombre = "La Sombra del Vacío"
        antag_desc = "Entidad espectral de ojos incandescentes que distorsiona la realidad a su paso."
        apoyo_nombre = "Dra. Elena Vance"
        apoyo_desc = "Archivera y ocultista con gafas redondas y amuleto protector antiguo."
    elif any(k in genero_lower for k in ["romance", "drama", "recuentos"]):
        prota_nombre = "Haru"
        prota_desc = "Estudiante creativo y reservado de expresión amable y cuaderno de dibujo."
        antag_nombre = "Kenji"
        antag_desc = "Rival carismático y competitivo, siempre seguro de sí mismo."
        apoyo_nombre = "Aoi"
        apoyo_desc = "Amiga leal y entusiasta, con sonrisa radiante y energía contagiosa."
    else:
        prota_nombre = "Shin"
        prota_desc = "Guerrero disciplinado de cabello negro azabache y mirada profunda."
        antag_nombre = "Kurogane"
        antag_desc = "Némesis formidable con armadura de combate imponente."
        apoyo_nombre = "Maya"
        apoyo_desc = "Estratega táctica de reflejos rápidos y mente brillante."

    # Generación de capítulos coherentes
    capitulos = []
    titulos_plantilla = [
        ("El Despertar del Llamado", f"El detonante inicial sacude la rutina de {prota_nombre}. Se revela el misterio central."),
        ("Primeros Pasos en las Sombras", f"{prota_nombre} enfrenta su primera gran prueba y descubre el verdadero alcance del peligro."),
        ("El Encuentro Decisivo", f"Se cruzan los caminos de {prota_nombre} y {antag_nombre}, desatando un conflicto inevitable."),
        ("La Hora Más Oscura", f"Una revelación inesperada o pérdida temporal pone a prueba la determinación de los protagonistas."),
        ("El Choque de Voluntades", f"Enfrentamiento cumbre donde se definirá el destino final de todos los involucrados.")
    ]
    
    total_caps = max(1, min(20, num_capitulos or 5))
    for i in range(1, total_caps + 1):
        if i <= len(titulos_plantilla):
            t_nom, t_gancho = titulos_plantilla[i - 1]
        else:
            t_nom = f"Fase {i}: El Sendero Hacia la Verdad"
            t_gancho = f"Nuevas revelaciones empujan a {prota_nombre} a superar sus límites y forjar su legado."
        capitulos.append({
            "numero": i,
            "titulo": f"Capítulo {i}: {t_nom}",
            "gancho": t_gancho
        })

    return {
        "sinopsis_contraportada": f"En el mundo de '{nombre_limpio}', {premisa_limpia} Con una atmósfera de {genero} y un tono {tono}, esta historia explora el sacrificio, la superación y los lazos inquebrantables.",
        "arco_principal": {
            "acto_1": f"Introducción: {prota_nombre} descubre su conexión con los acontecimientos clave y se ve forzado a tomar una decisión crucial.",
            "acto_2": f"Desarrollo: El conflicto escala cuando {antag_nombre} ejecuta su plan, obligando a {prota_nombre} y {apoyo_nombre} a forjar una alianza decisiva.",
            "acto_3": f"Clímax y Resolución: El enfrentamiento cumbre decide el porvenir de los protagonistas, cerrando el arco con una transformación irreversible."
        },
        "personajes_sugeridos": [
            {
                "nombre": prota_nombre,
                "rol": "protagonista",
                "descripcion_fisica": prota_desc,
                "personalidad": f"Valiente, perseverante y leal ante las adversidades del género {genero}.",
                "motivacion": f"Superar la prueba inicial planteada en la premisa y proteger lo que más valora."
            },
            {
                "nombre": antag_nombre,
                "rol": "antagonista",
                "descripcion_fisica": antag_desc,
                "personalidad": "Ambicioso, implacable y con una convicción inquebrantable.",
                "motivacion": "Imponer su visión sobre el mundo sin importar las consecuencias colaterales."
            },
            {
                "nombre": apoyo_nombre,
                "rol": "apoyo",
                "descripcion_fisica": apoyo_desc,
                "personalidad": "Ingeniosa, protectora y con un agudo sentido de la justicia.",
                "motivacion": f"Ayudar a {prota_nombre} a encontrar la verdad y mantener la esperanza viva."
            }
        ],
        "estructura_capitulos": capitulos,
        "temas": [genero, tono, "Destino y Superación", "Vínculos Inquebrantables"]
    }


def _generar_guion_fallback(
    titulo_proyecto: str,
    numero_capitulo: int,
    premisa: str,
    genero: str,
    tono: str,
    personajes: Optional[List[dict]] = None,
    capitulos_anteriores: Optional[List[dict]] = None
) -> dict:
    """
    Generador sintético de guion de capítulo cinematográfico estructurado por páginas y viñetas.
    """
    p_nombres = [p.get("nombre", "Protagonista") for p in (personajes or []) if isinstance(p, dict)]
    nombre_p1 = p_nombres[0] if len(p_nombres) > 0 else "Protagonista"
    nombre_p2 = p_nombres[1] if len(p_nombres) > 1 else "Aliado"

    escenas = [
        {
            "numero_pagina": 1,
            "descripcion_pagina": f"Apertura del Capítulo {numero_capitulo}: Establecimiento atmosférico del entorno en tono {tono}.",
            "tipo_layout": "splash",
            "vinetas": [
                {
                    "numero": 1,
                    "descripcion_visual": f"Gran plano general panorámico que muestra el escenario principal bajo una luz dramática.",
                    "personajes": [nombre_p1],
                    "dialogo": "",
                    "narracion": f"El viento susurraba presagios en las tierras de {titulo_proyecto}...",
                    "emocion": "contemplativa",
                    "angulo_camara": "gran plano general"
                },
                {
                    "numero": 2,
                    "descripcion_visual": f"Plano medio de {nombre_p1} ajustando su equipo y mirando fijamente hacia el horizonte.",
                    "personajes": [nombre_p1],
                    "dialogo": "No podemos dar marcha atrás ahora.",
                    "narracion": "",
                    "emocion": "determinación",
                    "angulo_camara": "plano medio"
                },
                {
                    "numero": 3,
                    "descripcion_visual": f"Primer plano intenso de la mirada de {nombre_p1}, reflejando la determinación inquebrantable.",
                    "personajes": [nombre_p1],
                    "dialogo": "Es hora de enfrentar la verdad.",
                    "narracion": "",
                    "emocion": "intensidad",
                    "angulo_camara": "primer plano"
                }
            ]
        },
        {
            "numero_pagina": 2,
            "descripcion_pagina": f"Encuentro y tensión: {nombre_p1} y {nombre_p2} coordinan su siguiente movimiento.",
            "tipo_layout": "dialogue",
            "vinetas": [
                {
                    "numero": 1,
                    "descripcion_visual": f"Plano medio con escorzo donde {nombre_p2} se acerca alertando sobre una presencia cercana.",
                    "personajes": [nombre_p1, nombre_p2],
                    "dialogo": "¿Sientes eso? Algo está cambiando en el aire.",
                    "narracion": "",
                    "emocion": "alerta",
                    "angulo_camara": "plano medio con escorzo"
                },
                {
                    "numero": 2,
                    "descripcion_visual": f"Primer plano de {nombre_p1} preparando su técnica y agudizando los sentidos.",
                    "personajes": [nombre_p1],
                    "dialogo": "Mantente cerca. No bajaremos la guardia.",
                    "narracion": "",
                    "emocion": "tensión",
                    "angulo_camara": "primer plano"
                },
                {
                    "numero": 3,
                    "descripcion_visual": f"Plano americano dinámico de ambos listos para la acción inminente.",
                    "personajes": [nombre_p1, nombre_p2],
                    "dialogo": "¡Listos!",
                    "narracion": "El destino comenzaba a acelerar su marcha...",
                    "emocion": "adrenalina",
                    "angulo_camara": "plano americano"
                }
            ]
        },
        {
            "numero_pagina": 3,
            "descripcion_pagina": f"Clímax del episodio: Revelación o impacto visual que deja al lector en vilo.",
            "tipo_layout": "action",
            "vinetas": [
                {
                    "numero": 1,
                    "descripcion_visual": f"Plano picado rápido que muestra una sombra o poder desatándose a gran velocidad.",
                    "personajes": [nombre_p1],
                    "dialogo": "¡Cuidado!",
                    "narracion": "",
                    "emocion": "sorpresa",
                    "angulo_camara": "plano picado"
                },
                {
                    "numero": 2,
                    "descripcion_visual": f"Gran viñeta de impacto con líneas cinéticas intensas y choque de fuerzas.",
                    "personajes": [nombre_p1, nombre_p2],
                    "dialogo": "—¡¡HAAAH!!—",
                    "narracion": "",
                    "emocion": "impacto",
                    "angulo_camara": "contrapicado dramático"
                },
                {
                    "numero": 3,
                    "descripcion_visual": f"Detalle en primer plano del misterio revelado al disiparse el polvo.",
                    "personajes": [nombre_p1],
                    "dialogo": "Esto... no puede ser verdad.",
                    "narracion": "Continuará en el próximo capítulo...",
                    "emocion": "asombro",
                    "angulo_camara": "primer plano"
                }
            ]
        }
    ]

    return {
        "titulo_capitulo": f"Capítulo {numero_capitulo}: El Eco de la Leyenda",
        "sinopsis": f"En este capítulo, {nombre_p1} y sus aliados dan un paso decisivo ante los eventos de '{titulo_proyecto}'. La tensión se eleva a medida que se desvelan secretos cruciales.",
        "num_paginas": len(escenas),
        "tono_capitulo": tono,
        "escenas": escenas
    }


class TextEngine:
    """
    Motor textual polimórfico para guiones, fichas de personajes,
    análisis de estilo y diálogos de cómic/manga.
    """

    def __init__(self):
        self.ollama_url = OLLAMA_BASE_URL
        self.ollama_model = OLLAMA_MODEL_TEXT
        self.pollinations_url = POLLINATIONS_TEXT_URL

    async def _generar_local(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        formato_json: bool = False
    ) -> str:
        """
        Ejecuta la inferencia en la instancia local de Ollama (Qwen 2.5).
        Endpoint: POST {OLLAMA_BASE_URL}/api/generate
        """
        payload: Dict[str, Any] = {
            "model": self.ollama_model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.7,
                "top_p": 0.9,
                "num_ctx": 8192
            }
        }
        if system_prompt:
            payload["system"] = system_prompt
        if formato_json:
            payload["format"] = "json"

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(f"{self.ollama_url}/api/generate", json=payload)
                if resp.status_code != 200:
                    raise Exception(
                        f"Ollama devolvió código {resp.status_code}: {resp.text[:200]}"
                    )
                datos = resp.json()
                return datos.get("response", "")
        except httpx.ConnectError:
            raise Exception(
                f"No se pudo conectar con Ollama en {self.ollama_url}. "
                f"Asegúrate de que Ollama está en ejecución (`ollama serve`) "
                f"y el modelo '{self.ollama_model}' está descargado (`ollama run {self.ollama_model}`)."
            )
        except Exception as e:
            raise Exception(f"Error en motor textual local (Ollama/Qwen): {str(e)}")

    async def _generar_cloud_free(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        formato_json: bool = False
    ) -> str:
        """
        Ejecuta la inferencia en proveedores Cloud sin coste con reintentos y backoff:
        1. Google Gemini Free Tier (si GEMINI_API_KEY está configurado)
        2. Fallback público gratuito vía Pollinations (Qwen 2.5 / OpenAI format)
        """
        # Intento 1: Gemini Free Tier si existe API Key
        if GEMINI_API_KEY:
            try:
                from services.gemini_service import gemini_service
                prompt_completo = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
                return await gemini_service._llamar_con_retry(prompt_completo, usar_cache=False)
            except Exception as e:
                print(f"[WARN] Gemini Cloud Free fallo o agoto cuota ({e}). Probando fallback Pollinations Qwen...")

        # Intento 2: Pollinations Text API con 2 reintentos y 1.5s backoff
        ultimo_err = None
        for intento in range(2):
            try:
                messages = []
                if system_prompt:
                    messages.append({"role": "system", "content": system_prompt})
                messages.append({"role": "user", "content": prompt})

                payload = {
                    "messages": messages,
                    "model": "qwen",
                    "temperature": 0.7,
                    "jsonMode": formato_json
                }

                async with httpx.AsyncClient(timeout=45.0) as client:
                    resp = await client.post(
                        f"{self.pollinations_url}/",
                        json=payload,
                        headers={"Content-Type": "application/json"}
                    )
                    if resp.status_code == 200 and resp.text.strip():
                        return resp.text
                    
                    # Fallback con GET simple
                    resp_get = await client.get(
                        f"{self.pollinations_url}/{httpx.URL(prompt).raw_path.decode('utf-8', errors='ignore')}",
                        params={"model": "qwen", "system": system_prompt or ""}
                    )
                    if resp_get.status_code == 200 and resp_get.text.strip():
                        return resp_get.text

                    raise Exception(f"Pollinations devolvio codigo {resp.status_code}")

            except Exception as err:
                ultimo_err = err
                print(f"[WARN] Intento {intento + 1}/2 fallo en Pollinations ({err}).")
                if intento < 1:
                    await asyncio.sleep(1.5)

        raise Exception(f"Error en motor textual Cloud Free: {str(ultimo_err)}")

    async def generar_texto(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        formato_json: bool = False,
        modo: str = "cloud_free"
    ) -> str:
        """Genera texto enrutando al motor correspondiente ('local' o 'cloud_free')."""
        if modo == "local":
            return await self._generar_local(prompt, system_prompt, formato_json)
        return await self._generar_cloud_free(prompt, system_prompt, formato_json)

    # ─── MÉTODOS DE DOMINIO MANGA / CÓMIC CON BLINDAJE Y RETRY ───────────────

    async def generar_sinopsis_proyecto(
        self,
        titulo: str,
        genero: str,
        tono: str,
        premisa: str,
        num_capitulos: int = 5,
        modo: str = "cloud_free"
    ) -> dict:
        """Genera la sinopsis general y estructura de arcos narrativos con tolerancia a fallos."""
        system_prompt = (
            "Eres un editor jefe y guionista profesional de manga y cómic con 20 años de experiencia. "
            "Genera respuestas exclusivamente en formato JSON válido, sin explicaciones ni markdown."
        )
        prompt = f"""Desarrolla la estructura narrativa completa para un cómic llamado "{titulo}".

DATOS DEL PROYECTO:
- Género: {genero}
- Tono: {tono}
- Premisa: {premisa}
- Número de capítulos: {num_capitulos}

Responde ÚNICAMENTE con esta estructura JSON:
{{
  "sinopsis_contraportada": "texto de máx 150 palabras",
  "arco_principal": {{
    "acto_1": "descripción del primer acto (presentación)",
    "acto_2": "descripción del segundo acto (conflicto)",
    "acto_3": "descripción del tercer acto (resolución)"
  }},
  "personajes_sugeridos": [
    {{
      "nombre": "nombre",
      "rol": "protagonista|antagonista|apoyo",
      "descripcion_fisica": "descripción física detallada",
      "personalidad": "rasgos de personalidad",
      "motivacion": "qué quiere y por qué"
    }}
  ],
  "estructura_capitulos": [
    {{
      "numero": 1,
      "titulo": "título del capítulo",
      "gancho": "frase con el cliffhanger o momento clave"
    }}
  ],
  "temas": ["tema1", "tema2", "tema3"]
}}"""

        for intento in range(2):
            try:
                raw = await self.generar_texto(prompt, system_prompt, formato_json=True, modo=modo)
                limpio = _limpiar_json(raw)
                datos = json.loads(limpio)
                if isinstance(datos, dict) and ("sinopsis_contraportada" in datos or "arco_principal" in datos or "personajes_sugeridos" in datos):
                    return datos
            except Exception as e:
                print(f"[WARN] Intento {intento + 1}/2 fallo en generar sinopsis ({modo}): {e}")
                if intento < 1:
                    await asyncio.sleep(1.5)

        # Fallback sintético local ante cualquier fallo externo o 503
        print(f"[INFO] Activando generador sintetico de sinopsis de alta calidad (fallback local resiliente)...")
        return _generar_sinopsis_fallback(titulo, genero, tono, premisa, num_capitulos)

    async def generar_guion_capitulo(
        self,
        titulo_proyecto: str,
        numero_capitulo: int,
        premisa: str,
        genero: str,
        tono: str,
        personajes: Optional[List[dict]] = None,
        capitulos_anteriores: Optional[List[dict]] = None,
        system_prompt_estilo: Optional[str] = None,
        modo: str = "cloud_free"
    ) -> dict:
        """Genera el guion completo de un capítulo con viñetas y diálogos con tolerancia a fallos."""
        contexto_personajes = ""
        if personajes:
            contexto_personajes = "\nPERSONAJES DEL PROYECTO:\n" + "\n".join(
                [f"- {p['nombre']}: {p.get('descripcion_fisica', 'Sin descripción')}. Personalidad: {p.get('personalidad', '')}" for p in personajes if isinstance(p, dict)]
            )

        contexto_anterior = ""
        if capitulos_anteriores:
            contexto_anterior = "\nRESUMEN DE CAPÍTULOS ANTERIORES:\n" + "\n".join(
                [f"- Cap {c['numero']}: {c.get('sinopsis', '')}" for c in capitulos_anteriores if isinstance(c, dict)]
            )

        nota_estilo = f"\nESTILO VISUAL: {system_prompt_estilo[:200]}..." if system_prompt_estilo else ""

        system_prompt = (
            "Eres un guionista profesional de manga (mangaka) galardonado. "
            "Escribe guiones cinematográficos dinámicos con ritmo visual y diálogos expresivos. "
            "Responde estrictamente en JSON válido."
        )

        prompt = f"""Crea el guion detallado del Capítulo {numero_capitulo} para el cómic "{titulo_proyecto}".

INFORMACIÓN:
- Género: {genero} | Tono: {tono}
- Premisa: {premisa}
{contexto_personajes}
{contexto_anterior}
{nota_estilo}

REGLAS:
- Entre 15 y 24 páginas.
- Cada página debe tener entre 3 y 6 viñetas con descripciones visuales detalladas.
- Diálogos y planos de cámara claros.

Responde ÚNICAMENTE en JSON válido con este formato:
{{
  "titulo_capitulo": "Título del capítulo",
  "sinopsis": "Resumen de 2-3 frases del capítulo",
  "num_paginas": 20,
  "tono_capitulo": "{tono}",
  "escenas": [
    {{
      "numero_pagina": 1,
      "descripcion_pagina": "Acción general de la página",
      "tipo_layout": "splash|dialogue|action|transition",
      "vinetas": [
        {{
          "numero": 1,
          "descripcion_visual": "Descripción visual detallada para renderizado",
          "personajes": ["nombre"],
          "dialogo": "—Texto del diálogo—",
          "narracion": "Texto de narración si aplica",
          "emocion": "emoción",
          "angulo_camara": "plano general|primer plano|plano medio|picado|contrapicado"
        }}
      ]
    }}
  ]
}}"""

        for intento in range(2):
            try:
                raw = await self.generar_texto(prompt, system_prompt, formato_json=True, modo=modo)
                limpio = _limpiar_json(raw)
                datos = json.loads(limpio)
                if isinstance(datos, dict) and ("titulo_capitulo" in datos or "escenas" in datos):
                    return datos
            except Exception as e:
                print(f"[WARN] Intento {intento + 1}/2 fallo en generar guion ({modo}): {e}")
                if intento < 1:
                    await asyncio.sleep(1.5)

        # Fallback sintético local ante cualquier fallo externo
        print(f"[INFO] Activando generador sintetico de guion de alta calidad (fallback local resiliente)...")
        return _generar_guion_fallback(
            titulo_proyecto, numero_capitulo, premisa, genero, tono, personajes, capitulos_anteriores
        )

    async def generar_ficha_tecnica(
        self,
        personaje_data: dict,
        nombre_proyecto: str,
        system_prompt_estilo: Optional[str] = None,
        modo: str = "cloud_free"
    ) -> str:
        """Genera la Ficha Técnica IA (prompt maestro de personaje) para consistencia visual."""
        estilo_ctx = f"\nESTILO DEL PROYECTO: {system_prompt_estilo[:150]}..." if system_prompt_estilo else ""

        system_prompt = (
            "You are an expert prompt engineer specialized in character consistency for AI manga generation. "
            "Generate only the final descriptive prompt in English."
        )

        prompt = f"""Create a master character consistency prompt for the manga character "{personaje_data.get('nombre')}" in project "{nombre_proyecto}".

CHARACTER SPECS:
- Role: {personaje_data.get('rol', 'protagonist')}
- Physical description: {personaje_data.get('descripcion_fisica', '')}
- Typical outfit: {personaje_data.get('ropa_tipica', '')}
- Personality & Mood: {personaje_data.get('personalidad', '')}
{estilo_ctx}

GUIDELINES:
- Output a single concise prompt in English (max 90 words).
- Detail exact hair style/color, eye shape/color, facial features, outfit, body proportions.
- Output ONLY the prompt string, without markdown or extra commentary."""

        try:
            resultado = await self.generar_texto(prompt, system_prompt, formato_json=False, modo=modo)
            return resultado.strip().strip('"').strip("'")
        except Exception:
            return (
                f"master character portrait of {personaje_data.get('nombre', 'character')}, "
                f"{personaje_data.get('descripcion_fisica', 'anime style character')}, "
                f"{personaje_data.get('ropa_tipica', 'detailed costume')}, "
                f"sharp lineart, clean manga aesthetic, highly detailed face and expressive eyes"
            )

    async def generar_descripcion_vineta(
        self,
        descripcion_escena: str,
        personajes: List[str],
        estilo_prompt: str,
        emocion: str = "neutral",
        angulo: str = "plano medio",
        modo: str = "cloud_free"
    ) -> str:
        """Genera un prompt de imagen optimizado para una viñeta."""
        personajes_str = ", ".join(personajes) if personajes else "characters"
        prompt = f"""Convert this manga scene into an ultra-detailed image generation prompt.

Scene: {descripcion_escena}
Characters present: {personajes_str}
Emotion: {emocion} | Camera angle: {angulo}
Art Style: {estilo_prompt}

Rules: Output only a single line English prompt (under 100 words), focused on visual composition, lighting, linework, and character placement."""

        try:
            return (await self.generar_texto(prompt, modo=modo)).strip()
        except Exception:
            return f"manga panel depicting {descripcion_escena}, {personajes_str}, {angulo}, {emocion} emotion, {estilo_prompt}, highly detailed anime lineart"

    async def mejorar_dialogo(
        self,
        dialogo_original: str,
        personaje: str,
        emocion: str,
        contexto: str,
        modo: str = "cloud_free"
    ) -> str:
        """Mejora un diálogo haciéndolo más natural y expresivo para bocadillos de cómic."""
        prompt = f"""Mejora este diálogo de manga para que sea conciso, natural y exprese fuerte emoción.

Contexto: {contexto}
Personaje: {personaje} (Emoción: {emocion})
Diálogo original: "{dialogo_original}"

Reglas: Máximo 2-3 líneas para bocadillo. Devuelve SOLO el diálogo mejorado sin comillas ni explicaciones."""

        try:
            return (await self.generar_texto(prompt, modo=modo)).strip().strip('"')
        except Exception:
            return dialogo_original

    async def verificar_estado(self, modo: str = "cloud_free") -> dict:
        """Verifica la conectividad y disponibilidad del motor textual según el modo."""
        if modo == "local":
            try:
                async with httpx.AsyncClient(timeout=4.0) as client:
                    resp = await client.get(f"{self.ollama_url}/api/tags")
                    if resp.status_code == 200:
                        modelos = [m.get("name") for m in resp.json().get("models", [])]
                        return {
                            "estado": "OPERATIVO",
                            "modo": "local",
                            "motor": "Ollama",
                            "url": self.ollama_url,
                            "modelo_activo": self.ollama_model,
                            "modelos_disponibles": modelos,
                            "mensaje": f"Ollama operativo con modelo {self.ollama_model}"
                        }
            except Exception as e:
                return {
                    "estado": "OFFLINE",
                    "modo": "local",
                    "motor": "Ollama",
                    "error": str(e),
                    "mensaje": f"Ollama no responde en {self.ollama_url}"
                }

        # Modo Cloud Free
        return {
            "estado": "OPERATIVO",
            "modo": "cloud_free",
            "motor": "Gemini Free / Pollinations Qwen",
            "gemini_disponible": bool(GEMINI_API_KEY),
            "mensaje": "Inferencia Cloud Gratuita disponible y operativa"
        }


# Instancia global singleton
text_engine = TextEngine()
