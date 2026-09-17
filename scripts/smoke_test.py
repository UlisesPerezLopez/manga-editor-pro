#!/usr/bin/env python3
# smoke_test.py
# Script de Smoke Testing Automatizado para validar la salud de MEP (Frontend & Backend) en local o producción.

import sys
import time
import argparse
import urllib.request
import urllib.error
import json

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"


def print_banner():
    print(f"{CYAN}{BOLD}" + "=" * 70)
    print(" 🎌 MEP — MANGA EDITOR PRO: SMOKE TEST SUITE DE PRODUCCIÓN")
    print("=" * 70 + f"{RESET}")


def check_url(name: str, url: str, expected_status: int = 200, json_validator=None, timeout: float = 5.0):
    t_start = time.time()
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "MEP-SmokeTest/2.0"}
        )
        with urllib.request.urlopen(req, timeout=timeout) as response:
            status = response.getcode()
            content = response.read().decode("utf-8", errors="replace")
            latency_ms = round((time.time() - t_start) * 1000, 1)

            if status != expected_status:
                print(f"  {RED}❌ [{status}] {name}{RESET} -> Esperado {expected_status} ({latency_ms}ms)")
                return False

            if json_validator:
                try:
                    data = json.loads(content)
                    if not json_validator(data):
                        print(f"  {RED}❌ [JSON ERROR] {name}{RESET} -> Validación de esquema JSON fallida ({latency_ms}ms)")
                        return False
                except json.JSONDecodeError:
                    print(f"  {RED}❌ [PARSE ERROR] {name}{RESET} -> No es JSON válido ({latency_ms}ms)")
                    return False

            print(f"  {GREEN}✅ [{status} OK] {name}{RESET} ({latency_ms}ms) -> {url}")
            return True

    except urllib.error.HTTPError as e:
        latency_ms = round((time.time() - t_start) * 1000, 1)
        if e.code == expected_status:
            print(f"  {GREEN}✅ [{e.code}] {name}{RESET} ({latency_ms}ms) -> {url}")
            return True
        print(f"  {RED}❌ [{e.code} HTTP ERROR] {name}{RESET} ({latency_ms}ms) -> {url}")
        return False
    except Exception as e:
        latency_ms = round((time.time() - t_start) * 1000, 1)
        print(f"  {RED}❌ [CONNECTION ERROR] {name}{RESET} ({latency_ms}ms) -> {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Smoke testing para MEP Frontend y Backend.")
    parser.add_argument("--backend-url", default="http://localhost:8000", help="URL base del Backend API")
    parser.add_argument("--frontend-url", default="http://localhost:5173", help="URL base del Frontend")
    parser.add_argument("--timeout", type=float, default=6.0, help="Timeout por petición en segundos")
    args = parser.parse_args()

    print_banner()
    print(f"🎯 Backend objetivo:  {args.backend_url}")
    print(f"🎯 Frontend objetivo: {args.frontend_url}")
    print("-" * 70)

    results = []

    # ─── 1. PRUEBAS DE BACKEND ───────────────────────────────────────────────
    print(f"\n{BOLD}🔹 1. Comprobación de Endpoints del Backend (FastAPI):{RESET}")

    # Root / Info
    results.append(check_url(
        name="Backend Root Info",
        url=f"{args.backend_url}/",
        expected_status=200,
        json_validator=lambda d: d.get("status") == "ONLINE",
        timeout=args.timeout
    ))

    # Healthcheck
    results.append(check_url(
        name="Backend Healthcheck",
        url=f"{args.backend_url}/health",
        expected_status=200,
        json_validator=lambda d: d.get("status") == "healthy",
        timeout=args.timeout
    ))

    # Diagnóstico de Motores de IA
    results.append(check_url(
        name="Estado de Motores de IA",
        url=f"{args.backend_url}/generate/estado-ia",
        expected_status=200,
        json_validator=lambda d: "subsistemas" in d,
        timeout=args.timeout
    ))

    # Documentación Swagger / OpenAPI
    results.append(check_url(
        name="Documentación Swagger UI",
        url=f"{args.backend_url}/docs",
        expected_status=200,
        timeout=args.timeout
    ))

    # ─── 2. PRUEBAS DE FRONTEND ──────────────────────────────────────────────
    print(f"\n{BOLD}🔹 2. Comprobación del Frontend SPA y PWA:{RESET}")

    # App Web SPA
    results.append(check_url(
        name="Frontend SPA Base HTML",
        url=f"{args.frontend_url}/",
        expected_status=200,
        timeout=args.timeout
    ))

    # PWA Manifest
    results.append(check_url(
        name="PWA Manifest (manifest.json)",
        url=f"{args.frontend_url}/manifest.json",
        expected_status=200,
        json_validator=lambda d: "name" in d and "MEP" in d["name"],
        timeout=args.timeout
    ))

    # ─── REPORTE FINAL ───────────────────────────────────────────────────────
    total = len(results)
    passed = sum(1 for r in results if r)
    failed = total - passed

    print("\n" + "=" * 70)
    if failed == 0:
        print(f"{GREEN}{BOLD}🎉 TODOS LOS SMOKE TESTS SUPERADOS CON ÉXITO ({passed}/{total}){RESET}")
        print("🚀 La plataforma MEP — Manga Editor Pro está 100% operativa y lista.")
        print("=" * 70 + "\n")
        sys.exit(0)
    else:
        print(f"{RED}{BOLD}⚠️ ALERTA: {failed} de {total} pruebas fallaron.{RESET}")
        print(f"{YELLOW}Revisa que los servicios de Backend y Frontend estén iniciados.{RESET}")
        print("=" * 70 + "\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
