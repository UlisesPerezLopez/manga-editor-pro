# replicate_service.py
# Servicio de generación de imágenes con Replicate API.
# Modelo principal: Flux Schnell (rápido, barato, alta calidad)
# Modelo premium: Flux Dev (mayor calidad, más lento)
# Activado como fallback cuando Gemini Imagen no está disponible.

import os
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv()

REPLICATE_TOKEN = os.getenv("REPLICATE_API_TOKEN", "")

# Modelos disponibles en Replicate
FLUX_SCHNELL = "black-forest-labs/flux-schnell"   # ~$0.003/img, 4 pasos
FLUX_DEV     = "black-forest-labs/flux-dev"       # ~$0.03/img, mejor calidad


class ReplicateService:
    """
    Servicio de generación de imágenes con Replicate API.
    Usa Flux Schnell por defecto para minimizar costes.
    """

    def __init__(self):
        self.token = REPLICATE_TOKEN
        self.base_url = "https://api.replicate.com/v1"

    def _esta_configurado(self) -> bool:
        """Verifica que el token de Replicate está configurado."""
        return bool(self.token and self.token != "")

    async def generar_imagen(
        self,
        prompt: str,
        ancho: int = 1024,
        alto: int = 1024,
        modelo: str = FLUX_SCHNELL,
        pasos: int = 4
    ) -> str:
        """
        Genera una imagen con Replicate/Flux.
        Devuelve la URL pública de la imagen generada.
        El proceso es asíncrono: crea la predicción y espera el resultado.
        """
        if not self._esta_configurado():
            raise Exception(
                "REPLICATE_API_TOKEN no configurado en .env. "
                "Añade tu token de https://replicate.com/account/api-tokens"
            )

        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "Prefer": "wait"   # Esperar resultado en la misma petición (hasta 60s)
        }

        payload = {
            "input": {
                "prompt": prompt,
                "width": ancho,
                "height": alto,
                "num_inference_steps": pasos,
                "output_format": "png",
                "output_quality": 90,
            }
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            # Crear predicción
            print(f"🎨 Replicate: iniciando generación con {modelo}...")
            respuesta = await client.post(
                f"{self.base_url}/models/{modelo}/predictions",
                json=payload,
                headers=headers
            )

            if respuesta.status_code not in (200, 201):
                raise Exception(
                    f"Replicate error {respuesta.status_code}: "
                    f"{respuesta.text[:300]}"
                )

            datos = respuesta.json()

            # Si "Prefer: wait" funcionó, el output ya está disponible
            if datos.get("status") == "succeeded":
                output = datos.get("output", [])
                if isinstance(output, list) and output:
                    print(f"✅ Replicate: imagen generada correctamente")
                    return output[0]
                elif isinstance(output, str):
                    return output

            # Si no, hacer polling hasta obtener resultado
            prediction_id = datos.get("id")
            if not prediction_id:
                raise Exception("Replicate no devolvió ID de predicción")

            return await self._esperar_resultado(client, headers, prediction_id)

    async def _esperar_resultado(self, client, headers,
                                  prediction_id: str,
                                  max_intentos: int = 30) -> str:
        """
        Hace polling cada 2 segundos hasta obtener el resultado.
        Timeout: 60 segundos máximo.
        """
        for intento in range(max_intentos):
            await asyncio.sleep(2)

            respuesta = await client.get(
                f"{self.base_url}/predictions/{prediction_id}",
                headers=headers
            )
            datos = respuesta.json()
            estado = datos.get("status")

            print(f"   ⏳ Replicate polling {intento + 1}/{max_intentos}: {estado}")

            if estado == "succeeded":
                output = datos.get("output", [])
                if isinstance(output, list) and output:
                    print("✅ Replicate: imagen lista")
                    return output[0]
                elif isinstance(output, str):
                    return output

            elif estado == "failed":
                error = datos.get("error", "Error desconocido")
                raise Exception(f"Replicate falló: {error}")

        raise Exception(
            f"Timeout: Replicate tardó más de {max_intentos * 2}s"
        )

    async def verificar_conexion(self) -> bool:
        """Verifica que el token de Replicate es válido."""
        if not self._esta_configurado():
            return False
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get(
                    f"{self.base_url}/account",
                    headers={"Authorization": f"Bearer {self.token}"}
                )
                return r.status_code == 200
        except Exception:
            return False


# Instancia global del servicio
replicate_service = ReplicateService()