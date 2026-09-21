"""
Servicio Maestro de Biblias de Estilo (MEP) - 25 Estilos Canónicos de Cómic.
Conecta de forma nativa con style_bibles.json y gestiona las referencias visuales
alojadas en backend/data/style_references/{style_id}/.
"""

import json
from pathlib import Path
from typing import Dict, Any, List, Optional

BASE_DATA_DIR = Path(__file__).resolve().parent
JSON_FILE = BASE_DATA_DIR / "style_bibles.json"
REFS_DIR = BASE_DATA_DIR / "style_references"


def cargar_biblias() -> Dict[str, Any]:
    """Carga de forma canónica las 25 Biblias de Estilo desde style_bibles.json."""
    if not JSON_FILE.exists():
        return {}
    try:
        with open(JSON_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"⚠️ Error cargando style_bibles.json: {e}")
        return {}


STYLE_BIBLES: Dict[str, Any] = cargar_biblias()


def _limpiar_id(style_id: Optional[str]) -> str:
    """Normaliza identificadores eliminando prefijos de UI."""
    if not style_id:
        return ""
    clean_id = style_id.strip().lower()
    for prefix in ["legendario_", "aleatorio_", "preset_", "style_"]:
        if clean_id.startswith(prefix):
            clean_id = clean_id[len(prefix):]
    return clean_id


def get_style_bible(style_id: Optional[str]) -> Dict[str, Any]:
    """Retorna la ficha técnica de la Biblia de Estilo correspondiente."""
    clean_id = _limpiar_id(style_id)
    if clean_id in STYLE_BIBLES:
        return STYLE_BIBLES[clean_id]
    
    # Búsqueda por coincidencia parcial si el id tiene variantes
    for k, v in STYLE_BIBLES.items():
        if k in clean_id or clean_id in k:
            return v

    return STYLE_BIBLES.get("mortadela_y_salchichon", {})


def get_style_tokens(style_id: Optional[str]) -> str:
    """Retorna la cadena consolidada de tokens para inyección en FLUX.1."""
    bible = get_style_bible(style_id)
    return bible.get(
        "prompt_tokens",
        "classic comic illustration, thick ink lines, clean flat colors, dynamic comic panel"
    )


def get_style_reference_images(style_id: Optional[str]) -> List[str]:
    """
    Retorna la lista de URLs de imágenes de muestra alojadas en
    backend/data/style_references/{clean_id}/ accesibles estáticamente desde /assets/style_references/.
    """
    clean_id = _limpiar_id(style_id)
    if not clean_id:
        clean_id = "mortadela_y_salchichon"

    folder = REFS_DIR / clean_id
    if not folder.exists():
        # Búsqueda por coincidencia parcial de directorio
        if REFS_DIR.exists():
            for sub in REFS_DIR.iterdir():
                if sub.is_dir() and (sub.name in clean_id or clean_id in sub.name):
                    folder = sub
                    clean_id = sub.name
                    break
            else:
                return []
        else:
            return []

    imagenes = []
    for f in sorted(folder.iterdir()):
        if f.is_file() and f.suffix.lower() in [".webp", ".png", ".jpg", ".jpeg"]:
            imagenes.append(f"/assets/style_references/{clean_id}/{f.name}")

    return imagenes
