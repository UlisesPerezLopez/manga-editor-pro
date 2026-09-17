# routers/export.py
# Endpoints de exportación de páginas y capítulos completos.
# Soporta: PNG por página, PDF del capítulo completo.
# La exportación de alta calidad se hace en el frontend con Fabric.js
# (acceso directo al canvas). El backend gestiona la exportación
# multi-página a PDF usando fpdf2.

import os
import io
import base64
import tempfile
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database.database import get_db
from database.models import Proyecto, Capitulo, Pagina, Usuario
from utils.dependencies import get_current_user

router = APIRouter(prefix="/export", tags=["Exportación"])


@router.post("/pdf-capitulo/{proyecto_id}/{capitulo_id}")
async def exportar_pdf_capitulo(
    proyecto_id: int,
    capitulo_id: int,
    datos: dict,   # {"paginas_base64": ["data:image/png;base64,...", ...]}
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Recibe las páginas del capítulo en base64 (renderizadas por Fabric.js
    en el frontend) y las combina en un PDF descargable.
    Requiere: pip install fpdf2 pillow
    """
    try:
        from fpdf import FPDF
        from PIL import Image
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Dependencias de exportación no instaladas. "
                   "Ejecuta: pip install fpdf2 pillow"
        )

    # Verificar acceso al proyecto
    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    capitulo = db.query(Capitulo).filter(
        Capitulo.id == capitulo_id,
        Capitulo.id_proyecto == proyecto_id
    ).first()
    if not capitulo:
        raise HTTPException(status_code=404, detail="Capítulo no encontrado")

    paginas_b64 = datos.get("paginas_base64", [])
    if not paginas_b64:
        raise HTTPException(
            status_code=400,
            detail="No se recibieron páginas para exportar"
        )

    print(f"📄 Exportando PDF: '{capitulo.titulo}' "
          f"({len(paginas_b64)} páginas)...")

    # Crear PDF con fpdf2
    pdf = FPDF(unit="mm", format="A4")
    pdf.set_auto_page_break(auto=False)

    archivos_temp = []

    try:
        for i, pagina_b64 in enumerate(paginas_b64):
            # Decodificar base64
            if "," in pagina_b64:
                pagina_b64 = pagina_b64.split(",")[1]

            imagen_bytes = base64.b64decode(pagina_b64)

            # Guardar temporalmente
            with tempfile.NamedTemporaryFile(
                suffix=".png", delete=False
            ) as tmp:
                tmp.write(imagen_bytes)
                tmp_path = tmp.name
                archivos_temp.append(tmp_path)

            # Añadir página al PDF
            pdf.add_page()

            # Calcular dimensiones manteniendo proporción
            img = Image.open(tmp_path)
            w_img, h_img = img.size
            proporcion = w_img / h_img

            # A4: 210 × 297 mm — dejar 10mm de margen
            ancho_max = 190
            alto_max  = 277

            if proporcion > (ancho_max / alto_max):
                w_pdf = ancho_max
                h_pdf = ancho_max / proporcion
            else:
                h_pdf = alto_max
                w_pdf = alto_max * proporcion

            # Centrar en la página
            x = (210 - w_pdf) / 2
            y = (297 - h_pdf) / 2

            pdf.image(tmp_path, x=x, y=y, w=w_pdf, h=h_pdf)
            print(f"   ✅ Página {i + 1}/{len(paginas_b64)} añadida al PDF")

        # Generar el PDF en memoria
        nombre_archivo = (
            f"{proyecto.nombre}_{capitulo.titulo or f'Cap{capitulo.numero}'}"
            .replace(" ", "_")
            .replace("/", "-")
        )
        nombre_archivo = f"{nombre_archivo}.pdf"

        pdf_bytes = pdf.output()

        print(f"✅ PDF generado: {nombre_archivo} "
              f"({len(pdf_bytes) / 1024:.1f} KB)")

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{nombre_archivo}"'
            }
        )

    finally:
        # Limpiar archivos temporales
        for tmp_path in archivos_temp:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


@router.post("/png-pagina/{proyecto_id}")
async def exportar_png_pagina(
    proyecto_id: int,
    datos: dict,   # {"pagina_base64": "data:image/png;base64,...", "nombre": "pagina_1"}
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Recibe una página en base64 y la devuelve como archivo PNG descargable.
    La imagen ya viene renderizada en alta resolución desde Fabric.js.
    """
    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    pagina_b64 = datos.get("pagina_base64", "")
    nombre = datos.get("nombre", "pagina")

    if not pagina_b64:
        raise HTTPException(status_code=400, detail="No se recibió la imagen")

    # Decodificar base64
    if "," in pagina_b64:
        pagina_b64 = pagina_b64.split(",")[1]

    imagen_bytes = base64.b64decode(pagina_b64)

    nombre_archivo = f"{nombre}.png"

    return StreamingResponse(
        io.BytesIO(imagen_bytes),
        media_type="image/png",
        headers={
            "Content-Disposition": f'attachment; filename="{nombre_archivo}"'
        }
    )


@router.get("/info-capitulo/{proyecto_id}/{capitulo_id}")
async def info_capitulo_para_exportar(
    proyecto_id: int,
    capitulo_id: int,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Devuelve información del capítulo y sus páginas para preparar
    la exportación en el frontend (cuántas páginas hay, sus IDs, etc.)
    """
    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    capitulo = db.query(Capitulo).filter(
        Capitulo.id == capitulo_id,
        Capitulo.id_proyecto == proyecto_id
    ).first()
    if not capitulo:
        raise HTTPException(status_code=404, detail="Capítulo no encontrado")

    paginas = db.query(Pagina).filter(
        Pagina.id_capitulo == capitulo_id
    ).order_by(Pagina.numero).all()

    return {
        "capitulo": {
            "id": capitulo.id,
            "numero": capitulo.numero,
            "titulo": capitulo.titulo,
        },
        "paginas": [
            {
                "id": p.id,
                "numero": p.numero,
                "tiene_canvas": bool(p.canvas_json),
                "thumbnail_url": p.thumbnail_url
            }
            for p in paginas
        ],
        "total_paginas": len(paginas)
    }