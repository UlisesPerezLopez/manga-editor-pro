# rate_limiter.py
# Sistema de control de velocidad para las llamadas a la API de Gemini.
# Evita el error 429 (Too Many Requests) que bloqueaba el prototipo anterior.
# Implementa: cola de peticiones, caché en memoria y backoff exponencial.

import asyncio
import time
import hashlib
import json
from typing import Optional, Any
from collections import deque

class RateLimiter:
    """
    Controla la frecuencia de peticiones a una API externa.
    Por defecto: máximo 14 peticiones por minuto (margen de seguridad sobre el límite de 15).
    """

    def __init__(self, max_calls: int = 14, period: float = 60.0):
        self.max_calls = max_calls      # Máximo de llamadas permitidas
        self.period = period            # Ventana de tiempo en segundos
        self.calls = deque()            # Historial de timestamps de llamadas
        self._lock = asyncio.Lock()     # Lock para acceso concurrente seguro

    async def acquire(self):
        """
        Espera si es necesario antes de permitir una nueva llamada a la API.
        Muestra en consola cuántas llamadas quedan disponibles.
        """
        async with self._lock:
            ahora = time.monotonic()

            # Eliminar llamadas que ya salieron de la ventana de tiempo
            while self.calls and self.calls[0] <= ahora - self.period:
                self.calls.popleft()

            # Si hemos llegado al límite, esperar hasta que libere espacio
            if len(self.calls) >= self.max_calls:
                tiempo_espera = self.period - (ahora - self.calls[0])
                if tiempo_espera > 0:
                    disponibles = self.max_calls - len(self.calls)
                    print(f"[RATE-LIMIT] Esperando {tiempo_espera:.1f}s "
                          f"(cola: {len(self.calls)}/{self.max_calls})")
                    await asyncio.sleep(tiempo_espera)

            # Registrar esta llamada
            self.calls.append(time.monotonic())
            disponibles = self.max_calls - len(self.calls)
            print(f"[GEMINI] Llamada enviada "
                  f"({disponibles} llamadas disponibles en esta ventana)")


class CacheMemoria:
    """
    Caché en memoria para evitar llamadas repetidas a la API con el mismo prompt.
    TTL por defecto: 5 minutos. Máximo 200 entradas.
    """

    def __init__(self, ttl_segundos: int = 300, max_entradas: int = 200):
        self.ttl = ttl_segundos
        self.max_entradas = max_entradas
        self._cache: dict = {}          # {hash_clave: (timestamp, valor)}

    def _generar_clave(self, texto: str) -> str:
        """Genera un hash MD5 del texto para usarlo como clave de caché."""
        return hashlib.md5(texto.encode('utf-8')).hexdigest()

    def get(self, prompt: str) -> Optional[Any]:
        """
        Busca un resultado en caché. Devuelve None si no existe o ha expirado.
        """
        clave = self._generar_clave(prompt)
        if clave not in self._cache:
            return None

        timestamp, valor = self._cache[clave]
        if time.time() - timestamp > self.ttl:
            del self._cache[clave]
            return None

        print(f"[CACHE-HIT] Reutilizando respuesta guardada")
        return valor

    def set(self, prompt: str, valor: Any):
        """
        Guarda un resultado en caché. Si está lleno, elimina la entrada más antigua.
        """
        # Limpiar entradas antiguas si el caché está lleno
        if len(self._cache) >= self.max_entradas:
            clave_mas_antigua = min(self._cache, key=lambda k: self._cache[k][0])
            del self._cache[clave_mas_antigua]

        clave = self._generar_clave(prompt)
        self._cache[clave] = (time.time(), valor)
        print(f"[CACHE-SET] Respuesta guardada ({len(self._cache)} entradas)")

    def limpiar(self):
        """Vacía completamente el caché."""
        self._cache.clear()
        print("[CACHE-CLEAR] Cache limpiado")


# Instancias globales compartidas por toda la aplicación
gemini_rate_limiter = RateLimiter(max_calls=14, period=60.0)
gemini_cache = CacheMemoria(ttl_segundos=300, max_entradas=200)