import json
import re
from ddgs import DDGS
import requests
from bs4 import BeautifulSoup
import ollama
import os
import pandas as pd
import concurrent.futures
import textwrap

# -------------------------------------------------------------------
# Funciones auxiliares: búsqueda y scraping
# -------------------------------------------------------------------

def buscar_en_web(meteorito, num_resultados=3):
    """Busca información relevante en la web sobre un meteorito, 
    excluyendo resultados del dominio 'lpi.usra.edu'."""
    tema = f"{meteorito.get('name', '')} meteorite {meteorito.get('year', '')}".strip()
    print(f"\n🔍 Buscando información sobre: {tema}\n")

    resultados = []
    texto_combinado = ""

    try:
        with DDGS() as ddgs:
            for r in ddgs.text(tema, max_results=num_resultados):
                url = r.get("href")
                titulo = r.get("title")
                descripcion = r.get("body")

                if not url:
                    continue

                # 🔎 Excluir resultados del dominio lpi.usra.edu
                if "lpi.usra.edu" in url:
                    print(f"⏭️ Ignorado (LPI): {url}")
                    continue

                try:
                    response = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
                    soup = BeautifulSoup(response.text, "html.parser")

                    # Eliminar etiquetas innecesarias
                    for tag in soup(["script", "style", "noscript"]):
                        tag.decompose()

                    contenido = " ".join(p.get_text() for p in soup.find_all("p"))
                    contenido = contenido.strip()[:5000]  # Limitar tamaño

                except Exception as e:
                    print(f"⚠️ No se pudo extraer texto de {url}: {e}")
                    contenido = ""

                if contenido:  # Evitar añadir vacíos
                    resultados.append({
                        "titulo": titulo,
                        "url": url,
                        "descripcion": descripcion,
                        "contenido": contenido
                    })
                    texto_combinado += f"{titulo or ''}\n{descripcion or ''}\n{contenido}\n"

    except Exception as e:
        print(f"⚠️ Error durante la búsqueda: {e}")

    return {
        "resultados": resultados,
        "texto": texto_combinado.strip()
    }

def buscar_en_web_especial(meteorito, num_resultados=10):
    """
    Busca información más completa en la web sobre un meteorito.
    Se amplía el número de resultados y el texto extraído de cada página.
    Excluye dominios no útiles como 'lpi.usra.edu'.
    """
    tema = f"{meteorito.get('name', '')} meteorite {meteorito.get('year', '')}".strip()
    print(f"\n🔍 Buscando información extendida sobre: {tema}\n")

    resultados = []
    texto_combinado = ""

    try:
        with DDGS() as ddgs:
            for r in ddgs.text(tema, max_results=num_resultados):
                url = r.get("href")
                titulo = r.get("title")
                descripcion = r.get("body")

                if not url:
                    continue
                if "lpi.usra.edu" in url or "wikipedia" in url.lower():
                    print(f"⏭️ Ignorado (fuente excluida): {url}")
                    continue

                try:
                    response = requests.get(url, timeout=12, headers={"User-Agent": "Mozilla/5.0"})
                    soup = BeautifulSoup(response.text, "html.parser")

                    # Limpieza del HTML
                    for tag in soup(["script", "style", "noscript", "footer", "header", "nav", "aside"]):
                        tag.decompose()

                    # Extraer texto principal
                    contenido = " ".join(p.get_text() for p in soup.find_all(["p", "article", "div", "main"]))
                    contenido = re.sub(r"\s+", " ", contenido).strip()

                    if len(contenido) > 10000:  # Limita el texto para evitar excesos
                        contenido = contenido[:10000]

                except Exception as e:
                    print(f"⚠️ No se pudo extraer texto de {url}: {e}")
                    contenido = ""

                if contenido:
                    resultados.append({
                        "titulo": titulo,
                        "url": url,
                        "descripcion": descripcion,
                        "contenido": contenido
                    })
                    texto_combinado += f"\n\n---\nFuente: {url}\n{titulo or ''}\n{descripcion or ''}\n{contenido}\n"

    except Exception as e:
        print(f"⚠️ Error durante la búsqueda: {e}")

    return {
        "resultados": resultados,
        "texto": texto_combinado.strip()
    }



def extraer_contenido(url):
    """Extrae el texto principal de una página web."""
    try:
        response = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
        soup = BeautifulSoup(response.text, "html.parser")
        for tag in soup(["script", "style", "noscript"]):
            tag.decompose()
        texto = " ".join(p.get_text() for p in soup.find_all("p"))
        return texto[:3000]
    except Exception as e:
        print(f"⚠️ No se pudo extraer contenido de {url}: {e}")
        return ""


# -------------------------------------------------------------------
# Unir meteoritos y eventos (en memoria)
# -------------------------------------------------------------------

def unir_datos(meteoritos, eventos):
    coincidencias = []
    usados = set()  # IDs o índices de eventos NASA ya emparejados

    for m in meteoritos:
        match_encontrado = None
        min_distancia = float("inf")

        for idx, e in enumerate(eventos):
            # Calcular distancia geográfica
            try:
                distancia = ((float(e["lat"]) - float(m["coordinadesLat"])) ** 2 +
                             (float(e["lon"]) - float(m["coordinadesLon"])) ** 2) ** 0.5
            except (ValueError, TypeError):
                continue

            # Coincidencia si está cerca y el año concuerda
            try:
                if distancia < 0.5 and abs(int(e["date"][:4]) - int(m["Year"])) <= 1:
                    if distancia < min_distancia:
                        min_distancia = distancia
                        match_encontrado = e
                        match_idx = idx
            except (ValueError, TypeError):
                continue

        fotos_raw = m.get("fotos", "")
        fotos_limpias = []
        if isinstance(fotos_raw, str) and fotos_raw.strip():
            fotos_list = [f.strip() for f in fotos_raw.split(";") if f.strip()]
            for f in fotos_list:
                partes = [p.strip() for p in f.split("|")]
                fotos_limpias.append({
                    "autor": partes[0] if len(partes) > 0 else "Desconocido",
                    "referencia": partes[1] if len(partes) > 1 else "No especificado",
                    "link": partes[2] if len(partes) > 2 else "Sin enlace"
                })

        # Datos base
        data = {
            "name": m.get("Name", ""),
            "status": m.get("Status", ""),
            "fall": m.get("Fall", ""),
            "year": m.get("Year", ""),
            "place": m.get("Place", ""),
            "type": m.get("Type", ""),
            "mass": m.get("Mass", ""),
            "country": m.get("Country", ""),
            "basic_name": m.get("basic_name", ""),
            "basic_abbrev": m.get("basic_abbrev", ""),
            "basic_fall": m.get("basic_fall", ""),
            "basic_yearFound": m.get("basic_yearFound", ""),
            "basic_country": m.get("basic_country", ""),
            "classification": m.get("classification_recomend", ""),
            "coordinadesExact": m.get("coordinadesExact", ""),
            "coordinadesLat": m.get("coordinadesLat", ""),
            "coordinadesLon": m.get("coordinadesLon", ""),
            "coordinadesRecomend": m.get("coordinadesRecomend", ""),
            "coordinadesLatRecomend": m.get("coordinadesLatRecomend", ""),
            "coordinadesLonRecomend": m.get("coordinadesLonRecomend", ""),
            "dataMB109_Lat": m.get("DataMB109_Lat", ""),
            "dataMB109_Lon": m.get("DataMB109_Lon", ""),
            "dataMB109_Mass": m.get("DataMB109_Mass", ""),
            "dataMB109_Piece": m.get("DataMB109_Piece", ""),
            "dataMB109_Class": m.get("DataMB109_Class", ""),
            "dataMB109_Weathering": m.get("DataMB109_Weathering", ""),
            "dataMB109_Fayalite": m.get("DataMB109_Fayalite", ""),
            "dataMB109_Ferrosilite": m.get("DataMB109_Ferrosilite", ""),
            "dataMB109_Classifier": m.get("DataMB109_Classifier", ""),
            "dataMB109_Main_mass": m.get("DataMB109_Main_mass", ""),
            "dataMB109_Coments": m.get("DataMB109_Coments", ""),
            "impact_date": "",
            "impact_lat": "",
            "impact_lon": "",
            "impact_alt": "",
            "impact_vel": "",
            "impact_energy": "",
            "impact_e": "",
            "metBull_fotos": fotos_limpias,
        }

        # Si hay coincidencia NASA → se completan campos
        if match_encontrado:
            data.update({
                "impact_date": match_encontrado.get("date", ""),
                "impact_lat": match_encontrado.get("lat", ""),
                "impact_lon": match_encontrado.get("lon", ""),
                "impact_alt": match_encontrado.get("alt", ""),
                "impact_vel": match_encontrado.get("vel", ""),
                "impact_energy": match_encontrado.get("energy", ""),
                "impact_e": match_encontrado.get("impact_e", ""),
            })
            usados.add(match_idx)

        coincidencias.append(data)

    # 🔹 Agregar impactos NASA sin coincidencias
    sin_match = [e for i, e in enumerate(eventos) if i not in usados]
    for i, e in enumerate(sin_match, start=1):
        coincidencias.append({
            "name": f"Impacto {i}",
            "status": "Desconocido",
            "fall": "",
            "year": e.get("date", "")[:4] if e.get("date") else "",
            "place": "No identificado",
            "type": "",
            "mass": "",
            "country": "",
            "basic_name": "",
            "basic_abbrev": "",
            "basic_fall": "",
            "basic_yearFound": "",
            "basic_country": "",
            "classification": "No hay información",
            "coordinadesExact": "",
            "coordinadesLat": e.get("lat", ""),
            "coordinadesLon": e.get("lon", ""),
            "coordinadesRecomend": "",
            "coordinadesLatRecomend": "",
            "coordinadesLonRecomend": "",
            "dataMB109_Lat": "",
            "dataMB109_Lon": "",
            "dataMB109_Mass": "",
            "dataMB109_Piece": "",
            "dataMB109_Class": "",
            "dataMB109_Weathering": "",
            "dataMB109_Fayalite": "",
            "dataMB109_Ferrosilite": "",
            "dataMB109_Classifier": "",
            "dataMB109_Main_mass": "",
            "dataMB109_Coments": "Solo se tiene registro del impacto, sin meteorito asociado.",
            "impact_date": e.get("date", ""),
            "impact_lat": e.get("lat", ""),
            "impact_lon": e.get("lon", ""),
            "impact_alt": e.get("alt", ""),
            "impact_vel": e.get("vel", ""),
            "impact_energy": e.get("energy", ""),
            "impact_e": e.get("impact_e", ""),
            "metBull_fotos": [],
        })

    total = len(coincidencias)
    con_match = sum(1 for c in coincidencias if c["impact_date"])
    print(f"✅ {total} registros procesados — {con_match} con datos NASA (incluidos impactos sin meteorito)")

    return coincidencias


# -------------------------------------------------------------------
# Enriquecer datos con IA local
# -------------------------------------------------------------------

def parse_info_ia(texto):
    """Convierte la respuesta de la IA en un diccionario limpio sin campos vacíos ni valores 'No hay información'."""
    campos_validos = [
        "nombre", "historia", "importancia", "descubrimiento", "impacto",
        "velocidad (km/s)", "energía (kilotones)", "links", "fotos", "videos"
    ]

    datos = {}
    for linea in texto.splitlines():
        linea = linea.strip()
        if not linea or ":" not in linea:
            continue

        clave, valor = linea.split(":", 1)
        clave = clave.strip().lower()
        valor = valor.strip()

        # 🧹 Evita incluir texto vacío o sin información
        if clave in campos_validos and valor and valor.lower() not in ["no hay información", "no hay datos", "sin datos", "n/a"]:
            clave_final = f"ia_{clave.replace(' (km/s)', '').replace(' (kilotones)', '').replace(' ', '_')}"
            datos[clave_final] = valor
        elif clave in campos_validos:
            # Si existe el campo pero no hay valor útil → lo deja vacío
            clave_final = f"ia_{clave.replace(' (km/s)', '').replace(' (kilotones)', '').replace(' ', '_')}"
            datos[clave_final] = ""

    return datos

def obtener_datos_con_ia(meteorito, texto_web=""):
    """
    Genera información extendida de un meteorito usando Ollama (modelo llama3).
    Si un campo está vacío, devuelve 'No hay información'.
    Asegura unidades estándar y respuestas en español.
    Si el meteorito ya tiene datos (por ejemplo fotos, videos), se conservan y se agregan nuevos.
    """

    if isinstance(meteorito, dict):
        name = meteorito.get("Name", "")
        year = meteorito.get("Year", "")
        lat = meteorito.get("coordinadesLat") or meteorito.get("DataMB109_Lat") or ""
        lon = meteorito.get("coordinadesLon") or meteorito.get("DataMB109_Lon") or ""
        mass = meteorito.get("Mass", "")
        country = meteorito.get("Country", "")
    else:
        name = str(meteorito)
        year = lat = lon = mass = country = ""

    prompt = f"""
Actúa como un investigador experto en meteoritos que habla en español.
Tienes los siguientes datos base y, si existe, información web.
Debes generar información fácil de entender y clara sobre el meteorito en español aunque puedes extenderte mas para darle mas sentido al parrafo o información.
En links pon todo lo que se uso que se considere referencia.

Usa unidades estándar:
- Velocidad en km/s
- Energía en kilotones

Reglas:
- Si un dato no está disponible, escribe exactamente: "No hay información". Evitar explicar si no esta el dato o comcluciones
- No inventes información sin contexto.
- Usa los datos base si están presentes (por ejemplo, si ya se da una masa, respétala).
- Devuelve cada campo en una línea como se indica, sin comas ni comillas.


Formato de respuesta (línea por línea):

nombre:
historia:
importancia:
descubrimiento:
impacto:
velocidad (km/s):
energía (kilotones):
links:
fotos:
videos:

Texto de referencia:
{texto_web}

Datos base:
nombre: {name}
año: {year}
masa: {mass}
país: {country}
latitud: {lat}
longitud: {lon}
"""

    try:
        respuesta = ollama.chat(model="llama3", messages=[
            {"role": "user", "content": prompt}
        ])
        texto = respuesta["message"]["content"].strip()

        # Campos esperados
        campos = [
            "nombre", "historia", "importancia", "descubrimiento", "impacto",
            "velocidad (km/s)", "energía (kilotones)", "links", "fotos", "videos"
        ]

        resultado = {campo: "No hay información" for campo in campos}
        for linea in texto.splitlines():
            if ":" in linea:
                k, v = linea.split(":", 1)
                k = k.strip().lower()
                v = v.strip() or "No hay información"
                for campo in campos:
                    if campo.lower().startswith(k):
                        resultado[campo] = v
                        break

        # Mezclar resultados con datos existentes
        for campo, valor in resultado.items():
            clave_ia = f"ia_{campo.replace(' (km/s)', '').replace(' (kilotones)', '').replace(' ', '_')}"
            anterior = meteorito.get(clave_ia, "")

            # Si ya había algo y es distinto de "No hay información", conservarlo y agregar nuevo contenido
            if anterior and anterior != "No hay información":
                if valor and valor != "No hay información" and valor not in anterior:
                    meteorito[clave_ia] = f"{anterior}\n{valor}"
            else:
                meteorito[clave_ia] = valor

        return meteorito

    except Exception as e:
        print("⚠️ Error con IA:", e)
        return meteorito



def parse_info_ia_especial(texto):
    """
    Convierte la respuesta de la IA en un diccionario limpio con todos los campos esperados.
    Evita incluir datos vacíos o genéricos.
    """
    campos_validos = [
        "nombre", "historia", "importancia", "descubrimiento", "impacto",
        "velocidad (km/s)", "energía (kilotones)", "links", "fotos", "videos"
    ]

    datos = {}
    for campo in campos_validos:
        clave_final = f"ia_{campo.replace(' (km/s)', '').replace(' (kilotones)', '').replace(' ', '_')}"
        datos[clave_final] = ""  # inicializa todos los campos

    for linea in texto.splitlines():
        linea = linea.strip()
        if not linea or ":" not in linea:
            continue

        clave, valor = linea.split(":", 1)
        clave = clave.strip().lower()
        valor = valor.strip()

        if valor and valor.lower() not in ["no hay información", "no hay datos", "sin datos", "n/a"]:
            for campo in campos_validos:
                if campo.startswith(clave):
                    clave_final = f"ia_{campo.replace(' (km/s)', '').replace(' (kilotones)', '').replace(' ', '_')}"
                    datos[clave_final] = valor
                    break
    return datos


def obtener_datos_con_ia_especial(meteorito, texto_web=""):
    """
    Usa el modelo IA para generar información contextual extendida sobre el meteorito.
    Incluye datos de historia, origen, impacto, descubrimiento, noticias, etc.
    Devuelve todos los campos ia_* incluso si están vacíos.
    """

    name = meteorito.get("Name", meteorito.get("name", ""))
    year = meteorito.get("Year", meteorito.get("year", ""))
    lat = meteorito.get("coordinadesLat") or meteorito.get("DataMB109_Lat") or ""
    lon = meteorito.get("coordinadesLon") or meteorito.get("DataMB109_Lon") or ""
    mass = meteorito.get("Mass", meteorito.get("dataMB109_Mass", ""))
    country = meteorito.get("Country", meteorito.get("basic_country", ""))
    tipo = meteorito.get("Type", meteorito.get("dataMB109_Class", ""))
    clasificacion = meteorito.get("classification_recomend", "")
    weathering = meteorito.get("dataMB109_Weathering", "")
    fayalite = meteorito.get("dataMB109_Fayalite", "")
    ferrosilite = meteorito.get("dataMB109_Ferrosilite", "")
    alt = meteorito.get("impact_alt", "")
    vel = meteorito.get("impact_vel", "")
    energia = meteorito.get("impact_energy", "")
    place = meteorito.get("Place", "")

    prompt = f"""
Eres un investigador experto en meteoritos, escribe en español y con tono científico-divulgativo.
Tu tarea es generar información completa y coherente sobre el meteorito con base en los datos y textos disponibles.

Enfócate especialmente en:
- Historia y contexto del descubrimiento
- Impacto o consecuencias conocidas (geológicas, mediáticas o científicas)
- Origen o tipo de meteorito
- Importancia y relevancia en la investigación
- Noticias o referencias verificables (usa los enlaces o fuentes que aparezcan)

📋 Debes incluir **TODOS** los campos del formato, incluso si no hay datos (usa exactamente "No hay información").
No inventes información no sustentada.

Formato obligatorio de salida:
nombre:
historia:
importancia:
descubrimiento:
impacto:
velocidad (km/s):
energía (kilotones):
links:
fotos:
videos:

📄 Texto de referencia:
{texto_web[:15000]}

📊 Datos base:
nombre: {name}
año: {year}
país: {country}
lugar: {place}
tipo: {tipo}
clasificación: {clasificacion}
masa: {mass}
latitud: {lat}
longitud: {lon}
altitud: {alt}
velocidad (si disponible): {vel}
energía estimada: {energia}
grado de meteorización: {weathering}
fayalita: {fayalite}
ferrosilita: {ferrosilite}
"""

    try:
        respuesta = ollama.chat(model="llama3", messages=[
            {"role": "user", "content": prompt}
        ])
        texto = respuesta["message"]["content"].strip()
        nuevos_datos = parse_info_ia_especial(texto)

        # Fusionar datos nuevos con los existentes sin perder nada
        for k, v in nuevos_datos.items():
            if not meteorito.get(k) or meteorito[k] in ["", "No hay información"]:
                meteorito[k] = v
            elif v and v not in meteorito[k]:
                meteorito[k] += f"\n{v}"

        return meteorito

    except Exception as e:
        print(f"⚠️ Error con IA especial: {e}")
        return meteorito

# -------------------------------------------------------------------
# Guardar a JSON 
# -------------------------------------------------------------------
def guardar_total(resultados, nombre="meteoritos.json"):
    """Guarda todos los resultados en un único archivo JSON, actualizando sin duplicar."""
    ruta = os.path.join(os.path.dirname(__file__), nombre)

    # Si ya existe, cargar y actualizar sin duplicados
    existentes = []
    if os.path.exists(ruta):
        try:
            with open(ruta, "r", encoding="utf-8") as f:
                existentes = json.load(f)
        except json.JSONDecodeError:
            existentes = []

    # Evita duplicar por nombre y año
    existentes_dict = {(e.get("name"), e.get("year")): e for e in existentes}
    for r in resultados:
        existentes_dict[(r.get("name"), r.get("year"))] = r

    # Guardar versión actualizada
    with open(ruta, "w", encoding="utf-8") as f:
        json.dump(list(existentes_dict.values()), f, ensure_ascii=False, indent=2)

    print(f"💾 Archivo actualizado: {len(existentes_dict)} meteoritos guardados.")


def cargar_total(nombre="meteoritos.json"):
    """Carga los datos ya procesados si existen."""
    ruta = os.path.join(os.path.dirname(__file__), nombre)
    if os.path.exists(ruta):
        with open(ruta, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


# -------------------------------------------------------------------
# Procesamiento general
# -------------------------------------------------------------------


def texto_contiene_palabras_clave(texto, nombre_meteorito=None):
    """
    Evalúa si el texto contiene información relevante sobre el meteorito:
    historia, impacto, energía, velocidad, consecuencias o descubrimiento técnico.
    También valida si el nombre del meteorito aparece en el título o cuerpo del texto.
    Retorna True si vale la pena procesarlo con IA.
    """

    if not texto or len(texto.strip()) < 100:
        return False  # texto demasiado corto → probablemente irrelevante

    texto = texto.lower()
    nombre_meteorito = (nombre_meteorito or "").lower().strip()

    # ⚡️ Frases clave o contextos importantes
    patrones_relevantes = [
        # --- Impacto físico / ambiental / consecuencias ---
        r"(impact(ed|ing)?|cause(d)? (a )?(damage|change|shock|event|fire|explosion|impact)|"
        r"impact (area|zone|site)|impact effect|blast wave|crater formation|"
        r"released energy|energy of impact|impact velocity|entry velocity|angle of impact|"
        r"impact magnitude|airburst|collision energy)",

        # --- Historia / origen / descubrimiento ---
        r"(discovered in|was discovered|originated from|formed in|composition of|parent body|source asteroid|"
        r"was part of|fragmented from|classified as|recovered in|meteorite classification|"
        r"scientists (believe|suggest)|studies (show|indicate)|analysis revealed)",

        # --- Datos científicos ---
        r"(velocity of|speed of entry|temperature reached|pressure impact|shock stage|"
        r"kinetic energy|mass of the meteorite|density|fusion crust|matrix|chondrules|"
        r"chemical composition|structure|grain size|surface features|melting point)",

        # --- Importancia o contexto histórico ---
        r"(news report|witnessed event|documented fall|reported by|observed fall|"
        r"impact caused|caused panic|injured|destroyed|hit the ground|"
        r"economic impact|affected the region|changed the landscape)"
    ]

    # 🚫 Contenido irrelevante (común en tiendas o páginas genéricas)
    patrones_irrelevantes = [
        r"(found in|located in|coordinates|latitude|longitude|"
        r"copyright|newsletter|subscribe|buy|price|store|shop|review|discount|"
        r"collection|museum piece|sold by|available for sale)"
    ]

    # Si hay demasiados términos irrelevantes → descartar
    if sum(bool(re.search(p, texto)) for p in patrones_irrelevantes) >= 2:
        return False

    # Contar coincidencias relevantes (por grupos de contexto)
    coincidencias = sum(bool(re.search(p, texto)) for p in patrones_relevantes)

    # 📍 Validar si el nombre del meteorito aparece (exacto o parcial)
    nombre_presente = False
    if nombre_meteorito:
        # coincidencia exacta o parcial (por ejemplo "Abadla" en "Abadla 002")
        patron_nombre = re.escape(nombre_meteorito.split()[0])
        if re.search(rf"\b{patron_nombre}\b", texto):
            nombre_presente = True

        # si aparece al principio del texto o en mayúsculas repetidas → más peso
        primeros_300 = texto[:300]
        if re.search(rf"\b{patron_nombre}\b", primeros_300):
            coincidencias += 1
            nombre_presente = True

    # 🔍 Regla final de decisión
    # - Requiere al menos 2 coincidencias relevantes
    # - Y el nombre debe estar mencionado de alguna forma
    if coincidencias >= 2 and nombre_presente:
        return True
    else:
        return False


def iniciar_procesamiento(meteoritos, eventos, filtros_personales=None):
    """
    Controla todo el flujo de procesamiento:
    1. Filtra por criterios automáticos y manuales.
    2. Guarda vacíos los que no cumplen.
    3. Procesa con IA los que sí cumplen o los marcados manualmente.
    """

    print("\n🚀 Iniciando procesamiento general...\n")

    # -------------------------------
    # 🔹 Unir los datos base
    # -------------------------------
    coincidencias = unir_datos(meteoritos, eventos)
    print(f"🔍 Total de coincidencias unidas: {len(coincidencias)}")

    # -------------------------------
    # 🔹 Filtro automático (criterios básicos)
    # -------------------------------
    df = pd.DataFrame(coincidencias)
    df["Mass_num"] = df["mass"].apply(
        lambda x: float(x) if str(x).replace(".", "", 1).isdigit() else 0
    )
    df["Year_num"] = df["year"].apply(
        lambda y: int(y) if str(y).isdigit() else 0
    )

    df["Mass_num"] = pd.to_numeric(df.get("mass", 0), errors="coerce").fillna(0)

    # Determinar si tiene fotos
    df["tiene_fotos"] = df["metBull_fotos"].apply(lambda fotos: bool(fotos and len(fotos) > 0))

    # Aplicar criterios:
    # - Masa >= 3000 g
    # - Tiene al menos una foto
    cumple_criterios = df[
        (df["Mass_num"] >= 4000) | (df["tiene_fotos"])
    ].to_dict(orient="records")

    # Los que no cumplen (impactos sin coincidencia o datos limitados)
    no_cumple = df[~df.index.isin(
        [df.index[df["name"] == c["name"]][0] for c in cumple_criterios]
    )].to_dict(orient="records")

    print(f"🧮 Cumplen criterios: {len(cumple_criterios)} | No cumplen: {len(no_cumple)}")

    # -------------------------------
    # 🔹 Filtro personal (lista manual)
    # -------------------------------
    especiales = []
    if filtros_personales:
        palabras = [p.lower() for p in filtros_personales]
        especiales = [c for c in coincidencias if any(p in c["name"].lower() for p in palabras)]
        print(f"🎯 Meteoritos marcados manualmente: {len(especiales)}")
    else:
        print("ℹ️ No se definieron filtros personales.")

    # -------------------------------
    # 🔹 Procesar según el tipo
    # -------------------------------
    #print("\n⚙️ Guardando meteoritos que no cumplen (solo estructura vacía)...")
    #procesar_datos(no_cumple, eventos, tipo="vacios")

    #print("\n⚙️ Procesando meteoritos que cumplen criterios automáticos...")
    #procesar_datos(cumple_criterios, eventos, tipo="criterios")


    print("\n⚙️ Procesando meteoritos con procesamiento especial...")
    procesar_datos(especiales, eventos, tipo="especiales")

    print("\n✅ Proceso general completado.\n")


def procesar_datos(meteoritos, eventos, tipo="criterios", max_workers=8):
    """
    Procesa meteoritos según su tipo:
      - 'criterios': cumplen condiciones, se procesan con IA.
      - 'vacios': no cumplen, solo se guardan con campos vacíos.
      - 'especiales': se procesarán distinto (por ahora igual que criterios, luego lo afinamos).
    """

    procesados = cargar_total()
    nombres_procesados = {(p.get("name"), p.get("year")) for p in procesados}
    campos_ia_base = [
        "ia_nombre", "ia_historia", "ia_importancia", "ia_descubrimiento", "ia_impacto",
        "ia_velocidad", "ia_energia", "ia_links", "ia_fotos", "ia_videos"
    ]

    nuevos_resultados = []

    def procesar_uno(c):
        try:
            if (c.get("name"), c.get("year")) in nombres_procesados:
                return None

            fusionado = c.copy()

            # -------------------------------
            # 🧩 Si es tipo VACÍO → guardar sin búsqueda
            # -------------------------------
            if tipo == "vacios":
                print(f"⏩ Guardado vacío: {c['name']} ({c['year']})")
                for campo in campos_ia_base:
                    fusionado[campo] = ""
                return fusionado

            # -------------------------------
            # 🌍 Si cumple criterios → buscar web y procesar IA
            # -------------------------------
            if tipo == "criterios" or tipo == "especiales":
                print(f"\n🪐 Procesando: {c['name']} ({c['year']})")
                busqueda = buscar_en_web(c)
                texto_web = busqueda["texto"]

                if texto_contiene_palabras_clave(texto_web, c.get("name")):
                    print(f"🤖 Analizando con IA...\n")
                    c_actualizado = obtener_datos_con_ia(c, texto_web)

                    info_ia_campos = parse_info_ia(
                        "\n".join(f"{k}: {v}" for k, v in c_actualizado.items() if k.startswith("ia_"))
                    )

                    fusionado.update(info_ia_campos)
                else:
                    print(f"⏩ Omitido IA (texto no relevante)")
                    for campo in campos_ia_base:
                        fusionado[campo] = ""

                # Asegurar estructura uniforme
                for campo in campos_ia_base:
                    fusionado.setdefault(campo, "")

                return fusionado

        except Exception as e:
            print(f"⚠️ Error al procesar {c.get('name')}: {e}")
            return None

    # -------------------------------
    # 🧵 Ejecución paralela
    # -------------------------------
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        for resultado in executor.map(procesar_uno, meteoritos):
            if resultado:
                nuevos_resultados.append(resultado)
                if len(nuevos_resultados) % 10 == 0:
                    guardar_total(nuevos_resultados)
                    nuevos_resultados = []

    if nuevos_resultados:
        guardar_total(nuevos_resultados)

    print(f"\n✅ Procesamiento tipo '{tipo}' completado.\n")

# -------------------------------------------------------------------
# Uso
# -------------------------------------------------------------------

def leer_csv_a_lista(ruta):
    """Lee un CSV y lo convierte en una lista de diccionarios, evitando warnings por tipos mixtos."""
    if not os.path.exists(ruta):
        print(f"⚠️ No se encontró el archivo: {ruta}")
        return []
    try:
        df = pd.read_csv(ruta, low_memory=False, dtype=str)  # fuerza todo a texto
        return df.fillna("").to_dict(orient="records")
    except Exception as e:
        print(f"⚠️ Error leyendo CSV {ruta}: {e}")
        return []




if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(script_dir, "data")

    # Rutas de los CSV
    meteoritos_path = os.path.join(data_dir, "meteoritos_Metbull.csv")
    eventos_path = os.path.join(data_dir, "meteoritos_NasaCNEOS.csv")

    # Cargar datos desde los CSV
    meteorito = leer_csv_a_lista(meteoritos_path)
    eventos = leer_csv_a_lista(eventos_path)
    filtros_personales = ["Canyon Diablo","Ali","Willamette", "Winchcombe", "Fukang", "Hoba","Gancedo","El Chaco","Ahnighito","Bacubirito","Tunguska","Cheliábinsk","Barringer","Chicxulub","Sikhote-Alin","Allende","Mbozi","Bacubirito","Armanty","Ahnighito"]

    resultados = iniciar_procesamiento(meteorito, eventos, filtros_personales)
