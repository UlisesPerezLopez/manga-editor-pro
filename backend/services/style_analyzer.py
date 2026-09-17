# style_analyzer.py
# Servicio de análisis de imágenes de referencia para generar la Firma Visual.
# CORRECCIÓN: Gemini Vision (free tier) tiene límite de 5 RPM separado del texto.
# Solución: procesar UNA imagen cada 13 segundos (máx 4.6/min, margen seguro).

import asyncio
import base64
import json
import os
import re
from pathlib import Path
from typing import List
from collections import Counter
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Cargar .env de backend/ o directorio raíz
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)
load_dotenv()

from utils.rate_limiter import gemini_rate_limiter, gemini_cache

MODELO_VISION = "gemini-2.5-flash"

def _obtener_cliente():
    """Obtiene el cliente de Gemini validando que la API key exista."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise ValueError("GEMINI_API_KEY no configurado en .env. Añade tu API Key de Google AI Studio.")
    return genai.Client(api_key=api_key)

# ─── LÍMITES REALES DEL FREE TIER ────────────────────────────────────────────
# Texto:  15 RPM  → rate_limiter.py gestiona esto (14 RPM con margen)
# Visión: 5 RPM   → este módulo lo gestiona manualmente
# Estrategia: 1 imagen cada 13s = 4.6 imágenes/min (margen seguro sobre 5 RPM)
PAUSA_ENTRE_IMAGENES = 13.0   # segundos entre cada llamada de visión
MAX_REINTENTOS_VISION = 3     # reintentos ante error 429
ESPERA_REINTENTO_BASE = 35.0  # segundos de espera en reintento (retryDelay del error era 31s)


def _imagen_a_base64(ruta_imagen: str) -> tuple[str, str]:
    """
    Lee una imagen del disco y la convierte a base64.
    Devuelve (base64_string, mime_type).
    """
    ruta = Path(ruta_imagen)
    extension = ruta.suffix.lower()

    mime_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
    }
    mime_type = mime_types.get(extension, "image/jpeg")

    with open(ruta, "rb") as f:
        datos = f.read()

    return base64.b64encode(datos).decode("utf-8"), mime_type


async def analizar_imagen_individual(ruta_imagen: str,
                                      numero: int,
                                      total: int) -> dict:
    """
    Analiza una sola imagen con Gemini Vision.
    Incluye reintentos propios para errores 429 de visión
    (independientes del rate limiter de texto).
    """
    b64, mime = _imagen_a_base64(ruta_imagen)

    prompt = """Analiza esta imagen de manga/cómic con precisión técnica.
Extrae las características visuales exactas.

Responde ÚNICAMENTE con JSON válido sin markdown:
{
  "paleta_colores": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
  "tecnica_linea": "descripción del grosor y estilo",
  "estilo_sombreado": "descripción del sombreado",
  "proporciones_personaje": "descripción de proporciones",
  "atmosfera": "descripción del mood visual general",
  "elementos_caracteristicos": ["elemento1", "elemento2", "elemento3"],
  "nivel_detalle": "simple|medio|alto|muy_alto",
  "predominancia": "blanco_negro|color|escala_grises|mixto"
}"""

    ultimo_error = None
    cliente = _obtener_cliente()

    for intento in range(MAX_REINTENTOS_VISION):
        try:
            print(f"   🖼️  Imagen {numero}/{total} — intento {intento + 1}...")

            loop = asyncio.get_event_loop()

            def _llamar():
                return cliente.models.generate_content(
                    model=MODELO_VISION,
                    contents=[
                        types.Part.from_bytes(
                            data=base64.b64decode(b64),
                            mime_type=mime
                        ),
                        prompt
                    ]
                )

            respuesta = await loop.run_in_executor(None, _llamar)
            texto = re.sub(r'```json\s*|\s*```', '', respuesta.text).strip()
            resultado = json.loads(texto)
            print(f"   ✅ Imagen {numero}/{total} analizada correctamente")
            return resultado

        except Exception as e:
            ultimo_error = e
            error_str = str(e).lower()

            if "429" in error_str or "quota" in error_str or "exhausted" in error_str:
                # Extraer retryDelay del mensaje si está disponible
                espera = ESPERA_REINTENTO_BASE * (intento + 1)
                print(f"   ⚠️  429 en imagen {numero}/{total}. "
                      f"Esperando {espera:.0f}s antes de reintentar...")
                await asyncio.sleep(espera)
            else:
                # Error no relacionado con cuota: no reintentar
                print(f"   ❌ Error no recuperable en imagen {numero}: {e}")
                break

    # Si fallaron todos los reintentos, devolver placeholder
    print(f"   ⚠️  Imagen {numero}/{total} omitida tras {MAX_REINTENTOS_VISION} intentos")
    return {
        "paleta_colores": [],
        "tecnica_linea": "no analizada",
        "estilo_sombreado": "no analizado",
        "proporciones_personaje": "no analizadas",
        "atmosfera": "no analizada",
        "elementos_caracteristicos": [],
        "nivel_detalle": "medio",
        "predominancia": "blanco_negro"
    }


async def analizar_conjunto_imagenes(rutas_imagenes: List[str]) -> dict:
    """
    Analiza un conjunto de imágenes de referencia respetando
    el límite de 5 RPM de Gemini Vision en el free tier.
    Estrategia: 1 imagen cada 13 segundos (secuencial, no paralelo).

    Con 24 imágenes → ~5.5 minutos de análisis total.
    Con 10 imágenes → ~2.5 minutos.
    Con  5 imágenes → ~1 minuto.
    """
    total = len(rutas_imagenes)
    print(f"🔍 Iniciando análisis de {total} imágenes...")
    print(f"   Tiempo estimado: ~{total * PAUSA_ENTRE_IMAGENES / 60:.1f} minutos")
    print(f"   (1 imagen cada {PAUSA_ENTRE_IMAGENES}s para respetar límite 5 RPM)")

    resultados = []

    for i, ruta in enumerate(rutas_imagenes):
        numero = i + 1

        # Analizar la imagen con reintentos propios
        resultado = await analizar_imagen_individual(ruta, numero, total)

        if resultado.get("tecnica_linea") != "no analizada":
            resultados.append(resultado)

        # Pausa entre imágenes EXCEPTO después de la última
        if numero < total:
            print(f"   ⏳ Esperando {PAUSA_ENTRE_IMAGENES}s antes de la siguiente...")
            await asyncio.sleep(PAUSA_ENTRE_IMAGENES)

    print(f"✅ Análisis completado: {len(resultados)}/{total} imágenes procesadas")
    return _consolidar_analisis(resultados)


def _consolidar_analisis(resultados: List[dict]) -> dict:
    """
    Consolida múltiples análisis individuales en un perfil de estilo único.
    Usa votación por mayoría para las características cualitativas.
    """
    if not resultados:
        return {
            "paleta_colores": [],
            "tecnica_linea": "estilo manga estándar",
            "estilo_sombreado": "sombreado estándar",
            "proporciones_personaje": "proporciones manga estándar",
            "atmosfera": "atmósfera dinámica",
            "elementos_caracteristicos": [],
            "nivel_detalle": "medio",
            "predominancia": "blanco_negro",
            "num_imagenes_analizadas": 0
        }

    # Paleta: colores más frecuentes entre todas las imágenes
    todos_colores = []
    for r in resultados:
        todos_colores.extend(r.get("paleta_colores", []))
    colores_frecuentes = [c for c, _ in Counter(todos_colores).most_common(8)]

    # Características textuales: tomar la más frecuente
    def _mas_frecuente(lista):
        limpia = [v for v in lista if v and "no analiz" not in v]
        return Counter(limpia).most_common(1)[0][0] if limpia else ""

    tecnicas_linea   = [r.get("tecnica_linea", "")          for r in resultados]
    sombreados       = [r.get("estilo_sombreado", "")        for r in resultados]
    proporciones     = [r.get("proporciones_personaje", "")  for r in resultados]
    atmosferas       = [r.get("atmosfera", "")               for r in resultados]
    predominancias   = [r.get("predominancia", "")           for r in resultados]
    niveles          = [r.get("nivel_detalle", "")           for r in resultados]

    # Elementos característicos: los más repetidos entre todas las imágenes
    todos_elementos = []
    for r in resultados:
        todos_elementos.extend(r.get("elementos_caracteristicos", []))
    elementos_top = [e for e, _ in Counter(todos_elementos).most_common(6)]

    return {
        "paleta_colores":           colores_frecuentes,
        "tecnica_linea":            _mas_frecuente(tecnicas_linea),
        "estilo_sombreado":         _mas_frecuente(sombreados),
        "proporciones_personaje":   _mas_frecuente(proporciones),
        "atmosfera":                _mas_frecuente(atmosferas),
        "elementos_caracteristicos": elementos_top,
        "nivel_detalle":            _mas_frecuente(niveles) or "medio",
        "predominancia":            _mas_frecuente(predominancias) or "blanco_negro",
        "num_imagenes_analizadas":  len(resultados)
    }


async def generar_system_prompt_maestro(perfil_estilo: dict,
                                        nombre_proyecto: str) -> str:
    """
    Con el perfil de estilo consolidado, genera el System Prompt Maestro.
    Este prompt se usará en TODAS las generaciones de imágenes del proyecto.
    Pausa previa de 13s para respetar el límite de visión antes de esta llamada.
    """
    # Pausa de seguridad antes de esta llamada adicional
    print("   ⏳ Pausa de seguridad antes de generar System Prompt Maestro...")
    await asyncio.sleep(PAUSA_ENTRE_IMAGENES)

    paleta_str   = ", ".join(perfil_estilo.get("paleta_colores", []))
    elementos_str = ", ".join(perfil_estilo.get("elementos_caracteristicos", []))

    prompt = f"""Eres un experto en ingeniería de prompts para generación de imágenes de manga y cómic.
Basándote en este perfil de estilo visual, crea un System Prompt Maestro profesional.

PERFIL DE ESTILO ANALIZADO:
- Paleta de colores dominante: {paleta_str}
- Técnica de línea: {perfil_estilo.get('tecnica_linea', '')}
- Estilo de sombreado: {perfil_estilo.get('estilo_sombreado', '')}
- Proporciones de personaje: {perfil_estilo.get('proporciones_personaje', '')}
- Atmósfera visual: {perfil_estilo.get('atmosfera', '')}
- Elementos característicos: {elementos_str}
- Nivel de detalle: {perfil_estilo.get('nivel_detalle', '')}
- Predominancia de color: {perfil_estilo.get('predominancia', '')}
- Proyecto: {nombre_proyecto}

INSTRUCCIONES:
- Crea un prompt en inglés (mejor rendimiento en modelos de imagen)
- Captura la ESENCIA ÚNICA del estilo como si describiera la mano de un artista específico
- Máximo 200 palabras
- Usable directamente como prefijo en cualquier prompt de generación de imagen
- Incluye: estilo de línea, sombreado, paleta, proporciones, atmósfera
- Termina con: ", professional manga artwork, consistent style, high quality"
- Solo el prompt, sin explicaciones ni comillas

System Prompt Maestro:"""

    # Intentar primero con text_engine (soporta local y cloud_free)
    try:
        from services.text_engine import text_engine
        res = await text_engine.generar_texto(prompt, formato_json=False)
        if res and len(res.strip()) > 20:
            print("✅ System Prompt Maestro generado correctamente con text_engine")
            return res.strip().strip('"')
    except Exception as err:
        print(f"ℹ️ text_engine intentando fallback directo: {err}")

    try:
        cliente = _obtener_cliente()
        loop = asyncio.get_event_loop()
        for intento in range(MAX_REINTENTOS_VISION):
            try:
                respuesta = await loop.run_in_executor(
                    None,
                    lambda: cliente.models.generate_content(
                        model=MODELO_VISION,
                        contents=prompt
                    )
                )
                resultado = respuesta.text.strip()
                print("✅ System Prompt Maestro generado correctamente")
                return resultado

            except Exception as e:
                error_str = str(e).lower()
                if "429" in error_str or "quota" in error_str:
                    espera = ESPERA_REINTENTO_BASE * (intento + 1)
                    print(f"   ⚠️  429 en System Prompt. Esperando {espera:.0f}s...")
                    await asyncio.sleep(espera)
                else:
                    raise e
    except Exception as e:
        print(f"⚠️ Fallback manual para System Prompt Maestro: {e}")

    # Fallback determinista seguro
    return (
        f"Manga artwork style for {nombre_proyecto}, {perfil_estilo.get('tecnica_linea', 'clean inking')}, "
        f"{perfil_estilo.get('estilo_sombreado', 'screentone shadows')}, {perfil_estilo.get('atmosfera', 'dramatic atmosphere')}, "
        f"color palette: {paleta_str or 'monochrome with accents'}, professional manga artwork, consistent style, high quality"
    )