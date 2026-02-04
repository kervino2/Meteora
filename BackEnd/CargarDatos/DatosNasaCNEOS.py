import os
import requests
import pandas as pd

def obtener_nasa_fireballs(limit=1000):
    url = f"https://ssd-api.jpl.nasa.gov/fireball.api?limit={limit}"
    response = requests.get(url)
    data = response.json()
    
    fields = data["fields"]
    registros = data["data"]
    
    df = pd.DataFrame(registros, columns=fields)
    return df

if __name__ == "__main__":
    df = obtener_nasa_fireballs(100000)
    print(df.head())
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, "data")  # carpeta "data" junto al script
    os.makedirs(output_dir, exist_ok=True)  # la crea si no existe

    output_path = os.path.join(output_dir, "meteoritos_NasaCNEOS.csv")
    df.to_csv(output_path, index=False, encoding="utf-8")
    print("Guardado en meteoritos_NasaCNEOS.csv")