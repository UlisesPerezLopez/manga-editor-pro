# schemas.py
# Schemas de Pydantic v2 para validación de datos en los endpoints
# Define qué datos se aceptan y qué datos se devuelven en cada petición

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime


# ─── SCHEMAS DE AUTENTICACIÓN ───────────────────────────────────────────────

class UsuarioRegistro(BaseModel):
    """Datos requeridos para registrar un nuevo usuario"""
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=6)
    nombre_artistico: Optional[str] = None


class UsuarioLogin(BaseModel):
    """Datos requeridos para iniciar sesión"""
    email: EmailStr
    password: str
    recordarme: bool = False  # Si True, el token dura 30 días


class UsuarioRespuesta(BaseModel):
    """Datos del usuario que se devuelven al cliente (sin contraseña)"""
    id: int
    username: str
    email: str
    nombre_artistico: Optional[str] = None
    avatar_url: Optional[str] = None
    ai_mode: Optional[str] = "cloud_free"
    activo: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UsuarioActualizarModoAI(BaseModel):
    """Esquema para conmutar el modo de IA del usuario ('cloud_free' o 'local')"""
    ai_mode: str = Field(pattern="^(cloud_free|local)$")


class UsuarioActualizarAvatar(BaseModel):
    """Esquema para actualizar el avatar de usuario"""
    avatar_url: str = Field(min_length=1)


class TokenRespuesta(BaseModel):
    """Respuesta del login con el token JWT"""
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioRespuesta


# ─── SCHEMAS DE PROYECTOS ────────────────────────────────────────────────────

class ProyectoCrear(BaseModel):
    """Datos para crear un nuevo proyecto"""
    nombre: str = Field(min_length=1, max_length=200)
    modo_creacion: str = Field(pattern="^(propio|legendario|aleatorio)$")
    estilo_legendario: Optional[str] = None
    estilo_visual: Optional[str] = "mortadela_y_salchichon"
    formato_lectura: str = Field(default="manga",
                                  pattern="^(manga|jp_manga|occidental|webtoon)$")


class ProyectoActualizarPortada(BaseModel):
    """Esquema para actualizar la portada del proyecto"""
    portada_url: str = Field(min_length=1)


class GenerarPortadaRequest(BaseModel):
    """Datos para generar la portada oficial con el estilo de la firma visual"""
    prompt: str = Field(min_length=3, description="Prompt visual de la portada")
    aspect_ratio: Optional[str] = Field(default="3:4", description="Relación de aspecto: 3:4, 2:3, 9:16, 1:1")


class ProyectoActualizar(BaseModel):
    """Datos para actualizar información general y narrativa de un proyecto"""
    nombre: Optional[str] = Field(default=None, min_length=1, max_length=200)
    sinopsis: Optional[str] = None
    premisa: Optional[str] = None
    genero: Optional[str] = None
    tono: Optional[str] = None
    num_capitulos: Optional[int] = Field(default=None, ge=1, le=50)
    formato_lectura: Optional[str] = Field(default=None, pattern="^(manga|jp_manga|occidental|webtoon)$")
    portada_url: Optional[str] = None
    estilo_visual: Optional[str] = None


class ProyectoRespuesta(BaseModel):
    """Datos del proyecto devueltos al cliente"""
    id: int
    nombre: str
    portada_url: Optional[str] = None
    modo_creacion: Optional[str] = None
    estilo_legendario: Optional[str] = None
    estilo_visual: Optional[str] = None
    style_locked: bool
    formato_lectura: str
    sinopsis: Optional[str] = None
    premisa: Optional[str] = None
    genero: Optional[str] = None
    tono: Optional[str] = None
    num_capitulos: Optional[int] = 5
    system_prompt_maestro: Optional[str] = None
    style_prompt: Optional[str] = None
    firma_visual_extraida: Optional[Any] = None
    imagenes_referencia: Optional[List[str]] = None
    paleta_colores: Optional[List[str]] = None
    tecnica_linea: Optional[str] = None
    estilo_sombreado: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── SCHEMAS DE PERSONAJES ───────────────────────────────────────────────────

class PersonajeCrearCompleto(BaseModel):
    """Datos completos para crear un nuevo personaje"""
    nombre: str = Field(min_length=1, max_length=100)
    rol: Optional[str] = Field(
        default="protagonista",
        pattern="^(protagonista|coprotagonista|antagonista|apoyo|secundario|mentor|rival)$"
    )
    descripcion_fisica: Optional[str] = None
    ropa_tipica: Optional[str] = None
    vestimenta: Optional[str] = None
    personalidad: Optional[str] = None
    arco_narrativo: Optional[str] = None
    motivacion: Optional[str] = None
    avatar_url: Optional[str] = None
    prompt_visual: Optional[str] = None
    adn_visual: Optional[str] = None
    # Si True, genera automáticamente la ficha técnica IA
    generar_ficha_ia: bool = Field(default=False)


class PersonajeActualizar(BaseModel):
    """Datos para actualizar un personaje existente (todos opcionales)"""
    nombre: Optional[str] = Field(default=None, min_length=1, max_length=100)
    rol: Optional[str] = Field(
        default=None,
        pattern="^(protagonista|coprotagonista|antagonista|apoyo|secundario|mentor|rival)$"
    )
    descripcion_fisica: Optional[str] = None
    ropa_tipica: Optional[str] = None
    vestimenta: Optional[str] = None
    personalidad: Optional[str] = None
    arco_narrativo: Optional[str] = None
    motivacion: Optional[str] = None
    avatar_url: Optional[str] = None
    prompt_visual: Optional[str] = None
    adn_visual: Optional[str] = None


class GenerarAvatarPersonajeRequest(BaseModel):
    """Datos para solicitar la generación de retrato/avatar oficial con Firma Visual"""
    prompt_personalizado: Optional[str] = Field(default=None, description="Prompt visual personalizado opcional")
    aspect_ratio: Optional[str] = Field(default="1:1", description="Relación de aspecto: 1:1 o 3:4")


class PersonajeRespuestaCompleta(BaseModel):
    """Datos completos del personaje devueltos al cliente"""
    id: int
    id_proyecto: int
    nombre: str
    rol: Optional[str] = None
    descripcion_fisica: Optional[str] = None
    ropa_tipica: Optional[str] = None
    vestimenta: Optional[str] = None
    personalidad: Optional[str] = None
    arco_narrativo: Optional[str] = None
    motivacion: Optional[str] = None
    avatar_url: Optional[str] = None
    prompt_visual: Optional[str] = None
    adn_visual: Optional[str] = None
    prompt_ia: Optional[str] = None
    expresiones_json: Optional[Any] = None
    imagenes_referencia_json: Optional[Any] = None
    lora_id: Optional[str] = None

    class Config:
        from_attributes = True



# ─── SCHEMAS DE CAPÍTULOS Y PÁGINAS ─────────────────────────────────────────

class CapituloCrear(BaseModel):
    """Datos para crear un nuevo capítulo"""
    numero: int = Field(ge=1)
    titulo: Optional[str] = None
    sinopsis: Optional[str] = None


class PaginaCrear(BaseModel):
    """Datos para crear una nueva página"""
    numero: int = Field(ge=1)
    layout_template: Optional[str] = None


class PaginaActualizar(BaseModel):
    """Datos para guardar el estado del canvas de una página"""
    canvas_json: Optional[str] = None
    thumbnail_url: Optional[str] = None


# ─── SCHEMAS GENERALES ───────────────────────────────────────────────────────

class MensajeRespuesta(BaseModel):
    """Respuesta genérica para operaciones de éxito o error"""
    mensaje: str
    exito: bool = True
    datos: Optional[Any] = None


# ─── SCHEMAS DE GENERACIÓN DE GUIONES ───────────────────────────────────────

class GenerarSinopsisRequest(BaseModel):
    """Datos para generar la sinopsis y estructura general del proyecto"""
    titulo: str = Field(min_length=1)
    genero: str = Field(default="aventura")
    tono: str = Field(default="épico y emotivo")
    premisa: str = Field(min_length=10)
    num_capitulos: int = Field(default=5, ge=1, le=20)


class GenerarCapituloRequest(BaseModel):
    """Datos para generar el guion completo de un capítulo"""
    id_proyecto: int
    numero_capitulo: int = Field(ge=1)
    premisa: str = Field(min_length=10)
    genero: str = Field(default="aventura")
    tono: str = Field(default="épico y emotivo")
    guardar_en_bd: bool = Field(default=True)


class GenerarDescripcionVinetaRequest(BaseModel):
    """Datos para generar el prompt de imagen de una viñeta"""
    descripcion_escena: str = Field(min_length=5)
    personajes: List[str] = Field(default=[])
    estilo_prompt: str = Field(default="manga style, professional artwork")
    emocion: str = Field(default="neutral")
    angulo: str = Field(default="plano medio")


class MejorarDialogoRequest(BaseModel):
    """Datos para mejorar un diálogo de cómic"""
    dialogo_original: str = Field(min_length=1)
    personaje: str = Field(min_length=1)
    emocion: str = Field(default="neutral")
    contexto: str = Field(default="escena del cómic")


# ─── SCHEMAS DE FIRMA VISUAL ─────────────────────────────────────────────────

class FirmaVisualDiagnostico(BaseModel):
    """Diagnóstico estructurado de 4 atributos técnicos de estilo"""
    tipo_trazo: str = Field(description="Tipo de trazo y plumilla (grosor, firmeza, acabado orgánico o digital)")
    tratamiento_sombras: str = Field(description="Tratamiento de sombras y tramas (screentone, cross-hatching, aguada o pleno)")
    paleta_cromatica: List[str] = Field(default=[], description="Paleta cromática dominante (hex colors)")
    style_prompt: str = Field(description="Prompt maestro de inyección visual")
    proporciones_personaje: Optional[str] = None
    atmosfera: Optional[str] = None
    elementos_caracteristicos: Optional[List[str]] = []
    nivel_detalle: Optional[str] = "medio"
    predominancia: Optional[str] = "blanco_negro"
    num_imagenes_analizadas: Optional[int] = 0


class FirmaVisualActualizarRequest(BaseModel):
    """Datos para actualizar y fijar/bloquear la firma visual"""
    tipo_trazo: Optional[str] = None
    tratamiento_sombras: Optional[str] = None
    paleta_cromatica: Optional[List[str]] = None
    style_prompt: Optional[str] = None
    firma_visual_extraida: Optional[Any] = None
    style_locked: Optional[bool] = None


class FirmaVisualRespuesta(BaseModel):
    """Respuesta completa del estado de la Firma Visual"""
    proyecto_id: int
    nombre_proyecto: str
    modo_creacion: Optional[str] = None
    estilo_legendario: Optional[str] = None
    estilo_visual: Optional[str] = None
    style_locked: bool = False
    style_prompt: Optional[str] = None
    system_prompt_maestro: Optional[str] = None
    firma_visual_extraida: Optional[Any] = None
    imagenes_referencia: Optional[List[str]] = []
    num_referencias: int = 0
    paleta_colores: Optional[List[str]] = []
    tecnica_linea: Optional[str] = None
    estilo_sombreado: Optional[str] = None
    preset_info: Optional[Any] = None


class EstadoEstiloRespuesta(BaseModel):
    """Estado actual de la Firma Visual de un proyecto"""
    modo_creacion: Optional[str]
    num_referencias: int
    tiene_analisis: bool
    style_locked: bool
    paleta_colores: Optional[List[str]] = []
    tecnica_linea: Optional[str] = ""
    system_prompt_preview: Optional[str] = None


class PerfilEstiloRespuesta(BaseModel):
    """Resultado del análisis de imágenes de referencia"""
    paleta_colores: Optional[List[str]] = []
    tecnica_linea: Optional[str]
    estilo_sombreado: Optional[str]
    proporciones_personaje: Optional[str]
    atmosfera: Optional[str]
    elementos_caracteristicos: Optional[List[str]] = []
    nivel_detalle: Optional[str]
    predominancia: Optional[str]
    num_imagenes_analizadas: Optional[int]


# ─── SCHEMAS DE CAPÍTULOS Y PÁGINAS (EDITOR) ─────────────────────────────────

class CapituloCrearRequest(BaseModel):
    """Datos para crear un nuevo capítulo"""
    numero: int = Field(ge=1)
    titulo: Optional[str] = Field(default=None, max_length=200)
    sinopsis: Optional[str] = None
    guion_json: Optional[Any] = None


class CapituloActualizarRequest(BaseModel):
    """Datos para actualizar el título o guion/sinopsis de un capítulo"""
    titulo: Optional[str] = Field(default=None, max_length=200)
    sinopsis: Optional[str] = None
    guion_json: Optional[Any] = None


class CapituloRespuesta(BaseModel):
    """Datos del capítulo devueltos al cliente"""
    id: int
    id_proyecto: int
    numero: int
    titulo: Optional[str] = None
    sinopsis: Optional[str] = None
    guion_json: Optional[Any] = None
    is_published: bool = False
    is_premium: bool = False
    early_access: bool = False
    views_count: int = 0
    likes_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class CapituloPublishStatusRequest(BaseModel):
    """Datos para actualizar el estado de publicación y monetización"""
    is_published: Optional[bool] = None
    is_premium: Optional[bool] = None
    early_access: Optional[bool] = None


class PaginaCrearRequest(BaseModel):
    """Datos para crear una nueva página"""
    numero: int = Field(ge=1)
    layout_template: Optional[str] = Field(default="blank")


class PaginaRespuesta(BaseModel):
    """Datos de la página devueltos al cliente"""
    id: int
    id_capitulo: int
    numero: int
    layout_template: Optional[str] = None
    canvas_json: Optional[str] = None
    thumbnail_url: Optional[str] = None
    updated_at: datetime

    class Config:
        from_attributes = True


class PaginaGuardarRequest(BaseModel):
    """Datos para guardar el estado del canvas"""
    canvas_json: str
    thumbnail_url: Optional[str] = None


class CapituloConPaginasRespuesta(BaseModel):
    """Capítulo con su lista de páginas incluida"""
    id: int
    id_proyecto: int
    numero: int
    titulo: Optional[str] = None
    sinopsis: Optional[str] = None
    guion_json: Optional[Any] = None
    is_published: bool = False
    is_premium: bool = False
    early_access: bool = False
    views_count: int = 0
    likes_count: int = 0
    paginas: List[PaginaRespuesta] = []
    created_at: datetime

    class Config:
        from_attributes = True


# ─── GENERADOR DE VIÑETAS (PANEL ART STUDIO) ────────────────────────────────

class GenerarImagenVinetaRequest(BaseModel):
    """Payload para generar ilustración de viñeta con FLUX.1 Dev y anclajes anti-alucinación"""
    capitulo_num: int = Field(default=1, ge=1)
    pagina_num: int = Field(default=1, ge=1)
    vineta_num: int = Field(default=1, ge=1)
    prompt: str = Field(..., min_length=1, description="Descripción visual de la escena")
    plano: Optional[str] = Field(default="Plano medio", description="Plano de cámara / encuadre")
    dialogo: Optional[str] = Field(default=None, description="Diálogo o texto de referencia")
    personajes_ids: List[int] = Field(default=[], description="IDs de personajes presentes en escena")
    aspect_ratio: str = Field(default="1:1", description="16:9, 4:3, 3:4, 9:16, 1:1")
    seed: Optional[int] = Field(default=None, description="Semilla aleatoria para generación estocástica de imagen")
    referencia_extra_url: Optional[str] = Field(default=None, description="URL o data URI de referencia visual adicional")


class GuardarVinetaRequest(BaseModel):
    """Payload para guardar y sincronizar datos de una viñeta manualmente"""
    capitulo_num: int = Field(default=1, ge=1)
    pagina_num: int = Field(default=1, ge=1)
    vineta_num: int = Field(default=1, ge=1)
    imagen_url: Optional[str] = None
    prompt: Optional[str] = None
    plano: Optional[str] = None
    dialogo: Optional[str] = None


class VinetaRespuesta(BaseModel):
    """Respuesta de datos de viñeta persistida"""
    id: int
    id_pagina: int
    numero_vineta: Optional[int] = 1
    plano: Optional[str] = None
    descripcion_escena: Optional[str] = None
    dialogo: Optional[str] = None
    imagen_url: Optional[str] = None
    prompt_usado: Optional[str] = None
    posicion_x: Optional[float] = 0.0
    posicion_y: Optional[float] = 0.0
    width: Optional[float] = 200.0
    height: Optional[float] = 200.0

    class Config:
        from_attributes = True


class GenerarIdeaPersonajeRequest(BaseModel):
    """Payload para generar una idea rápida de personaje contextualizada"""
    rol_sugerido: Optional[str] = None
    tono: Optional[str] = None
    genero: Optional[str] = None