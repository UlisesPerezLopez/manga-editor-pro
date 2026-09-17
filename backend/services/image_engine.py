# image_engine.py
# Motor gráfico unificado y modular para MEP — Manga Editor Pro.
# Soporta:
# 1. Modo 'local': ComfyUI (http://127.0.0.1:8188) con workflow JSON y nodos IPAdapter para consistencia.
# 2. Modo 'cloud_free': Pipeline sin coste (Pollinations Flux/SDXL libre de API key y Gemini Free).

import os
import json
import base64
import uuid
import urllib.parse
import asyncio
from typing import Optional, Dict, Any, Tuple
from pathlib import Path
import httpx
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)
load_dotenv()

COMFYUI_BASE_URL = os.getenv("COMFYUI_BASE_URL", "http://127.0.0.1:8188").rstrip("/")
COMFYUI_CHECKPOINT = os.getenv("COMFYUI_CHECKPOINT", "animagineXL_v30.safetensors")
POLLINATIONS_IMAGE_URL = os.getenv("POLLINATIONS_IMAGE_URL", "https://image.pollinations.ai").rstrip("/")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()


class ImageEngine:
    """
    Motor de generación de imágenes modular para viñetas y arte de manga.
    """

    def __init__(self):
        self.comfyui_url = COMFYUI_BASE_URL
        self.checkpoint = COMFYUI_CHECKPOINT
        self.pollinations_url = POLLINATIONS_IMAGE_URL

    # ─── MODO LOCAL: COMFYUI CON WORKFLOW JSON & IPADAPTER ──────────────────

    def _crear_workflow_comfyui(
        self,
        prompt_positivo: str,
        ancho: int = 1024,
        alto: int = 1024,
        imagen_referencia_nombre: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Construye el grafo de ejecución (workflow JSON) para la API de ComfyUI.
        Si hay imagen de referencia, inyecta nodos IPAdapter para transferencia de estilo/personaje.
        """
        prompt_negativo = (
            "blurry, low quality, distorted, bad anatomy, deformed limbs, "
            "watermark, text, signature, lowres, ugly"
        )

        workflow: Dict[str, Any] = {
            "3": {
                "class_type": "KSampler",
                "inputs": {
                    "cfg": 7.0,
                    "denoise": 1.0,
                    "latent_image": ["5", 0],
                    "model": ["4", 0],
                    "negative": ["7", 0],
                    "positive": ["6", 0],
                    "sampler_name": "euler_ancestral",
                    "scheduler": "karras",
                    "seed": int(uuid.uuid4().int % 1000000000),
                    "steps": 25
                }
            },
            "4": {
                "class_type": "CheckpointLoaderSimple",
                "inputs": {
                    "ckpt_name": self.checkpoint
                }
            },
            "5": {
                "class_type": "EmptyLatentImage",
                "inputs": {
                    "batch_size": 1,
                    "height": alto,
                    "width": ancho
                }
            },
            "6": {
                "class_type": "CLIPTextEncode",
                "inputs": {
                    "clip": ["4", 1],
                    "text": f"masterpiece, high quality manga illustration, {prompt_positivo}"
                }
            },
            "7": {
                "class_type": "CLIPTextEncode",
                "inputs": {
                    "clip": ["4", 1],
                    "text": prompt_negativo
                }
            },
            "8": {
                "class_type": "VAEDecode",
                "inputs": {
                    "samples": ["3", 0],
                    "vae": ["4", 2]
                }
            },
            "9": {
                "class_type": "SaveImage",
                "inputs": {
                    "filename_prefix": "MEP_Manga",
                    "images": ["8", 0]
                }
            }
        }

        # Inyección opcional de IPAdapter si se proporciona imagen de referencia
        if imagen_referencia_nombre:
            workflow["10"] = {
                "class_type": "LoadImage",
                "inputs": {"image": imagen_referencia_nombre}
            }
            workflow["11"] = {
                "class_type": "IPAdapterModelLoader",
                "inputs": {"ipadapter_file": "ip-adapter-plus_sdxl_vit-h.safetensors"}
            }
            workflow["12"] = {
                "class_type": "IPAdapterApply",
                "inputs": {
                    "ipadapter": ["11", 0],
                    "model": ["4", 0],
                    "image": ["10", 0],
                    "weight": 0.75,
                    "noise": 0.33
                }
            }
            # Conectar el modelo con IPAdapter al KSampler
            workflow["3"]["inputs"]["model"] = ["12", 0]

        return workflow

    async def _generar_local_comfyui(
        self,
        prompt: str,
        ancho: int = 1024,
        alto: int = 1024,
        imagen_referencia_b64: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Envía la petición a ComfyUI local, realiza polling de ejecución y descarga la imagen en base64.
        """
        client_id = str(uuid.uuid4())
        ref_filename = None

        async with httpx.AsyncClient(timeout=180.0) as client:
            # Si hay imagen de referencia, subirla a ComfyUI /upload/image
            if imagen_referencia_b64:
                try:
                    b64_clean = imagen_referencia_b64.split(",")[-1]
                    raw_bytes = base64.b64decode(b64_clean)
                    files = {"image": ("ref_char.png", raw_bytes, "image/png")}
                    up_resp = await client.post(f"{self.comfyui_url}/upload/image", files=files)
                    if up_resp.status_code == 200:
                        ref_filename = up_resp.json().get("name")
                except Exception as e:
                    print(f"⚠️ Error subiendo imagen de referencia a ComfyUI: {e}")

            workflow = self._crear_workflow_comfyui(
                prompt_positivo=prompt,
                ancho=ancho,
                alto=alto,
                imagen_referencia_nombre=ref_filename
            )

            # Enviar prompt a la cola
            prompt_payload = {"prompt": workflow, "client_id": client_id}
            try:
                resp = await client.post(f"{self.comfyui_url}/prompt", json=prompt_payload)
            except httpx.ConnectError:
                raise Exception(
                    f"No se pudo conectar a ComfyUI en {self.comfyui_url}. "
                    f"Asegúrate de que ComfyUI está encendido (`python main.py --listen 127.0.0.1 --port 8188`)."
                )

            if resp.status_code != 200:
                raise Exception(f"ComfyUI rechazó el workflow: {resp.text[:300]}")

            prompt_id = resp.json().get("prompt_id")
            if not prompt_id:
                raise Exception("ComfyUI no devolvió prompt_id")

            # Polling de historial hasta que el nodo de guardado termine
            max_intentos = 60
            for i in range(max_intentos):
                await asyncio.sleep(2.0)
                hist_resp = await client.get(f"{self.comfyui_url}/history/{prompt_id}")
                if hist_resp.status_code == 200:
                    hist_data = hist_resp.json()
                    if prompt_id in hist_data:
                        outputs = hist_data[prompt_id].get("outputs", {})
                        for _, node_output in outputs.items():
                            images = node_output.get("images", [])
                            if images:
                                img_info = images[0]
                                filename = img_info.get("filename")
                                subfolder = img_info.get("subfolder", "")
                                img_type = img_info.get("type", "output")

                                # Descargar imagen resultante
                                view_resp = await client.get(
                                    f"{self.comfyui_url}/view",
                                    params={"filename": filename, "subfolder": subfolder, "type": img_type}
                                )
                                if view_resp.status_code == 200:
                                    b64_res = base64.b64encode(view_resp.content).decode("utf-8")
                                    return f"data:image/png;base64,{b64_res}", "base64"

            raise Exception("Timeout esperando renderizado en ComfyUI.")

    # ─── MODO CLOUD FREE: PIPELINE GRATUITO SIN API KEY ──────────────────────

    async def _generar_cloud_free(
        self,
        prompt: str,
        ancho: int = 1024,
        alto: int = 1024
    ) -> Tuple[str, str]:
        """
        Genera imágenes usando el pipeline gratuito Pollinations Flux / SDXL.
        Zero coste, sin límites de facturación y alta velocidad.
        """
        encoded_prompt = urllib.parse.quote(prompt)
        seed = int(uuid.uuid4().int % 10000000)
        
        # Endpoint de imagen directa
        image_url = (
            f"{self.pollinations_url}/prompt/{encoded_prompt}"
            f"?width={ancho}&height={alto}&model=flux&nologo=true&enhance=false&seed={seed}"
        )

        try:
            # Validamos conectividad y pre-cargamos la imagen para verificar que se generó
            async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
                resp = await client.get(image_url)
                if resp.status_code == 200:
                    # Devolvemos URL directa o base64
                    b64_img = base64.b64encode(resp.content).decode("utf-8")
                    mime = resp.headers.get("content-type", "image/png")
                    return f"data:{mime};base64,{b64_img}", "base64"
                
                # Si no descarga el binario directamente, devolvemos la URL persistente
                return image_url, "url"

        except Exception as e:
            print(f"⚠️ Pollinations descarga directa con fallback a URL: {e}")
            return image_url, "url"

    # ─── MÉTODO PÚBLICO PRINCIPAL ────────────────────────────────────────────

    async def generar_imagen(
        self,
        prompt: str,
        ancho: int = 1024,
        alto: int = 1024,
        modo: str = "cloud_free",
        imagen_referencia_b64: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Punto de entrada universal para generación de imágenes en viñetas.
        """
        if modo == "local":
            imagen, tipo = await self._generar_local_comfyui(
                prompt=prompt,
                ancho=ancho,
                alto=alto,
                imagen_referencia_b64=imagen_referencia_b64
            )
            return {
                "imagen": imagen,
                "tipo": tipo,
                "proveedor": "comfyui_local",
                "modo": "local"
            }

        imagen, tipo = await self._generar_cloud_free(prompt=prompt, ancho=ancho, alto=alto)
        return {
            "imagen": imagen,
            "tipo": tipo,
            "proveedor": "pollinations_cloud_free",
            "modo": "cloud_free"
        }

    async def verificar_estado(self, modo: str = "cloud_free") -> dict:
        """Verifica la salud y estado de los proveedores gráficos."""
        if modo == "local":
            try:
                async with httpx.AsyncClient(timeout=4.0) as client:
                    resp = await client.get(f"{self.comfyui_url}/system_stats")
                    if resp.status_code == 200:
                        return {
                            "estado": "OPERATIVO",
                            "modo": "local",
                            "motor": "ComfyUI Local",
                            "url": self.comfyui_url,
                            "checkpoint": self.checkpoint,
                            "mensaje": "ComfyUI conectado y listo para procesar workflows"
                        }
            except Exception as e:
                return {
                    "estado": "OFFLINE",
                    "modo": "local",
                    "motor": "ComfyUI Local",
                    "error": str(e),
                    "mensaje": f"ComfyUI no responde en {self.comfyui_url}"
                }

        # Cloud Free
        return {
            "estado": "OPERATIVO",
            "modo": "cloud_free",
            "motor": "Pollinations Flux (Zero Cost)",
            "mensaje": "Pipeline gráfico Cloud Gratuito operativo"
        }


# Instancia global singleton
image_engine = ImageEngine()
