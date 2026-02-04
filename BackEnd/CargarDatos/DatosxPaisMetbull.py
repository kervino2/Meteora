import os
import re
import time
import random

from bs4 import BeautifulSoup
import pandas as pd
import cloudscraper
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests

# Scraper 
scraper = cloudscraper.create_scraper()

# URL 
url_base = "https://www.lpi.usra.edu/meteor/metbull.php"

def parseCoordinates(coordString):
    """
    Convierte coordenadas en formato grados, minutos, segundos (DMS) o decimal
    a un dict {'lat': float, 'lon': float}.
    Ejemplos válidos:
      "34° 39' 0\"N, 61° 10' 48\"E"
      "34 39 0 N 61 10 48 E"
      "34.65, 61.18"
    """
    if not coordString:
        return {"lat": None, "lon": None}

    # Quitar paréntesis y comillas
    coordString = re.sub(r"[()\"\\]", "", coordString).strip()

    # Separar latitud y longitud por coma, si existe
    parts = [p.strip() for p in coordString.split(",")]
    if len(parts) < 2:
        # intentar separar por espacios
        parts = re.split(r"\s+", coordString)
        if len(parts) < 2:
            return {"lat": None, "lon": None}

    def gmsToDecimal(part):
        """
        Convierte un string DMS a decimal
        """
        # Detectar DMS
        match = re.match(
            r"(\d+(?:\.\d+)?)°?\s*(\d+(?:\.\d+)?)?['′]?\s*(\d+(?:\.\d+)?)?['\"″]?\s*([NSEW])?",
            part.strip(),
            re.I
        )
        if not match:
            # si solo es número decimal
            try:
                return float(part)
            except:
                return None

        deg = float(match.group(1))
        min_ = float(match.group(2)) if match.group(2) else 0
        sec = float(match.group(3)) if match.group(3) else 0
        dir_ = match.group(4).upper() if match.group(4) else None

        decimal = deg + min_/60 + sec/3600

        if dir_ in ["S", "W"]:
            decimal = -decimal

        return decimal

    lat = gmsToDecimal(parts[0])
    lon = gmsToDecimal(parts[1])
    return {"lat": lat, "lon": lon}

def fetch_detail(fila, retries=3):
    for intento in range(retries):
        try:
            detalle = extraer_detalles(fila["_href"])
            fila.update(detalle)
            fila.pop("_href", None)
            return fila
        except Exception as e:
            print(f"Error en detalle {fila.get('Name')}: {e}")
            if intento < retries - 1:
                wait = 2 ** intento + random.random()  # backoff exponencial
                print(f"Reintentando en {wait:.1f}s...")
                time.sleep(wait)
            else:
                print("Falló después de varios intentos")
                return fila  # devuelve la fila sin detalle

def parse_year(year_str):
    if not year_str or pd.isna(year_str):
        return None
    # Buscar los primeros dígitos consecutivos
    match = re.match(r"(\d{3,4})", str(year_str))
    if match:
        return int(match.group(1))
    return None


response = scraper.get(url_base)
soup = BeautifulSoup(response.text, "lxml")

select_country = soup.find("select", {"name": "country"})

countries = []
if select_country:
    for option in select_country.find_all("option"):
        if option.get("value"):  # evitar vacíos
            countries.append(option.get("value"))


def limpiar_texto(texto: str) -> str:
    if not texto:
        return ""
    return re.sub(r"\s+", " ", texto.strip())

def normalizar_masa(masa):
    """
    Normaliza la masa a gramos (g).
    Acepta valores en g, kg, mg, t, etc.
    Retorna float en gramos o None si no es válido.
    """
    if masa is None or (isinstance(masa, float) and pd.isna(masa)):
        return None

    # Convertir todo a texto para procesar
    if not isinstance(masa, str):
        masa = str(masa)

    masa = masa.strip().lower().replace(",", ".").replace(" ", "")

    # Detectar la unidad
    if masa.endswith("mg"):
        unidad = "mg"
        masa = masa.replace("mg", "")
        factor = 0.001  # 1 mg = 0.001 g
    elif masa.endswith("kg"):
        unidad = "kg"
        masa = masa.replace("kg", "")
        factor = 1000.0  # 1 kg = 1000 g
    elif masa.endswith("t") or masa.endswith("ton") or masa.endswith("tonne"):
        unidad = "t"
        masa = masa.replace("t", "").replace("ton", "").replace("tonne", "")
        factor = 1_000_000.0  # 1 tonelada = 1,000,000 g
    elif masa.endswith("g"):
        unidad = "g"
        masa = masa.replace("g", "")
        factor = 1.0
    else:
        # Sin unidad conocida, asumir gramos
        unidad = "g"
        factor = 1.0

    try:
        valor = float(masa)
        return round(valor * factor, 3)  # retorna en gramos
    except ValueError:
        return None



class MeteoriteDetail:
    def __init__(self, url=None, html=None):
        if url:
            response = scraper.get(url)
            response.raise_for_status()
            self.soup = BeautifulSoup(response.text, "html.parser")
        elif html:
            self.soup = BeautifulSoup(html, "html.parser")
        else:
            raise ValueError("Debes pasar un url o un html")
        self.data = {}

    def parse(self):
        """Extrae toda la información principal y extendida"""
        self.data["basic_info"] = self._parse_basic_info()
        self.data["classification"] = self._parse_classification()
        self.data["geography"] = self._parse_geography()
        self.data["Data_MB109"] = self._parse_data_from_MB109()
        self.data.update(self._parse_additional_info())   # ← agrega historia, referencias, etc.
        self.data["images"] = self._parse_images()         # ← agrega URLs de fotos
        return self.data

    # --- 🧩 Secciones estándar del metbull ---
    def _extract_fields(self, td, fields):
        result = {}
        for field in fields:
            el = td.find("b", string=lambda t: t and field in t)
            if el:
                text = el.next_sibling.strip() if el.next_sibling else None
                result[field.replace(":", "")] = text
        return result

    def _parse_basic_info(self):
        section = self.soup.find("td", string=lambda t: t and "Basic information" in t)
        if not section:
            return {}
        td = section.find_next("td")
        fields = ["Name:", "Abbreviation:", "Observed fall:", "Year found:", "Year fell:", "Country:", "Mass:"]
        return self._extract_fields(td, fields)

    def _parse_classification(self):
        section = next((td for td in self.soup.find_all("td", class_="inside")
                        if "Classification" in td.get_text()), None)
        if not section:
            return {}
        td = section.find_next("td")
        classification = {}
        recommended = td.find("b", string=lambda t: "Recommended" in t)
        if recommended and recommended.find_next("b"):
            classification["Recommended"] = recommended.find_next("b").get_text(strip=True)
        return classification

    def _parse_geography(self):
        section = next((td for td in self.soup.find_all("td", class_="inside")
                        if "Geography" in td.get_text()), None)
        if not section:
            return {}
        table = section.find_next("table")
        if not table:
            return {}
        geography = {}
        for row in table.find_all("tr"):
            cols = [c.get_text(strip=True) for c in row.find_all("td")]
            if len(cols) == 2:
                key, value = cols
                geography[key.replace(":", "").strip()] = value
        return geography

    def _parse_data_from_MB109(self):
        section = next((td for td in self.soup.find_all("td", class_="inside")
                        if "Data from" in td.get_text()), None)
        if not section:
            return {}
        table = section.find_next("table")
        if not table:
            return {}
        data_from = {}
        for row in table.find_all("tr"):
            cols = [c.get_text(strip=True) for c in row.find_all("td")]
            if len(cols) == 2:
                key, value = cols
                data_from[key.replace(":", "").strip()] = value
        return data_from

    # --- 🧠 NUEVO: secciones adicionales ---
    def _parse_additional_info(self):
        """
        Busca texto de secciones adicionales como Historia, Importancia, Descubrimiento, etc.
        """
        result = {
            "historia": "No hay información",
            "importancia": "No hay información",
            "descubrimiento": "No hay información",
            "impacto": "No hay información",
            "references": "No hay información",
        }

        sections = self.soup.find_all("td", class_="inside")
        for td in sections:
            title = td.get_text(strip=True).lower()

            # Buscar "History" o "Remarks"
            if "history" in title or "remarks" in title:
                next_td = td.find_next("td")
                if next_td:
                    result["historia"] = limpiar_texto(next_td.get_text())
                    continue

            # Buscar referencias
            if "references" in title:
                next_td = td.find_next("td")
                if next_td:
                    result["references"] = limpiar_texto(next_td.get_text())
                    continue

            # Buscar impacto (si hay)
            if "impact" in title:
                next_td = td.find_next("td")
                if next_td:
                    result["impacto"] = limpiar_texto(next_td.get_text())
                    continue

        return result

    # --- 🖼️ NUEVO: parsear imágenes ---
    def _parse_images(self):
        """
        Extrae fotos del MetBull con manejo de bloqueos 403.
        """
        import time

        fotos = []
        base_url_lpi = "https://www.lpi.usra.edu/meteor/"

        photo_table = self.soup.find("table", border="1", cellpadding="2", cellspacing="0")
        if not photo_table:
            return {"fotos": ["No hay información"]}

        # Usamos el mismo cloudscraper global para evadir bloqueo
        session = scraper
        session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/123.0.0.0 Safari/537.36"
            ),
            "Referer": "https://www.lpi.usra.edu/meteor/metbull.php",
            "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Connection": "keep-alive"
        })

        for row in photo_table.find_all("tr"):
            cols = row.find_all("td")
            if len(cols) != 2:
                continue

            autor_td, foto_td = cols

            # Miniatura
            thumb_img = foto_td.find("img")
            thumb_url = thumb_img["src"] if thumb_img else None
            if thumb_url and not thumb_url.startswith("http"):
                thumb_url = base_url_lpi + thumb_url.lstrip("/")

            inter_a = foto_td.find("a", href=lambda x: x and "get_original_photo" in x)
            if not inter_a:
                continue

            inter_href = inter_a["href"]
            if not inter_href.startswith("http"):
                inter_href = base_url_lpi + inter_href.lstrip("/")

            autor = "No hay información"
            referencia = "No hay información"
            direct_link = "No hay información"

            # Intentar con reintentos y cookies de navegación
            for intento in range(3):
                try:
                    resp = session.get(inter_href, timeout=10)
                    if resp.status_code == 403:
                        # Ajustar headers, reintentar más "humano"
                        session.headers.update({
                            "Referer": inter_href,
                            "Upgrade-Insecure-Requests": "1",
                            "DNT": "1",
                            "Accept-Encoding": "gzip, deflate, br",
                        })
                        time.sleep(2 + intento)
                        continue  # reintenta con nuevos headers

                    resp.raise_for_status()
                    sub_soup = BeautifulSoup(resp.text, "html.parser")

                    credit_b = sub_soup.find("b", string=lambda t: t and "Credit" in t)
                    if credit_b:
                        next_a = credit_b.find_next("a")
                        if next_a:
                            autor = next_a.get_text(strip=True)

                    source_b = sub_soup.find("b", string=lambda t: t and "Image source" in t)
                    if source_b:
                        next_a = source_b.find_next("a")
                        if next_a:
                            referencia = next_a.get_text(strip=True)

                    direct_text = sub_soup.find(string=lambda t: "Direct link to photo" in t)
                    if direct_text:
                        a_tag = direct_text.find_next("a")
                        if a_tag and a_tag.get("href"):
                            direct_link = a_tag["href"].strip()
                    break  # si todo fue bien, salimos del ciclo

                except Exception as e:
                    if intento == 2:
                        print(f"⚠️ Error permanente al procesar {inter_href}: {e}")
                    else:
                        wait = 2 + intento
                        print(f"403 en intento {intento+1} para {inter_href}. Reintentando en {wait}s...")
                        time.sleep(wait)

            fotos.append({
                "autor": autor,
                "referencia": referencia,
                "foto_original": direct_link,
            })

            time.sleep(random.uniform(0.5, 1.2))

        if not fotos:
            fotos = ["No hay información"]

        return {"fotos": fotos}

def extraer_detalles(url_relativa: str) -> dict:
    url_detalle = f"https://www.lpi.usra.edu{url_relativa}"
    parser = MeteoriteDetail(url_detalle)
    datos = parser.parse()

    return datos

  
def buscar_meteoritos_por_pais(country: str):
    url = (
        f"https://www.lpi.usra.edu/meteor/metbull.cfm?"
        f"sea=*&ants=&nwas=&falls=&valids=&stype=contains"
        f"&lrec=50000&map=ge&browse=&country={country.replace(' ', '+')}"
        f"&srt=name&categ=All&mblist=All&rect=&phot=no&strewn=no&snew=0"
        f"&pnt=Normal+table&sfor=names&dr=&page=0"
    )

    response = scraper.get(url)
    soup = BeautifulSoup(response.text, "lxml")

    table = soup.find("table", {"border": "1"})
    if table is None:
        return pd.DataFrame()

    headers = [limpiar_texto(th.text) for th in table.find_all("th")]
    rows, links = [], []

    for i, tr in enumerate(table.find_all("tr")[1:], start=1):
        cols = [limpiar_texto(td.text) for td in tr.find_all("td")]
        if cols:
            fila = dict(zip(headers, cols))
            link_tag = tr.find("a", href=True)
            if link_tag:
                fila["_href"] = link_tag["href"]
                links.append(fila)
            rows.append(fila)

        if i % 1000 == 0:
            print(f"[{country}] Procesados {i} meteoritos...")

    # 🔹 Descargar detalles en paralelo
    def fetch_detail(fila):
        detalle = extraer_detalles(fila["_href"])
        fila.update(detalle)
        fila.pop("_href", None)
        return fila

    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = [executor.submit(fetch_detail, fila) for fila in links]
        for i, future in enumerate(as_completed(futures), start=1):
            try:
                result = future.result()
                if i % 100 == 0:
                    print(f"Detalles descargados: {i}/{len(futures)}")
            except Exception as e:
                print("Error en detalle:", e)


    df = pd.DataFrame(rows)

    if "Mass" in df.columns:
        df["Mass_grams"] = df["Mass"].apply(normalizar_masa)

    df["Country"] = country
    return df

import ast

def crear_csv_limpio_separado():
    def parse_coords_safe(text):
        if not text or not isinstance(text, str):
            return None, None
        coords = parseCoordinates(text)
        return coords["lat"], coords["lon"]

    clean_rows = []

    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_path = os.path.join(script_dir, "data", "meteoritos_Metbull_PreLimpieza.csv")

    if not os.path.exists(input_path):
        print("⚠️ No se encontró el archivo meteoritos_Metbull_PreLimpieza.csv")
        return

    # Leer CSV
    df = pd.read_csv(input_path, low_memory=False)

    # Convertir los campos que parecen diccionarios
    def safe_eval(value):
        try:
            if isinstance(value, str) and value.startswith("{"):
                return ast.literal_eval(value)
        except Exception:
            pass
        return value

    dict_columns = ["basic_info", "classification", "geography", "Data_MB109", "images"]
    for col in dict_columns:
        if col in df.columns:
            df[col] = df[col].apply(safe_eval)

    for _, row in df.iterrows():
        # Limpiar nombre
        name = str(row.get("Name", "")).replace("**", "").strip()

        def safe_dict(value):
            return value if isinstance(value, dict) else {}

        basic_info = safe_dict(row.get("basic_info", {}))
        classification = safe_dict(row.get("classification", {}))
        geography = safe_dict(row.get("geography", {}))
        Data_MB109 = safe_dict(row.get("Data_MB109", {}))

        # --- Años ---
        year_fell = parse_year(basic_info.get("Year fell")) if isinstance(basic_info, dict) else None
        year_found = parse_year(basic_info.get("Year found")) if isinstance(basic_info, dict) else None
        year_value = year_fell or year_found

        try:
            basic_yearFound = int(year_value)
        except (TypeError, ValueError):
            basic_yearFound = None

        # --- Coordenadas ---
        coordExactText = geography.get("Catalogue of Meteorites") if isinstance(geography, dict) else None
        coordRecomendText = geography.get("Recommended") if isinstance(geography, dict) else None

        latExact, lonExact = parse_coords_safe(coordExactText)
        latRecomend, lonRecomend = parse_coords_safe(coordRecomendText)

        # --- Filtro de datos incompletos ---
        if not basic_yearFound or (
            latExact is None and lonExact is None and latRecomend is None and lonRecomend is None
        ):
            continue

        clean_row = {
            # Información básica
            "Name": name,
            "Year": int(parse_year(row.get("Year"))) if parse_year(row.get("Year")) else None,
            "Mass": normalizar_masa(row.get("Mass")),
            "Country": row.get("Country"),
            "Type": row.get("Type"),
            "Place": row.get("Place"),
            "Status": row.get("Status"),
            "Fall": row.get("Fall"),

            # Basic info desglosada
            "basic_name": basic_info.get("Name"),
            "basic_abbrev": basic_info.get("Abbreviation"),
            "basic_fall": basic_info.get("Observed fall"),
            "basic_yearFound": basic_yearFound,
            "basic_country": basic_info.get("Country"),

            # Classification
            "classification_recomend": classification.get("Recommended"),

            # Coordenadas
            "coordinadesExact": coordExactText,
            "coordinadesLat": round(latExact, 1) if latExact is not None else None,
            "coordinadesLon": round(lonExact, 1) if lonExact is not None else None,
            "coordinadesRecomend": coordRecomendText,
            "coordinadesLatRecomend": round(latRecomend, 1) if latRecomend is not None else None,
            "coordinadesLonRecomend": round(lonRecomend, 1) if lonRecomend is not None else None,

            # Data_MB109
            "DataMB109_Lat": Data_MB109.get("Latitude"),
            "DataMB109_Lon": Data_MB109.get("Longitude"),
            "DataMB109_Mass": Data_MB109.get("Mass (g)"),
            "DataMB109_Piece": Data_MB109.get("Pieces"),
            "DataMB109_Class": Data_MB109.get("Class"),
            "DataMB109_Weathering": Data_MB109.get("Weathering grade"),
            "DataMB109_Fayalite": Data_MB109.get("Fayalite (mol%)"),
            "DataMB109_Ferrosilite": Data_MB109.get("Ferrosilite (mol%)"),
            "DataMB109_Classifier": Data_MB109.get("Classifier"),
            "DataMB109_Main_mass": Data_MB109.get("Main mass"),
            "DataMB109_Coments": Data_MB109.get("Comments"),
        }

        # --- Fotos ---
        imagenes = safe_dict(row.get("images", {}))
        fotos_info = []
        if "fotos" in imagenes and isinstance(imagenes["fotos"], list):
            for f in imagenes["fotos"]:
                if isinstance(f, dict):
                    fotos_info.append(
                        f"{f.get('autor', 'Desconocido')} | {f.get('referencia', 'No hay información')} | {f.get('foto_original', 'No hay información')}"
                    )
        else:
            fotos_info = ["No hay información"]

        clean_row.update({
            "historia": row.get("historia", "No hay información"),
            "importancia": row.get("importancia", "No hay información"),
            "descubrimiento": row.get("descubrimiento", "No hay información"),
            "impacto": row.get("impacto", "No hay información"),
            "references": row.get("references", "No hay información"),
            "fotos": "; ".join(fotos_info)
        })

        clean_rows.append(clean_row)

    df_clean = pd.DataFrame(clean_rows)

    # Guardar CSV limpio
    output_dir = os.path.join(script_dir, "data")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "meteoritos_Metbull.csv")
    df_clean.to_csv(output_path, index=False, encoding="utf-8")

    print(f"✅ CSV limpio generado: {output_path}")
    print(f"📦 Total filas válidas: {len(df_clean)} / {len(df)}")


all_data = []

for country in countries[:]:  
    #if country.upper() == "ALL":
    if True:
        continue

    print(f"Buscando meteoritos en {country}...")
    df_country = buscar_meteoritos_por_pais(country)
    if not df_country.empty:
        df_country["Country"] = country  
        all_data.append(df_country)
    time.sleep(1)  


#if all_data:
if True:    
    #df_final = pd.concat(all_data, ignore_index=True)
    #print("Total meteoritos encontrados:", len(df_final))
    #print(df_final.head())

    # Crear carpeta "data" junto al script
    #script_dir = os.path.dirname(os.path.abspath(__file__))
    #output_dir = os.path.join(script_dir, "data")
    #os.makedirs(output_dir, exist_ok=True)

    # Guardar CSV preliminar
    #output_path = os.path.join(output_dir, "meteoritos_Metbull_PreLimpieza.csv")
    #df_final.to_csv(output_path, index=False, encoding="utf-8")
    #print(f"✅ Guardado en: {output_path}")

    # 🔹 Llamar función de limpieza leyendo el CSV
    crear_csv_limpio_separado()

#else:
#    print("⚠️ No se encontraron datos")
