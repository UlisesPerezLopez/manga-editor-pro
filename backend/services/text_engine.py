# text_engine.py
# Motor textual unificado y modular para MEP — Manga Editor Pro.
# Soporta:
# 1. Modo 'local': Inferencia local con Ollama (Qwen 2.5 7B/14B) en http://127.0.0.1:11434
# 2. Modo 'cloud_free': Endpoints públicos/gratuitos sin coste con respuesta JSON estructurada

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
        Ejecuta la inferencia en proveedores Cloud sin coste:
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
                print(f"⚠️ Gemini Cloud Free falló o agotó cuota ({e}). Usando fallback Pollinations Qwen...")

        # Intento 2: Pollinations Text API (100% Free, sin API key, modelo Qwen)
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

            async with httpx.AsyncClient(timeout=90.0) as client:
                resp = await client.post(
                    f"{self.pollinations_url}/",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )
                if resp.status_code == 200:
                    return resp.text
                
                # Fallback con GET simple
                resp_get = await client.get(
                    f"{self.pollinations_url}/{httpx.URL(prompt).raw_path.decode('utf-8', errors='ignore')}",
                    params={"model": "qwen", "system": system_prompt or ""}
                )
                if resp_get.status_code == 200:
                    return resp_get.text

                raise Exception(f"Pollinations devolvió código {resp.status_code}")

        except Exception as err:
            raise Exception(f"Error en motor textual Cloud Free: {str(err)}")

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

    # ─── MÉTODOS DE DOMINIO MANGA / CÓMIC ────────────────────────────────────

    async def generar_sinopsis_proyecto(
        self,
        titulo: str,
        genero: str,
        tono: str,
        premisa: str,
        num_capitulos: int = 5,
        modo: str = "cloud_free"
    ) -> dict:
        """Genera la sinopsis general y estructura de arcos narrativos."""
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

        raw = await self.generar_texto(prompt, system_prompt, formato_json=True, modo=modo)
        limpio = _limpiar_json(raw)
        try:
            return json.loads(limpio)
        except json.JSONDecodeError as e:
            raise Exception(f"JSON inválido en sinopsis ({modo}): {e}. Respuesta cruda: {raw[:200]}")

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
        """Genera el guion completo de un capítulo con viñetas y diálogos."""
        contexto_personajes = ""
        if personajes:
            contexto_personajes = "\nPERSONAJES DEL PROYECTO:\n" + "\n".join(
                [f"- {p['nombre']}: {p.get('descripcion_fisica', 'Sin descripción')}. Personalidad: {p.get('personalidad', '')}" for p in personajes]
            )

        contexto_anterior = ""
        if capitulos_anteriores:
            contexto_anterior = "\nRESUMEN DE CAPÍTULOS ANTERIORES:\n" + "\n".join(
                [f"- Cap {c['numero']}: {c.get('sinopsis', '')}" for c in capitulos_anteriores]
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

        raw = await self.generar_texto(prompt, system_prompt, formato_json=True, modo=modo)
        limpio = _limpiar_json(raw)
        try:
            return json.loads(limpio)
        except json.JSONDecodeError as e:
            raise Exception(f"JSON inválido en guion de capítulo ({modo}): {e}. Respuesta: {raw[:250]}")

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

        resultado = await self.generar_texto(prompt, system_prompt, formato_json=False, modo=modo)
        return resultado.strip().strip('"').strip("'")

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

        return (await self.generar_texto(prompt, modo=modo)).strip()

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

        return (await self.generar_texto(prompt, modo=modo)).strip().strip('"')

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
