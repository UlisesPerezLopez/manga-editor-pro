# models.py
# Definición de todos los modelos de la base de datos con SQLAlchemy
# Cada clase = una tabla en la base de datos SQLite

from sqlalchemy import (
    Column, Integer, String, Boolean, Float,
    Text, DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.database import Base


class Usuario(Base):
    """Tabla de usuarios registrados en la aplicación"""
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(200), nullable=False)
    nombre_artistico = Column(String(100), nullable=True)
    avatar_url = Column(Text, nullable=True)  # URL o data:image SVG/PNG del avatar
    ai_mode = Column(String(30), default="cloud_free", nullable=False)  # 'cloud_free' o 'local'
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    proyectos = relationship("Proyecto", back_populates="usuario",
                             cascade="all, delete-orphan")


class Proyecto(Base):
    """Tabla de proyectos de cómic. Cada proyecto tiene un estilo único bloqueado."""
    __tablename__ = "proyectos"

    id = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    nombre = Column(String(200), nullable=False)
    portada_url = Column(Text, nullable=True)  # URL o base64 de la portada del proyecto

    # Modo de creación: 'propio', 'legendario' o 'aleatorio'
    modo_creacion = Column(String(20), nullable=True)
    estilo_legendario = Column(String(100), nullable=True)
    estilo_visual = Column(String(100), nullable=True)

    # Firma Visual - Sistema Prompt Maestro y Diagnóstico Estructurado
    system_prompt_maestro = Column(Text, nullable=True)
    style_prompt = Column(Text, nullable=True)  # Prompt maestro compilado para inyección en FLUX
    firma_visual_extraida = Column(JSON, nullable=True)  # Diagnóstico JSON con 4 atributos técnicos
    imagenes_referencia = Column(JSON, nullable=True)  # Array de rutas/URLs de muestras de referencia
    paleta_colores = Column(JSON, nullable=True)  # Array de hex: ["#1A1A1A", ...]
    tecnica_linea = Column(String(50), nullable=True)
    estilo_sombreado = Column(String(50), nullable=True)

    # Si es True, el estilo está bloqueado y no puede modificarse
    style_locked = Column(Boolean, default=False)

    # Formato de lectura del cómic
    formato_lectura = Column(String(20), default="manga")  # 'manga' o 'occidental'

    # Campos narrativos del guionista
    sinopsis = Column(Text, nullable=True)
    premisa = Column(Text, nullable=True)
    genero = Column(String(50), nullable=True)
    tono = Column(String(50), nullable=True)
    num_capitulos = Column(Integer, default=5, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True),
                        server_default=func.now(), onupdate=func.now())

    # Relaciones
    usuario = relationship("Usuario", back_populates="proyectos")
    personajes = relationship("Personaje", back_populates="proyecto",
                              cascade="all, delete-orphan")
    capitulos = relationship("Capitulo", back_populates="proyecto",
                             cascade="all, delete-orphan")
    prompts_historial = relationship("PromptHistorial", back_populates="proyecto",
                                     cascade="all, delete-orphan")
    referencias_estilo = relationship("ReferenciaEstilo", back_populates="proyecto",
                                      cascade="all, delete-orphan")


class Personaje(Base):
    """Tabla de personajes dentro de un proyecto"""
    __tablename__ = "personajes"

    id = Column(Integer, primary_key=True, index=True)
    id_proyecto = Column(Integer, ForeignKey("proyectos.id"), nullable=False)
    nombre = Column(String(100), nullable=False)
    descripcion_fisica = Column(Text, nullable=True)
    ropa_tipica = Column(Text, nullable=True)
    personalidad = Column(Text, nullable=True)
    arco_narrativo = Column(Text, nullable=True)

    # Prompt optimizado para IA generado automáticamente por Gemini
    prompt_ia = Column(Text, nullable=True)
    prompt_visual = Column(Text, nullable=True)
    adn_visual = Column(Text, nullable=True)

    # Avatar / Retrato oficial del personaje
    avatar_url = Column(String(500), nullable=True)

    # JSON con URLs de expresiones: {"feliz": "url", "triste": "url", ...}
    expresiones_json = Column(JSON, nullable=True)

    # Array de URLs de imágenes de referencia subidas por el usuario
    imagenes_referencia_json = Column(JSON, nullable=True)

    # ID del LoRA entrenado en Replicate (fase futura)
    lora_id = Column(String(200), nullable=True)

    # Rol del personaje en la historia
    rol = Column(String(30), default="protagonista")

    # Motivación principal del personaje
    motivacion = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    proyecto = relationship("Proyecto", back_populates="personajes")

    @property
    def vestimenta(self):
        return self.ropa_tipica

    @vestimenta.setter
    def vestimenta(self, value):
        self.ropa_tipica = value

    @property
    def proyecto_id(self):
        return self.id_proyecto



class Capitulo(Base):
    """Tabla de capítulos dentro de un proyecto"""
    __tablename__ = "capitulos"

    id = Column(Integer, primary_key=True, index=True)
    id_proyecto = Column(Integer, ForeignKey("proyectos.id"), nullable=False)
    numero = Column(Integer, nullable=False)
    titulo = Column(String(200), nullable=True)
    sinopsis = Column(Text, nullable=True)
    guion_json = Column(JSON, nullable=True)  # Desglose estructurado de páginas, viñetas y diálogos
    
    # Publicación digital, monetización y métricas
    is_published = Column(Boolean, default=False, nullable=False)
    is_premium = Column(Boolean, default=False, nullable=False)
    early_access = Column(Boolean, default=False, nullable=False)
    views_count = Column(Integer, default=0, nullable=False)
    likes_count = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    proyecto = relationship("Proyecto", back_populates="capitulos")
    paginas = relationship("Pagina", back_populates="capitulo",
                           cascade="all, delete-orphan")


class Pagina(Base):
    """Tabla de páginas dentro de un capítulo"""
    __tablename__ = "paginas"

    id = Column(Integer, primary_key=True, index=True)
    id_capitulo = Column(Integer, ForeignKey("capitulos.id"), nullable=False)
    numero = Column(Integer, nullable=False)

    # Plantilla de layout: 'splash', 'dialogue_4panel', 'action_3panel', etc.
    layout_template = Column(String(50), nullable=True)

    # Estado completo del canvas de Fabric.js serializado como JSON
    canvas_json = Column(Text, nullable=True)

    # URL de la miniatura generada para el navegador de páginas
    thumbnail_url = Column(String(500), nullable=True)

    updated_at = Column(DateTime(timezone=True),
                        server_default=func.now(), onupdate=func.now())

    # Relaciones
    capitulo = relationship("Capitulo", back_populates="paginas")
    vinetas = relationship("Vineta", back_populates="pagina",
                           cascade="all, delete-orphan")


class Vineta(Base):
    """Tabla de viñetas dentro de una página"""
    __tablename__ = "vinetas"

    id = Column(Integer, primary_key=True, index=True)
    id_pagina = Column(Integer, ForeignKey("paginas.id"), nullable=False)
    numero_vineta = Column(Integer, default=1, nullable=True)

    # Posición y dimensiones en el canvas (en píxeles)
    posicion_x = Column(Float, default=0.0)
    posicion_y = Column(Float, default=0.0)
    width = Column(Float, default=200.0)
    height = Column(Float, default=200.0)

    # Contenido narrativo y cinematográfico
    plano = Column(String(50), nullable=True)
    descripcion_escena = Column(Text, nullable=True)
    dialogo = Column(Text, nullable=True)

    # Imagen generada para esta viñeta
    imagen_url = Column(String(500), nullable=True)
    prompt_usado = Column(Text, nullable=True)

    # Puntuación de coherencia con el estilo base (0.0 a 1.0)
    score_coherencia = Column(Float, nullable=True)

    # Relaciones
    pagina = relationship("Pagina", back_populates="vinetas")
    globos_texto = relationship("GloboTexto", back_populates="vineta",
                                cascade="all, delete-orphan")


class GloboTexto(Base):
    """Tabla de bocadillos de diálogo dentro de una viñeta"""
    __tablename__ = "globos_texto"

    id = Column(Integer, primary_key=True, index=True)
    id_vineta = Column(Integer, ForeignKey("vinetas.id"), nullable=False)
    texto = Column(Text, nullable=True)

    # Tipo de bocadillo: 'dialogo', 'pensamiento', 'narracion', 'grito'
    tipo = Column(String(30), default="dialogo")

    # Posición y dimensiones en el canvas
    posicion_x = Column(Float, default=0.0)
    posicion_y = Column(Float, default=0.0)
    width = Column(Float, default=150.0)
    fuente = Column(String(100), default="Bangers")

    # Relaciones
    vineta = relationship("Vineta", back_populates="globos_texto")


class PromptHistorial(Base):
    """Historial de todos los prompts e imágenes generadas en el proyecto"""
    __tablename__ = "prompts_historial"

    id = Column(Integer, primary_key=True, index=True)
    id_proyecto = Column(Integer, ForeignKey("proyectos.id"), nullable=False)
    prompt_completo = Column(Text, nullable=True)

    # Parámetros adicionales usados: personaje, ángulo, emoción, etc.
    parametros_json = Column(JSON, nullable=True)

    imagen_url = Column(String(500), nullable=True)
    score_coherencia = Column(Float, nullable=True)

    # Si el usuario aprobó esta imagen como válida para el proyecto
    validada = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    proyecto = relationship("Proyecto", back_populates="prompts_historial")


class ReferenciaEstilo(Base):
    """Imágenes de referencia subidas para crear la Firma Visual del proyecto"""
    __tablename__ = "referencias_estilo"

    id = Column(Integer, primary_key=True, index=True)
    id_proyecto = Column(Integer, ForeignKey("proyectos.id"), nullable=False)

    # URL local o remota de la imagen de referencia
    imagen_url = Column(String(500), nullable=True)

    # Resultado del análisis de Gemini Vision para esta imagen
    analisis_json = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    proyecto = relationship("Proyecto", back_populates="referencias_estilo")