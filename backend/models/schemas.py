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
    formato_lectura: str = Field(default="manga",
                                  pattern="^(manga|jp_manga|occidental|webtoon)$")


class ProyectoActualizarPortada(BaseModel):
    """Esquema para actualizar la portada del proyecto"""
    portada_url: str = Field(min_length=1)


class ProyectoRespuesta(BaseModel):
    """Datos del proyecto devueltos al cliente"""
    id: int
    nombre: str
    portada_url: Optional[str] = None
    modo_creacion: Optional[str] = None
    estilo_legendario: Optional[str] = None
    style_locked: bool
    formato_lectura: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── SCHEMAS DE PERSONAJES ───────────────────────────────────────────────────

class PersonajeCrearCompleto(BaseModel):
    """Datos completos para crear un nuevo personaje"""
    nombre: str = Field(min_length=1, max_length=100)
    rol: str = Field(default="protagonista",
                     pattern="^(protagonista|antagonista|apoyo|secundario)$")
    descripcion_fisica: Optional[str] = None
    ropa_tipica: Optional[str] = None
    personalidad: Optional[str] = None
    arco_narrativo: Optional[str] = None
    motivacion: Optional[str] = None
    # Si True, Gemini genera automáticamente la ficha técnica IA
    generar_ficha_ia: bool = Field(default=True)


class PersonajeActualizar(BaseModel):
    """Datos para actualizar un personaje existente (todos opcionales)"""
    nombre: Optional[str] = Field(default=None, min_length=1, max_length=100)
    rol: Optional[str] = Field(
        default=None,
        pattern="^(protagonista|antagonista|apoyo|secundario)$"
    )
    descripcion_fisica: Optional[str] = None
    ropa_tipica: Optional[str] = None
    personalidad: Optional[str] = None
    arco_narrativo: Optional[str] = None
    motivacion: Optional[str] = None


class PersonajeRespuestaCompleta(BaseModel):
    """Datos completos del personaje devueltos al cliente"""
    id: int
    id_proyecto: int
    nombre: str
    rol: Optional[str] = None
    descripcion_fisica: Optional[str] = None
    ropa_tipica: Optional[str] = None
    personalidad: Optional[str] = None
    arco_narrativo: Optional[str] = None
    motivacion: Optional[str] = None
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


class CapituloRespuesta(BaseModel):
    """Datos del capítulo devueltos al cliente"""
    id: int
    id_proyecto: int
    numero: int
    titulo: Optional[str] = None
    sinopsis: Optional[str] = None
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
    is_published: bool = False
    is_premium: bool = False
    early_access: bool = False
    views_count: int = 0
    likes_count: int = 0
    paginas: List[PaginaRespuesta] = []
    created_at: datetime

    class Config:
        from_attributes = True