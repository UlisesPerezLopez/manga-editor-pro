# gemini_service.py
# Servicio Gemini actualizado con la librería oficial google-genai (no deprecada).
# Librería: google-genai (reemplaza a google-generativeai que está deprecada)

import asyncio
import os
import json
import re
import base64
from typing import Optional
from google import genai
from pathlib import Path
from dotenv import load_dotenv

# Cargar .env de backend/ o de la raíz
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)
load_dotenv()

from utils.rate_limiter import gemini_rate_limiter, gemini_cache

# Modelos disponibles en tu API key
MODELO_TEXTO  = "gemini-2.5-flash"   # Texto y guiones
MODELO_VISION = "gemini-2.5-flash"   # Análisis de imágenes (multimodal)
MODELO_IMAGEN = "gemini-3.1-flash-image-preview" # Generación de imágenes (Nano Banana)

MAX_REINTENTOS = 3
ESPERA_BASE    = 2.0


def _obtener_cliente():
    """Obtiene el cliente de Gemini validando que la API key exista."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise ValueError("GEMINI_API_KEY no configurado en .env. Añade tu API Key de Google AI Studio.")
    return genai.Client(api_key=api_key)


class GeminiService:
    """
    Servicio central de comunicación con la API de Google Gemini.
    Usa la librería google-genai (nueva, no deprecada).
    Implementa rate limiting, caché y retry con backoff exponencial.
    """

    async def _llamar_con_retry(self, prompt: str,
                                 usar_cache: bool = True) -> str:
        """
        Ejecuta la llamada a Gemini con:
        - Verificación de caché antes de llamar
        - Rate limiting (máx 14 RPM)
        - Reintentos con backoff exponencial ante error 429
        """
        if usar_cache:
            resultado_cacheado = gemini_cache.get(prompt)
            if resultado_cacheado:
                return resultado_cacheado

        ultimo_error = None
        cliente = _obtener_cliente()

        for intento in range(MAX_REINTENTOS):
            try:
                await gemini_rate_limiter.acquire()

                loop = asyncio.get_event_loop()
                respuesta = await loop.run_in_executor(
                    None,
                    lambda: cliente.models.generate_content(
                        model=MODELO_TEXTO,
                        contents=prompt
                    )
                )

                texto_resultado = respuesta.text

                if usar_cache:
                    gemini_cache.set(prompt, texto_resultado)

                return texto_resultado

            except Exception as e:
                ultimo_error = e
                error_str = str(e).lower()

                if any(k in error_str for k in ["429", "quota", "exhausted", "503", "500", "unavailable", "overload", "temporarily", "timeout"]):
                    tiempo_espera = ESPERA_BASE ** (intento + 1)
                    print(f"[WARN] Error transitorio Gemini ({error_str[:60]}) intento {intento + 1}/{MAX_REINTENTOS}. "
                          f"Esperando {tiempo_espera:.1f}s...")
                    await asyncio.sleep(tiempo_espera)
                else:
                    print(f"[ERROR] Error Gemini no recuperable: {e}")
                    raise e

        raise Exception(
            f"Gemini no respondió tras {MAX_REINTENTOS} intentos. "
            f"Último error: {ultimo_error}"
        )

    # ─── MÉTODOS PÚBLICOS ────────────────────────────────────────────────────

    async def generar_guion_capitulo(
        self,
        titulo_proyecto: str,
        numero_capitulo: int,
        premisa: str,
        genero: str,
        tono: str,
        personajes: list = None,
        capitulos_anteriores: list = None,
        system_prompt_estilo: str = None
    ) -> dict:
        """Genera el guion completo de un capítulo de cómic."""

        contexto_personajes = ""
        if personajes:
            contexto_personajes = "\nPERSONAJES DEL PROYECTO:\n"
            for p in personajes:
                contexto_personajes += (
                    f"- {p['nombre']}: {p.get('descripcion_fisica', 'Sin descripción')}. "
                    f"Personalidad: {p.get('personalidad', 'Por definir')}.\n"
                )

        contexto_anterior = ""
        if capitulos_anteriores:
            contexto_anterior = "\nRESUMEN DE CAPÍTULOS ANTERIORES:\n"
            for cap in capitulos_anteriores:
                contexto_anterior += (
                    f"- Capítulo {cap['numero']}: {cap.get('sinopsis', '')}\n"
                )

        nota_estilo = ""
        if system_prompt_estilo:
            nota_estilo = (
                f"\nESTILO VISUAL DEL PROYECTO: {system_prompt_estilo[:200]}..."
            )

        prompt = f"""Eres un guionista profesional de manga y cómics con 20 años de experiencia.
Crea el guion detallado del Capítulo {numero_capitulo} para el proyecto "{titulo_proyecto}".

INFORMACIÓN DEL PROYECTO:
- Género: {genero}
- Tono: {tono}
- Premisa: {premisa}
{contexto_personajes}{contexto_anterior}{nota_estilo}

INSTRUCCIONES:
- El capítulo debe tener entre 18 y 24 páginas
- Cada página debe tener entre 3 y 6 viñetas
- Incluye diálogos naturales y expresivos
- Las descripciones de viñeta deben ser visuales y detalladas
- El final debe tener un cliffhanger o momento emocional impactante

Responde ÚNICAMENTE con JSON válido sin markdown ni explicaciones:
{{
  "titulo_capitulo": "Título del capítulo",
  "sinopsis": "Resumen de 2-3 frases del capítulo completo",
  "num_paginas": 20,
  "tono_capitulo": "descripción del tono emocional",
  "escenas": [
    {{
      "numero_pagina": 1,
      "descripcion_pagina": "Qué pasa en esta página",
      "tipo_layout": "splash|dialogue|action|transition",
      "vinetas": [
        {{
          "numero": 1,
          "descripcion_visual": "Descripción detallada para generación IA",
          "personajes": ["nombre1"],
          "dialogo": "—Texto del diálogo—",
          "narracion": "Texto de narración si lo hay",
          "emocion": "emoción principal",
          "angulo_camara": "plano general|primer plano|plano medio|picado|contrapicado"
        }}
      ]
    }}
  ]
}}"""

        texto = await self._llamar_con_retry(prompt, usar_cache=False)
        texto_limpio = re.sub(r'```json\s*|\s*```', '', texto).strip()

        try:
            return json.loads(texto_limpio)
        except json.JSONDecodeError as e:
            raise Exception(
                f"JSON inválido de Gemini: {e}. "
                f"Respuesta: {texto_limpio[:300]}..."
            )

    async def generar_sinopsis_proyecto(
        self,
        titulo: str,
        genero: str,
        tono: str,
        premisa: str,
        num_capitulos: int = 5
    ) -> dict:
        """Genera la sinopsis general y estructura de arcos narrativos."""

        prompt = f"""Eres un editor jefe de una editorial de manga con 20 años de experiencia.
Desarrolla la estructura narrativa completa para un cómic llamado "{titulo}".

DATOS:
- Género: {genero}
- Tono: {tono}
- Premisa inicial: {premisa}
- Número de capítulos planificados: {num_capitulos}

Responde ÚNICAMENTE con JSON válido sin markdown:
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
      "titulo": "título",
      "gancho": "frase que describe el cliffhanger o momento clave"
    }}
  ],
  "temas": ["tema1", "tema2", "tema3"]
}}"""

        texto = await self._llamar_con_retry(prompt, usar_cache=True)
        texto_limpio = re.sub(r'```json\s*|\s*```', '', texto).strip()

        try:
            return json.loads(texto_limpio)
        except json.JSONDecodeError as e:
            raise Exception(f"JSON inválido en sinopsis: {e}")

    async def generar_descripcion_vineta(
        self,
        descripcion_escena: str,
        personajes: list,
        estilo_prompt: str,
        emocion: str = "neutral",
        angulo: str = "plano medio"
    ) -> str:
        """Genera un prompt de imagen optimizado para una viñeta."""

        personajes_str = (
            ", ".join(personajes) if personajes else "sin personajes específicos"
        )

        prompt = f"""Eres experto en prompts para generación de imágenes de cómics manga.
Crea un prompt de imagen profesional para esta viñeta.

DATOS:
- Escena: {descripcion_escena}
- Personajes: {personajes_str}
- Emoción: {emocion}
- Ángulo: {angulo}
- Estilo visual: {estilo_prompt}

REGLAS:
- En inglés (mejor rendimiento en modelos de imagen)
- Incluir el estilo visual al inicio
- Describir composición, iluminación y atmósfera
- Máximo 120 palabras
- Solo el prompt, sin explicaciones

Prompt de imagen:"""

        return await self._llamar_con_retry(prompt, usar_cache=False)

    async def mejorar_dialogo(
        self,
        dialogo_original: str,
        personaje: str,
        emocion: str,
        contexto: str
    ) -> str:
        """Mejora un diálogo para que sea más natural y expresivo."""

        prompt = f"""Eres guionista experto en cómics y manga.
Mejora este diálogo para que sea más natural y expresivo.

CONTEXTO: {contexto}
PERSONAJE: {personaje}
EMOCIÓN: {emocion}
DIÁLOGO ORIGINAL: "{dialogo_original}"

REGLAS:
- Máximo 3 líneas (los bocadillos son pequeños)
- Debe reflejar claramente la emoción
- Lenguaje natural, no literario
- Solo el diálogo mejorado entre comillas, sin explicaciones

Diálogo mejorado:"""

        return await self._llamar_con_retry(prompt, usar_cache=True)

    async def verificar_conexion(self) -> str:
        """Verifica que la API responde.
        Usado por el endpoint de diagnóstico."""
        return await self._llamar_con_retry(
            "Responde solo con la palabra: OPERATIVO",
            usar_cache=False
        )
        
    async def generar_imagen_vineta(
        self,
        prompt_completo: str,
        ancho: int = 1024,
        alto: int = 1024
    ) -> str:
        """
        Genera una imagen para una viñeta usando Gemini Imagen 3.
        Modelo: gemini-3.1-flash-image-preview (Nano Banana)
        Devuelve la imagen en base64 (data:image/png;base64,...).
        NOTA: Requiere billing habilitado en Google Cloud para uso vía API.
        """
        from google.genai import types
        cliente = _obtener_cliente()
        await gemini_rate_limiter.acquire()
        loop = asyncio.get_event_loop()

        def _llamar():
            return cliente.models.generate_content(
                model=MODELO_IMAGEN,
                contents=prompt_completo,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE", "TEXT"]
                )
            )

        try:
            respuesta = await loop.run_in_executor(None, _llamar)

            # Extraer la imagen del response
            for part in respuesta.candidates[0].content.parts:
                if part.inline_data is not None:
                    imagen_b64 = base64.b64encode(
                        part.inline_data.data
                    ).decode("utf-8")
                    mime = part.inline_data.mime_type or "image/png"
                    print("[GEMINI-IMG] Imagen generada correctamente")
                    return f"data:{mime};base64,{imagen_b64}"

            raise Exception("Gemini Imagen no devolvió datos de imagen")

        except Exception as e:
            error_str = str(e).lower()
            if "billing" in error_str or "payment" in error_str:
                raise Exception(
                    "GEMINI_IMAGEN_BILLING: Gemini Imagen requiere billing "
                    "habilitado en Google Cloud. Usa Replicate como alternativa."
                )
            raise e

# Instancia global del servicio (singleton)
gemini_service = GeminiService()