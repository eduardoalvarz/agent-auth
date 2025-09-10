import pandas as pd
import json
from pathlib import Path

# Default CSV path: Hercules sellout sample in this repo
BASE_DIR = Path(__file__).resolve().parent
CSV_FILE = BASE_DIR / "hercules_cadenas_SO.csv"

class CSVAgent:
    def __init__(self, csv_path: Path = CSV_FILE):
        # Carga completa
        self.df = pd.read_csv(csv_path, low_memory=False)

        # Extrae valores únicos planos
        self.uniques = {
            "CADENA"    : sorted(self.df["CADENA"].dropna().unique().tolist()),
            "ESTADO"    : sorted(self.df["ESTADO"].dropna().unique().tolist()),
            "TIENDA"    : sorted(self.df["TIENDA"].dropna().unique().tolist()),
            "PRODUCTO"  : sorted(self.df["PRODUCTO"].dropna().unique().tolist()),
            "MARCA"     : sorted(self.df["MARCA"].dropna().unique().tolist()),
            "CATEGORÍA" : sorted(self.df["CATEGORÍA"].dropna().unique().tolist()),  # Nueva
        }

        # Mapeo Marca → Productos
        marca_producto: dict[str, list[str]] = {}
        for marca in self.uniques["MARCA"]:
            productos = (
                self.df[self.df["MARCA"] == marca]["PRODUCTO"]
                .dropna()
                .unique()
                .tolist()
            )
            marca_producto[marca] = sorted(productos)
        self.uniques["MARCA_PRODUCTO"] = marca_producto

        # Mapeo Categoría → Marca → Productos
        categoria_map: dict[str, dict[str, list[str]]] = {}
        for categoria in self.uniques["CATEGORÍA"]:
            df_cat = self.df[self.df["CATEGORÍA"] == categoria]
            marcas_en_cat = df_cat["MARCA"].dropna().unique()
            marca_prod_en_cat: dict[str, list[str]] = {}
            for marca in marcas_en_cat:
                productos = (
                    df_cat[df_cat["MARCA"] == marca]["PRODUCTO"]
                    .dropna()
                    .unique()
                    .tolist()
                )
                marca_prod_en_cat[str(marca)] = sorted(productos)
            categoria_map[categoria] = marca_prod_en_cat
        self.uniques["CATEGORÍA_MARCA_PRODUCTO"] = categoria_map

    def export_uniques(self) -> str:
        return json.dumps(self.uniques, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    agent = CSVAgent(CSV_FILE)
    (BASE_DIR / "unique_values.json").write_text(agent.export_uniques(), encoding="utf-8")