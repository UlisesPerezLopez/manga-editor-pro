# test_e2e_pipeline.py
# Suite de pruebas E2E e integración para MEP — Manga Editor Pro.
# Valida Auth, CRUD de Proyectos, Canvas Fabric.js, Publicación, Monetización, Analítica y Generación con IA.

import pytest
from unittest.mock import patch, MagicMock


@pytest.fixture
def auth_context(client):
    """Crea un usuario para la prueba y devuelve sus credenciales y headers JWT."""
    registro_data = {
        "username": "mangaka_test",
        "email": "test_mangaka@mep.pro",
        "password": "SecurePassword123!",
        "nombre_artistico": "Sensei Mangaka"
    }
    client.post("/auth/register", json=registro_data)

    login_res = client.post("/auth/login", json={
        "email": "test_mangaka@mep.pro",
        "password": "SecurePassword123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    return {"token": token, "headers": headers, "email": "test_mangaka@mep.pro"}


class TestE2EPipeline:
    """Suite integral de pruebas de extremo a extremo (E2E)."""

    def test_01_flujo_autenticacion_y_modo_ia(self, client):
        """Prueba registro, login, perfil y conmutación de modo de IA."""
        # 1. Registro
        registro_data = {
            "username": "mangaka_e2e",
            "email": "mangaka@mep.pro",
            "password": "SecurePassword123!",
            "nombre_artistico": "Sensei Mangaka"
        }
        res_registro = client.post("/auth/register", json=registro_data)
        assert res_registro.status_code == 201, res_registro.text
        assert res_registro.json()["exito"] is True

        # 2. Login para obtener JWT
        login_res = client.post("/auth/login", json={
            "email": "mangaka@mep.pro",
            "password": "SecurePassword123!"
        })
        assert login_res.status_code == 200, login_res.text
        token_data = login_res.json()
        assert "access_token" in token_data
        jwt_token = token_data["access_token"]
        headers = {"Authorization": f"Bearer {jwt_token}"}

        # 3. Obtener perfil actual (/auth/me)
        res_yo = client.get("/auth/me", headers=headers)
        assert res_yo.status_code == 200
        usuario_info = res_yo.json()
        assert usuario_info["username"] == "mangaka_e2e"
        assert usuario_info["ai_mode"] == "cloud_free"

        # 4. Conmutar a modo 'local'
        res_patch_local = client.patch("/auth/ai-mode", json={"ai_mode": "local"}, headers=headers)
        assert res_patch_local.status_code == 200
        assert res_patch_local.json()["ai_mode"] == "local"

        # 5. Conmutar de vuelta a modo 'cloud_free'
        res_patch_cloud = client.patch("/auth/ai-mode", json={"ai_mode": "cloud_free"}, headers=headers)
        assert res_patch_cloud.status_code == 200
        assert res_patch_cloud.json()["ai_mode"] == "cloud_free"

        # 6. Comprobar estado de motores de IA (con y sin autenticación pública)
        res_estado = client.get("/generate/estado-ia", headers=headers)
        assert res_estado.status_code == 200
        assert "subsistemas" in res_estado.json()

        res_estado_public = client.get("/generate/estado-ia")
        assert res_estado_public.status_code == 200
        assert "subsistemas" in res_estado_public.json()

    def test_02_proyecto_y_personajes(self, client, auth_context):
        """Prueba creación y gestión de proyecto y fichas de personajes."""
        headers = auth_context["headers"]

        # 1. Crear nuevo proyecto de manga en modo legendario
        nuevo_proyecto = {
            "nombre": "Crónicas de Ceniza",
            "modo_creacion": "legendario",
            "estilo_legendario": "shonen_legendario",
            "formato_lectura": "manga"
        }
        res_proj = client.post("/projects", json=nuevo_proyecto, headers=headers)
        assert res_proj.status_code == 201
        proj_data = res_proj.json()
        assert proj_data["nombre"] == "Crónicas de Ceniza"
        assert proj_data["formato_lectura"] == "manga"
        proj_id = proj_data["id"]

        # 1b. Probar creación en modo 'aleatorio'
        res_aleatorio = client.post("/projects", json={
            "nombre": "Aventura Aleatoria",
            "modo_creacion": "aleatorio",
            "formato_lectura": "jp_manga"
        }, headers=headers)
        assert res_aleatorio.status_code == 201
        assert res_aleatorio.json()["modo_creacion"] == "aleatorio"
        assert res_aleatorio.json()["formato_lectura"] == "manga"

        # 1c. Probar creación en modo 'propio' con formato occidental
        res_propio = client.post("/projects", json={
            "nombre": "Universo Propio",
            "modo_creacion": "propio",
            "formato_lectura": "occidental"
        }, headers=headers)
        assert res_propio.status_code == 201
        assert res_propio.json()["modo_creacion"] == "propio"
        assert res_propio.json()["formato_lectura"] == "occidental"

        # 2. Crear personaje en el proyecto
        personaje_data = {
            "nombre": "Kaelen",
            "rol": "protagonista",
            "descripcion_fisica": "Joven espadachín de cabello oscuro y capa carmesí",
            "ropa_tipica": "Túnica de combate reforzada con cuero",
            "personalidad": "Determinado y leal",
            "arco_narrativo": "Busca restaurar el honor de su linaje",
            "motivacion": "Proteger su aldea natal",
            "generar_ficha_ia": False
        }
        res_char = client.post(f"/characters/{proj_id}", json=personaje_data, headers=headers)
        assert res_char.status_code == 201
        assert res_char.json()["nombre"] == "Kaelen"

        # 3. Listar personajes del proyecto
        res_list_chars = client.get(f"/characters/{proj_id}", headers=headers)
        assert res_list_chars.status_code == 200
        assert len(res_list_chars.json()) == 1

        # 4. Validar que /projects/resumen-usuario y /projects/estadisticas no den 422
        res_resumen = client.get("/projects/resumen-usuario", headers=headers)
        assert res_resumen.status_code == 200, res_resumen.text
        assert res_resumen.json()["num_proyectos"] >= 1

        res_stats = client.get(f"/projects/estadisticas/{proj_id}", headers=headers)
        assert res_stats.status_code == 200, res_stats.text
        assert res_stats.json()["num_personajes"] == 1

    def test_03_narrativa_canvas_y_persistencia(self, client, auth_context):
        """Prueba creación de capítulos, páginas y guardado de estado JSON de Fabric.js."""
        headers = auth_context["headers"]

        # Crear proyecto
        res_proj = client.post("/projects", json={
            "nombre": "Manga Canvas Test",
            "modo_creacion": "legendario",
            "estilo_legendario": "shonen_legendario",
            "formato_lectura": "manga"
        }, headers=headers)
        proj_id = res_proj.json()["id"]

        # 1. Crear Capítulo 1
        cap_res = client.post(f"/chapters/{proj_id}", json={
            "numero": 1,
            "titulo": "El Despertar del Fuego",
            "sinopsis": "Kaelen descubre un antiguo artefacto en las ruinas."
        }, headers=headers)
        assert cap_res.status_code == 201
        cap_id = cap_res.json()["id"]

        # 2. Crear Página 1 en el Capítulo 1
        pag_res = client.post(f"/chapters/{proj_id}/capitulo/{cap_id}/pagina", json={
            "numero": 1,
            "layout_template": "action_3panel"
        }, headers=headers)
        assert pag_res.status_code == 201
        pag_id = pag_res.json()["id"]

        # 3. Guardar estado completo del canvas de Fabric.js
        fabric_json_state = (
            '{"version":"5.3.0","objects":['
            '{"type":"rect","left":50,"top":50,"width":200,"height":150,"fill":"#FFFFFF","stroke":"#000000","strokeWidth":2,"data":{"tipo":"vineta"}},'
            '{"type":"textbox","left":60,"top":60,"text":"¡No pasarás!","fontSize":16,"fill":"#000000","data":{"tipo":"dialogo"}}'
            ']}'
        )
        guardar_res = client.put(
            f"/chapters/{proj_id}/pagina/{pag_id}/guardar",
            json={"canvas_json": fabric_json_state, "thumbnail_url": "data:image/png;base64,mock"},
            headers=headers
        )
        assert guardar_res.status_code == 200
        assert guardar_res.json()["exito"] is True

        # 4. Recuperar página y verificar que el estado del canvas persiste intacto
        pag_verif = client.get(f"/chapters/{proj_id}/pagina/{pag_id}", headers=headers)
        assert pag_verif.status_code == 200
        assert "¡No pasarás!" in pag_verif.json()["canvas_json"]

    def test_04_publicacion_likes_views_y_analitica(self, client, auth_context):
        """Prueba endpoints de publicación digital, monetización, me gustas, lecturas y analítica."""
        headers = auth_context["headers"]

        # Crear proyecto y capítulo
        res_proj = client.post("/projects", json={
            "nombre": "Manga Analytics Test",
            "modo_creacion": "legendario",
            "estilo_legendario": "shonen_legendario",
            "formato_lectura": "manga"
        }, headers=headers)
        proj_id = res_proj.json()["id"]

        cap_res = client.post(f"/chapters/{proj_id}", json={
            "numero": 1,
            "titulo": "Capítulo Piloto",
            "sinopsis": "Prólogo de la aventura"
        }, headers=headers)
        cap_id = cap_res.json()["id"]

        # 1. Actualizar estado de publicación y monetización (Público + Premium)
        pub_res = client.patch(
            f"/chapters/{proj_id}/capitulo/{cap_id}/publish-status",
            json={"is_published": True, "is_premium": True, "early_access": True},
            headers=headers
        )
        assert pub_res.status_code == 200
        assert pub_res.json()["is_published"] is True
        assert pub_res.json()["is_premium"] is True
        assert pub_res.json()["early_access"] is True

        # 2. Registrar vistas de lectura
        client.post(f"/chapters/{proj_id}/capitulo/{cap_id}/view")
        client.post(f"/chapters/{proj_id}/capitulo/{cap_id}/view")

        # 3. Registrar likes ❤️
        client.post(f"/chapters/{proj_id}/capitulo/{cap_id}/like")

        # 4. Obtener analítica consolidada del proyecto
        analytics_res = client.get(f"/projects/analytics/{proj_id}", headers=headers)
        assert analytics_res.status_code == 200
        analytics_data = analytics_res.json()
        assert analytics_data["total_views"] >= 2
        assert analytics_data["total_likes"] >= 1
        assert "tasa_retencion_promedio" in analytics_data
        assert len(analytics_data["capitulos"]) >= 1

    @patch("services.text_engine.TextEngine.generar_texto")
    def test_05_motores_ia_mockeados(self, mock_generar_texto, client, auth_context):
        """Prueba el despacho de generación textual con mocks seguros."""
        headers = auth_context["headers"]

        async def mock_resp(*args, **kwargs):
            return '{"titulo": "Fuego Ancestral", "sinopsis": "Kaelen despierta su poder", "capitulos": []}'
        
        mock_generar_texto.side_effect = mock_resp

        # Probar endpoint de generación de sinopsis
        res_gen = client.post("/generate/sinopsis", json={
            "titulo": "Fuego Ancestral",
            "genero": "shonen",
            "tono": "épico",
            "premisa": "Un joven descubre una espada legendaria y emprende un viaje para salvar su reino.",
            "num_capitulos": 3
        }, headers=headers)

        assert res_gen.status_code == 200
        assert "datos" in res_gen.json()
