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

    @patch("routers.projects.analizar_conjunto_imagenes")
    @patch("routers.projects.generar_system_prompt_maestro")
    def test_06_firma_visual_pipeline(self, mock_system_prompt, mock_analizar, client, auth_context):
        """Prueba end-to-end de Firma Visual: subida, análisis mockeado, edición, bloqueo y reglas de seguridad."""
        headers = auth_context["headers"]

        # Mock respuestas del motor de visión y prompt maestro
        async def mock_analisis_resp(rutas):
            return {
                "paleta_colores": ["#1A1A1A", "#3B82F6", "#E2E8F0", "#FFFFFF"],
                "tecnica_linea": "Trazo G-Pen entintado tradicional con grosor dinámico",
                "estilo_sombreado": "Tramado screentone punteado y cross-hatching cruzado",
                "proporciones_personaje": "Proporciones estilizadas shonen",
                "atmosfera": "Atmósfera de alta tensión y acción",
                "elementos_caracteristicos": ["líneas cinéticas", "destellos"],
                "nivel_detalle": "alto",
                "predominancia": "blanco_negro",
                "num_imagenes_analizadas": len(rutas)
            }

        async def mock_prompt_resp(perfil, nombre):
            return "manga artstyle, bold dynamic G-pen lines, screentone shading, high contrast, professional artwork"

        mock_analizar.side_effect = mock_analisis_resp
        mock_system_prompt.side_effect = mock_prompt_resp

        # 1. Crear proyecto propio
        res_proj = client.post("/projects", json={
            "nombre": "Proyecto Propio Test",
            "modo_creacion": "propio",
            "formato_lectura": "manga"
        }, headers=headers)
        assert res_proj.status_code == 201
        proj_id = res_proj.json()["id"]

        # 2. Subir imágenes de referencia mock
        archivos = [
            ("imagenes", ("ref1.png", b"fake_png_data_1", "image/png")),
            ("imagenes", ("ref2.jpg", b"fake_jpg_data_2", "image/jpeg")),
        ]
        res_upload = client.post(f"/projects/{proj_id}/firma-visual/upload", files=archivos, headers=headers)
        assert res_upload.status_code == 200, res_upload.text
        assert res_upload.json()["imagenes_subidas"] == 2
        assert len(res_upload.json()["imagenes_referencia"]) == 2

        # 3. Analizar firma visual
        res_analisis = client.post(f"/projects/{proj_id}/firma-visual/analizar", headers=headers)
        assert res_analisis.status_code == 200, res_analisis.text
        analisis_data = res_analisis.json()
        assert analisis_data["exito"] is True
        assert "diagnostico" in analisis_data
        assert analisis_data["diagnostico"]["tipo_trazo"] == "Trazo G-Pen entintado tradicional con grosor dinámico"
        assert analisis_data["diagnostico"]["tratamiento_sombras"] == "Tramado screentone punteado y cross-hatching cruzado"

        # 4. Actualizar manualmente y bloquear firma (style_locked = True)
        res_patch = client.patch(f"/projects/{proj_id}/firma-visual", json={
            "tipo_trazo": "Trazo G-Pen personalizado",
            "tratamiento_sombras": "Sombreado screentone fino",
            "style_prompt": "custom master prompt in english",
            "style_locked": True
        }, headers=headers)
        assert res_patch.status_code == 200, res_patch.text
        assert res_patch.json()["style_locked"] is True

        # 5. Consultar estado (/firma-visual)
        res_get = client.get(f"/projects/{proj_id}/firma-visual", headers=headers)
        assert res_get.status_code == 200
        firma_info = res_get.json()
        assert firma_info["style_locked"] is True
        assert firma_info["style_prompt"] == "custom master prompt in english"
        assert firma_info["tecnica_linea"] == "Trazo G-Pen personalizado"

        # 6. Validar Regla 3: intentar borrar referencias en proyecto bloqueado debe dar 400
        res_del_locked = client.delete(f"/projects/{proj_id}/firma-visual/referencias", headers=headers)
        assert res_del_locked.status_code == 400

        # 7. Validar Regla 3: intentar subir referencias en proyecto bloqueado debe dar 400
        res_upload_locked = client.post(f"/projects/{proj_id}/firma-visual/upload", files=[
            ("imagenes", ("ref3.png", b"fake_png_data_3", "image/png"))
        ], headers=headers)
        assert res_upload_locked.status_code == 400

        # 8. Validar modo aleatorio y sorteo
        res_aleat = client.post("/projects", json={
            "nombre": "Aleatorio Test",
            "modo_creacion": "aleatorio",
            "formato_lectura": "manga"
        }, headers=headers)
        aleat_id = res_aleat.json()["id"]

        # Sortear estilo
        res_sorteo = client.post(f"/projects/{aleat_id}/firma-visual/sortear-aleatorio", headers=headers)
        assert res_sorteo.status_code == 200
        sorteo_data = res_sorteo.json()
        assert sorteo_data["exito"] is True
        assert "preset_info" in sorteo_data
        assert "style_prompt" in sorteo_data

    @patch("services.ai_router.generar_imagen_panel")
    def test_07_generar_portada_oficial(self, mock_gen_img, client, auth_context):
        """Prueba la generación mockeada de la portada oficial del cómic y adopción."""
        headers = auth_context["headers"]

        # Simular respuesta en base64 de generación de imagen
        mock_gen_img.return_value = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

        # 1. Crear proyecto
        res_proj = client.post("/projects", json={
            "nombre": "Portada Project Test",
            "modo_creacion": "legendario",
            "estilo_legendario": "shonen_legendario",
            "formato_lectura": "manga"
        }, headers=headers)
        proj_id = res_proj.json()["id"]

        # 2. Generar portada oficial
        res_gen = client.post(f"/projects/{proj_id}/generar-portada", json={
            "prompt": "Masterpiece cover art of a young hero with dark spiky hair standing against a crimson sky",
            "aspect_ratio": "3:4"
        }, headers=headers)
        assert res_gen.status_code == 200, res_gen.text
        gen_data = res_gen.json()
        assert gen_data["exito"] is True
        assert "portada_url" in gen_data
        assert gen_data["aspect_ratio"] == "3:4"
        nueva_portada = gen_data["portada_url"]

        # 3. Adoptar como portada del proyecto (PATCH /projects/{id})
        res_adopt = client.patch(f"/projects/{proj_id}", json={
            "portada_url": nueva_portada
        }, headers=headers)
        assert res_adopt.status_code == 200
        assert res_adopt.json()["portada_url"] == nueva_portada

    @patch("services.ai_router.generar_imagen_panel")
    def test_08_personajes_crud_y_avatar_flux(self, mock_gen_img, client, auth_context):
        """Prueba CRUD de personajes, importación del guion y generación de avatares con Firma Visual (FLUX.1 Dev)."""
        headers = auth_context["headers"]

        # Mock de generación de imagen para avatar
        mock_gen_img.return_value = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

        # 1. Crear proyecto legendario
        res_proj = client.post("/projects", json={
            "nombre": "Proyecto Personajes E2E",
            "modo_creacion": "legendario",
            "estilo_legendario": "shonen_legendario",
            "formato_lectura": "manga"
        }, headers=headers)
        assert res_proj.status_code == 201
        proj_id = res_proj.json()["id"]

        # 2. Crear personaje con nuevo rol 'coprotagonista' vía /projects/{id}/personajes
        char_data = {
            "nombre": "Ren Amamiya",
            "rol": "coprotagonista",
            "descripcion_fisica": "Joven de cabello rizado negro y gafas de montura fina",
            "ropa_tipica": "Uniforme escolar shujin y gabardina oscura",
            "personalidad": "Tranquilo, carismático y rebelde",
            "arco_narrativo": "Despertar al Joker interior",
            "motivacion": "Hacer justicia en la sociedad",
            "generar_ficha_ia": False
        }
        res_crear = client.post(f"/projects/{proj_id}/personajes", json=char_data, headers=headers)
        assert res_crear.status_code == 201, res_crear.text
        char_obj = res_crear.json()
        assert char_obj["nombre"] == "Ren Amamiya"
        assert char_obj["rol"] == "coprotagonista"
        assert char_obj["ropa_tipica"] == "Uniforme escolar shujin y gabardina oscura"
        char_id = char_obj["id"]

        # 3. Generar avatar oficial con Firma Visual (FLUX.1 Dev)
        res_avatar = client.post(f"/projects/{proj_id}/personajes/{char_id}/generar-avatar", json={
            "prompt_personalizado": "Close-up portrait of Ren with serious expression, looking at camera",
            "aspect_ratio": "1:1"
        }, headers=headers)
        assert res_avatar.status_code == 200, res_avatar.text
        avatar_resp = res_avatar.json()
        assert avatar_resp["exito"] is True
        assert "avatar_url" in avatar_resp
        assert avatar_resp["avatar_url"].startswith("/uploads/personajes/")

        # Verificar que el personaje tiene ahora su avatar_url persistido
        res_get_char = client.get(f"/characters/{proj_id}", headers=headers)
        assert res_get_char.status_code == 200
        chars_list = res_get_char.json()
        assert len(chars_list) == 1
        assert chars_list[0]["avatar_url"] == avatar_resp["avatar_url"]

        # 4. Actualizar personaje con PUT /projects/{id}/personajes/{char_id}
        res_update = client.put(f"/projects/{proj_id}/personajes/{char_id}", json={
            "rol": "rival",
            "personalidad": "Ambicioso y calculador"
        }, headers=headers)
        assert res_update.status_code == 200
        assert res_update.json()["rol"] == "rival"
        assert res_update.json()["personalidad"] == "Ambicioso y calculador"

        # 5. Importar personajes sugeridos del guion
        res_import = client.post(f"/projects/{proj_id}/personajes/importar-del-guion", json={
            "personajes_sugeridos": [
                {
                    "nombre": "Morgana",
                    "rol": "mentor",
                    "descripcion_fisica": "Criatura felina antropomórfica con pañuelo amarillo",
                    "ropa_tipica": "Cinturón de herramientas",
                    "personalidad": "Orgulloso y servicial"
                },
                {
                    "nombre": "Ryuji Sakamoto",
                    "rol": "apoyo",
                    "descripcion_fisica": "Chico atlético de cabello rubio teñido",
                    "ropa_tipica": "Camiseta con calavera y pantalones cortos",
                    "personalidad": "Impulsivo pero leal"
                }
            ]
        }, headers=headers)
        assert res_import.status_code == 200, res_import.text
        import_data = res_import.json()
        assert import_data["exito"] is True
        assert import_data["importados"] == 2

        # 6. Listar personajes tras importación (debe haber 3 en total)
        res_list_all = client.get(f"/projects/{proj_id}/personajes", headers=headers)
        assert res_list_all.status_code == 200
        assert len(res_list_all.json()) == 3

        # 7. Eliminar un personaje (DELETE /projects/{id}/personajes/{char_id})
        res_del = client.delete(f"/projects/{proj_id}/personajes/{char_id}", headers=headers)
        assert res_del.status_code == 200
        assert res_del.json()["exito"] is True

        # Verificar lista final
        res_final = client.get(f"/projects/{proj_id}/personajes", headers=headers)
        assert res_final.status_code == 200
        assert len(res_final.json()) == 2

    @patch("services.ai_router.optimizar_descripcion_escena_con_llm", side_effect=lambda x, **kwargs: x)
    @patch("services.ai_router.generar_imagen_panel")
    def test_09_vinetas_generacion_y_persistencia(self, mock_gen_img, mock_opt_llm, client, auth_context):
        """Prueba la generación de viñetas con anclajes de personajes anti-alucinación y get_or_create relacional."""
        headers = auth_context["headers"]

        # Mock de imagen para viñeta
        mock_gen_img.return_value = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

        # 1. Crear proyecto
        res_proj = client.post("/projects", json={
            "nombre": "Proyecto Viñetas Test",
            "modo_creacion": "legendario",
            "estilo_legendario": "shonen_legendario",
            "formato_lectura": "manga"
        }, headers=headers)
        assert res_proj.status_code == 201
        proj_id = res_proj.json()["id"]

        # 2. Crear personaje para anclaje
        res_char = client.post(f"/projects/{proj_id}/personajes", json={
            "nombre": "Kaelen",
            "rol": "protagonista",
            "descripcion_fisica": "Joven espadachín de ojos ámbar y cabello oscuro",
            "ropa_tipica": "Túnica de combate negra con hombreras de cuero",
            "personalidad": "Decidido y feroz"
        }, headers=headers)
        assert res_char.status_code == 201
        char_id = res_char.json()["id"]

        # 3. Generar imagen de viñeta para Cap 1, Pág 1, Viñeta 1 (get_or_create relacional al vuelo)
        payload_vineta = {
            "capitulo_num": 1,
            "pagina_num": 1,
            "vineta_num": 1,
            "prompt": "Kaelen desenvaina su espada en llamas frente al templo",
            "plano": "Primer plano",
            "dialogo": "¡No permitiré que crucen este umbral!",
            "personajes_ids": [char_id],
            "aspect_ratio": "16:9"
        }
        res_vin = client.post(f"/projects/{proj_id}/vinetas/generar-imagen", json=payload_vineta, headers=headers)
        assert res_vin.status_code == 200, res_vin.text
        vin_data = res_vin.json()
        assert vin_data["exito"] is True
        assert vin_data["imagen_url"].startswith("/uploads/vinetas/")
        assert "Kaelen: Joven espadachín" in vin_data["prompt_usado"]
        assert vin_data["aspect_ratio"] == "16:9"
        assert vin_data["capitulo_num"] == 1
        assert vin_data["pagina_num"] == 1
        assert vin_data["vineta_num"] == 1

        # 4. Guardar / sincronizar manualmente otra viñeta
        res_save = client.patch(f"/projects/{proj_id}/vinetas/guardar", json={
            "capitulo_num": 1,
            "pagina_num": 1,
            "vineta_num": 2,
            "imagen_url": "/uploads/vinetas/mock_v2.png",
            "prompt": "Vista general del templo en ruinas",
            "plano": "Plano general",
            "dialogo": "El viento susurra una advertencia..."
        }, headers=headers)
        assert res_save.status_code == 200, res_save.text
        assert res_save.json()["exito"] is True

        # 5. Listar viñetas del proyecto
        res_list = client.get(f"/projects/{proj_id}/vinetas", headers=headers)
        assert res_list.status_code == 200, res_list.text
        vinetas_list = res_list.json()
        assert len(vinetas_list) == 2
        assert vinetas_list[0]["plano"] == "Primer plano"
        assert vinetas_list[1]["plano"] == "Plano general"

    @patch("services.ai_router.generar_texto_guion")
    def test_10_personajes_generar_idea_e_importar_llm(self, mock_gen_txt, client, auth_context):
        """Prueba la generación de ideas de personajes con IA y extracción LLM desde el guion."""
        headers = auth_context["headers"]

        # Mock de idea de personaje
        mock_gen_txt.return_value = {
            "nombre": "Aoi Tachibana",
            "rol": "rival",
            "descripcion_fisica": "Chica de cabello índigo corto y mirada penetrante",
            "vestimenta": "Traje de entrenamiento oscuro con protectores de muñeca",
            "personalidad": "Competitiva, reservada y leal",
            "arco_narrativo": "Superar su complejo de inferioridad",
            "motivacion": "Alcanzar el rango maestro"
        }

        # 1. Crear proyecto
        res_proj = client.post("/projects", json={
            "nombre": "Proyecto Ideas Test",
            "modo_creacion": "propio",
            "formato_lectura": "manga"
        }, headers=headers)
        proj_id = res_proj.json()["id"]

        # 2. Generar idea de personaje con IA
        res_idea = client.post(f"/projects/{proj_id}/personajes/generar-idea", json={
            "rol_sugerido": "rival"
        }, headers=headers)
        assert res_idea.status_code == 200, res_idea.text
        idea_data = res_idea.json()
        assert idea_data["exito"] is True
        assert idea_data["propuesta"]["nombre"] == "Aoi Tachibana"
        assert idea_data["propuesta"]["rol"] == "rival"

        # 3. Probar importación con extracción LLM
        mock_gen_txt.return_value = [
            {
                "nombre": "Shinjiro",
                "rol": "mentor",
                "descripcion_fisica": "Hombre maduro con parche en el ojo",
                "vestimenta": "Haikori verde y sandalias",
                "personalidad": "Sereno",
                "motivacion": "Guiar a los jóvenes"
            }
        ]

        res_import = client.post(f"/projects/{proj_id}/personajes/importar-del-guion", headers=headers)
        assert res_import.status_code == 200, res_import.text
        assert res_import.json()["exito"] is True
        assert res_import.json()["importados"] >= 1




