#!/usr/bin/env python3
"""SaborMap · servidor del prototipo con base de datos SQLite.

Sirve los archivos estáticos y una API JSON sobre data/sabormap.sqlite.
Solo usa la biblioteca estándar de Python (http.server, sqlite3, json).

    python3 server.py            # sirve en http://localhost:8000
    python3 server.py 9000      # puerto a elección

La primera vez que arranca crea data/sabormap.sqlite con el esquema y,
si está vacía, la siembra con data/semilla.json (generada con
`node tools/generar-semilla.js` a partir de la semilla de assets/js/db.js).

API:
    GET /api/db   → documento completo (el mismo JSON que usa el navegador)
    PUT /api/db   → reemplaza el documento completo (transacción)

El esquema relacional: locales, categorias, grupos, ingredientes, platos,
promociones, resenas, comensal, guardados, preferencias y meta. Los
campos compuestos (horario, fotos, ingredientes de un plato…) van como
columnas JSON (SQLite los guarda como TEXT)."""
import json
import os
import posixpath
import sqlite3
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

RAIZ = os.path.dirname(os.path.abspath(__file__))
RUTA_DB = os.path.join(RAIZ, "data", "sabormap.sqlite")
RUTA_SEMILLA = os.path.join(RAIZ, "data", "semilla.json")
VERSION = 2

ESQUEMA = """
CREATE TABLE IF NOT EXISTS meta (
  clave TEXT PRIMARY KEY,
  valor TEXT
);
CREATE TABLE IF NOT EXISTS locales (
  id TEXT PRIMARY KEY,
  nombre TEXT, descripcion TEXT, cocina TEXT,
  direccion TEXT, telefono TEXT, web TEXT,
  rango_precio INTEGER, precio_desde INTEGER, precio_hasta INTEGER,
  fotos TEXT, portada TEXT,
  horario TEXT, cierre_temporal TEXT, servicios TEXT, reinicio_diario TEXT,
  distancia INTEGER, barrio TEXT, valoracion REAL, resenas_total INTEGER,
  foto TEXT, foto_alt TEXT, glifo TEXT, dlat REAL, dlon REAL,
  version INTEGER, actualizado TEXT
);
CREATE TABLE IF NOT EXISTS categorias (
  locale_id TEXT, id TEXT, nombre TEXT,
  PRIMARY KEY (locale_id, id)
);
CREATE TABLE IF NOT EXISTS grupos (
  locale_id TEXT, id TEXT, nombre TEXT,
  PRIMARY KEY (locale_id, id)
);
CREATE TABLE IF NOT EXISTS ingredientes (
  locale_id TEXT, id TEXT, nombre TEXT, grupo TEXT, disponible INTEGER,
  PRIMARY KEY (locale_id, id)
);
CREATE TABLE IF NOT EXISTS platos (
  locale_id TEXT, id TEXT, nombre TEXT, descripcion TEXT, categoria TEXT,
  precio INTEGER, foto TEXT, valoracion REAL,
  ingredientes TEXT, etiquetas TEXT,
  estado TEXT, porciones INTEGER, vuelve TEXT, visible INTEGER,
  PRIMARY KEY (locale_id, id)
);
CREATE TABLE IF NOT EXISTS promociones (
  locale_id TEXT, id TEXT, titulo TEXT, tipo TEXT, valor INTEGER,
  plato_id TEXT, dias TEXT, todo_el_dia INTEGER,
  desde TEXT, hasta TEXT, finaliza TEXT, condiciones TEXT, activa INTEGER,
  PRIMARY KEY (locale_id, id)
);
CREATE TABLE IF NOT EXISTS resenas (
  locale_id TEXT, id TEXT, autor TEXT, rating REAL, fecha TEXT,
  verificada INTEGER, platos TEXT, texto TEXT, fotos TEXT,
  PRIMARY KEY (locale_id, id)
);
CREATE TABLE IF NOT EXISTS comensal (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  nombre TEXT, desde TEXT, ciudad TEXT,
  resenas_escritas INTEGER, platos_probados INTEGER
);
CREATE TABLE IF NOT EXISTS guardados (
  locale_id TEXT PRIMARY KEY
);
CREATE TABLE IF NOT EXISTS preferencias (
  clave TEXT PRIMARY KEY, valor INTEGER
);
"""


def conectar():
    os.makedirs(os.path.dirname(RUTA_DB), exist_ok=True)
    con = sqlite3.connect(RUTA_DB)
    con.row_factory = sqlite3.Row
    con.executescript(ESQUEMA)
    return con


# ============================ Lectura ============================

def j(valor, por_defecto):
    """Columnas JSON → valor de Python."""
    if valor in (None, ""):
        return por_defecto
    return json.loads(valor)


def leer(con):
    meta = {f["clave"]: f["valor"] for f in con.execute("SELECT clave, valor FROM meta")}
    doc = {
        "version": VERSION,
        "activo": meta.get("activo", "trattoria-del-sol"),
        "locales": [],
        "comensal": None,
    }

    for fila in con.execute("SELECT * FROM locales ORDER BY rowid"):
        lid = fila["id"]
        doc["locales"].append({
            "id": lid,
            "version": fila["version"],
            "local": {
                "id": fila["id"], "nombre": fila["nombre"], "descripcion": fila["descripcion"],
                "cocina": fila["cocina"], "direccion": fila["direccion"], "telefono": fila["telefono"],
                "web": fila["web"], "rangoPrecio": fila["rango_precio"],
                "precioDesde": fila["precio_desde"], "precioHasta": fila["precio_hasta"],
                "fotos": j(fila["fotos"], []), "portada": fila["portada"],
                "horario": j(fila["horario"], []),
                "cierreTemporal": j(fila["cierre_temporal"], {"activo": False, "motivo": "", "hasta": ""}),
                "servicios": j(fila["servicios"], []),
                "reinicioDiario": j(fila["reinicio_diario"], {"activo": True, "hora": "12:00"}),
            },
            "categorias": filas(con, "categorias", lid, ["id", "nombre"]),
            "gruposIngredientes": filas(con, "grupos", lid, ["id", "nombre"]),
            "ingredientes": [dict(r) for r in con.execute(
                "SELECT id, nombre, grupo, disponible FROM ingredientes WHERE locale_id = ? ORDER BY rowid", (lid,))],
            "platos": [dict(r) for r in con.execute(
                "SELECT id, nombre, descripcion, categoria, precio, foto, valoracion, "
                "ingredientes, etiquetas, estado, porciones, vuelve, visible FROM platos "
                "WHERE locale_id = ? ORDER BY rowid", (lid,))],
            "promociones": [dict(r) for r in con.execute(
                "SELECT id, titulo, tipo, valor, plato_id, dias, todo_el_dia, desde, hasta, "
                "finaliza, condiciones, activa FROM promociones WHERE locale_id = ? ORDER BY rowid", (lid,))],
            "resenas": [dict(r) for r in con.execute(
                "SELECT id, autor, rating, fecha, verificada, platos, texto, fotos FROM resenas "
                "WHERE locale_id = ? ORDER BY rowid", (lid,))],
            "comensal": {
                "distancia": fila["distancia"], "barrio": fila["barrio"],
                "valoracion": fila["valoracion"], "resenasTotal": fila["resenas_total"],
                "foto": fila["foto"], "fotoAlt": fila["foto_alt"], "glifo": fila["glifo"],
                "dLat": fila["dlat"], "dLon": fila["dlon"],
            },
            "_actualizado": fila["actualizado"],
        })

    for l in doc["locales"]:
        for p in l["platos"]:
            p["ingredientes"] = j(p["ingredientes"], [])
            p["etiquetas"] = j(p["etiquetas"], [])
        for pr in l["promociones"]:
            pr["platoId"] = pr.pop("plato_id")
            pr["dias"] = j(pr["dias"], [])
            pr["todoElDia"] = bool(pr.pop("todo_el_dia"))
        for r in l["resenas"]:
            r["verificada"] = bool(r["verificada"])
            r["platos"] = j(r["platos"], [])
            r["fotos"] = j(r["fotos"], [])

    fila_com = con.execute("SELECT * FROM comensal WHERE id = 1").fetchone()
    if fila_com:
        doc["comensal"] = {
            "nombre": fila_com["nombre"], "desde": fila_com["desde"], "ciudad": fila_com["ciudad"],
            "resenasEscritas": fila_com["resenas_escritas"], "platosProbados": fila_com["platos_probados"],
            "guardados": [r["locale_id"] for r in con.execute("SELECT locale_id FROM guardados ORDER BY rowid")],
            "preferencias": {r["clave"]: bool(r["valor"]) for r in con.execute("SELECT clave, valor FROM preferencias")},
        }
    return doc


def filas(con, tabla, lid, columnas):
    sql = "SELECT " + ", ".join(columnas) + " FROM " + tabla + " WHERE locale_id = ? ORDER BY rowid"
    return [dict(r) for r in con.execute(sql, (lid,))]


# ============================ Escritura ============================

def escribir(con, doc):
    con.execute("BEGIN")
    try:
        for tabla in ("locales", "categorias", "grupos", "ingredientes", "platos",
                      "promociones", "resenas", "comensal", "guardados", "preferencias", "meta"):
            con.execute("DELETE FROM " + tabla)

        for l in doc["locales"]:
            info = l["local"]
            com = l["comensal"]
            columnas_locales = {
                "id": l["id"],
                "nombre": info["nombre"],
                "descripcion": info.get("descripcion", ""),
                "cocina": info.get("cocina", ""),
                "direccion": info.get("direccion", ""),
                "telefono": info.get("telefono", ""),
                "web": info.get("web", ""),
                "rango_precio": info.get("rangoPrecio", 2),
                "precio_desde": info.get("precioDesde", 0),
                "precio_hasta": info.get("precioHasta", 0),
                "fotos": jdump(info.get("fotos", [])),
                "portada": info.get("portada", ""),
                "horario": jdump(info.get("horario", [])),
                "cierre_temporal": jdump(info.get("cierreTemporal", {})),
                "servicios": jdump(info.get("servicios", [])),
                "reinicio_diario": jdump(info.get("reinicioDiario", {})),
                "distancia": com["distancia"],
                "barrio": com["barrio"],
                "valoracion": com["valoracion"],
                "resenas_total": com["resenasTotal"],
                "foto": com.get("foto", ""),
                "foto_alt": com.get("fotoAlt", ""),
                "glifo": com.get("glifo", ""),
                "dlat": com.get("dLat", 0),
                "dlon": com.get("dLon", 0),
                "version": l.get("version", 1),
                "actualizado": l.get("_actualizado", ""),
            }
            con.execute(
                "INSERT INTO locales (" + ",".join(columnas_locales) + ") VALUES (" +
                ",".join("?" * len(columnas_locales)) + ")",
                tuple(columnas_locales.values()))

            for c in l.get("categorias", []):
                insertar(con, "categorias", [l["id"], c["id"], c["nombre"]])
            for g in l.get("gruposIngredientes", []):
                insertar(con, "grupos", [l["id"], g["id"], g["nombre"]])
            for i in l.get("ingredientes", []):
                insertar(con, "ingredientes", [l["id"], i["id"], i["nombre"],
                                               i.get("grupo", ""), 1 if i.get("disponible") else 0])
            for p in l.get("platos", []):
                insertar(con, "platos", [l["id"], p["id"], p["nombre"], p.get("descripcion", ""),
                                         p.get("categoria", ""), p.get("precio", 0), p.get("foto", ""),
                                         p.get("valoracion"), jdump(p.get("ingredientes", [])),
                                         jdump(p.get("etiquetas", [])), p.get("estado", "disponible"),
                                         p.get("porciones"), p.get("vuelve", ""),
                                         1 if p.get("visible", True) else 0])
            for pr in l.get("promociones", []):
                insertar(con, "promociones", [l["id"], pr["id"], pr["titulo"], pr.get("tipo", ""),
                                              pr.get("valor"), pr.get("platoId"), jdump(pr.get("dias", [])),
                                              1 if pr.get("todoElDia") else 0, pr.get("desde", ""),
                                              pr.get("hasta", ""), pr.get("finaliza", ""),
                                              pr.get("condiciones", ""), 1 if pr.get("activa") else 0])
            for r in l.get("resenas", []):
                insertar(con, "resenas", [l["id"], r["id"], r["autor"], r.get("rating", 5), r.get("fecha", ""),
                                          1 if r.get("verificada") else 0, jdump(r.get("platos", [])),
                                          r.get("texto", ""), jdump(r.get("fotos", []))])

        c = doc.get("comensal") or {}
        insertar(con, "comensal", [1, c.get("nombre", ""), c.get("desde", ""), c.get("ciudad", ""),
                                   c.get("resenasEscritas", 0), c.get("platosProbados", 0)])
        for g in c.get("guardados", []):
            insertar(con, "guardados", [g])
        for clave, valor in (c.get("preferencias") or {}).items():
            insertar(con, "preferencias", [clave, 1 if valor else 0])

        con.execute("INSERT INTO meta VALUES ('activo', ?)", (doc.get("activo", "trattoria-del-sol"),))
        con.commit()
    except Exception:
        con.rollback()
        raise


def jdump(valor):
    return json.dumps(valor, ensure_ascii=False)


def insertar(con, tabla, valores):
    """INSERT sin columnas: los placeholders se generan según la tupla,
    así el conteo nunca descuadra del esquema de la tabla."""
    con.execute(
        "INSERT INTO " + tabla + " VALUES (" + ",".join("?" * len(valores)) + ")",
        tuple(valores))


# ============================ Sembrado ============================

def sembrar_si_vacia(con):
    n = con.execute("SELECT COUNT(*) AS n FROM locales").fetchone()["n"]
    if n:
        return False
    if not os.path.exists(RUTA_SEMILLA):
        return False
    with open(RUTA_SEMILLA, encoding="utf-8") as f:
        escribir(con, json.load(f))
    return True


# ============================ Servidor ============================

class Manejador(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=RAIZ, **kwargs)

    def send_header(self, keyword, value):
        if keyword.lower() == "cache-control":
            self._cache_enviada = True
        super().send_header(keyword, value)

    def end_headers(self):
        """Prototipo: sin cache heurística del navegador. Sin esto, un
        render.js viejo puede seguir sirviéndose tras cambiar el código."""
        if not getattr(self, "_cache_enviada", False):
            self.send_header("Cache-Control", "no-cache")
        self._cache_enviada = False
        super().end_headers()

    def _json(self, codigo, cuerpo):
        datos = json.dumps(cuerpo, ensure_ascii=False).encode("utf-8")
        self.send_response(codigo)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(datos)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(datos)

    def do_GET(self):
        if self.path.split("?")[0] == "/api/db":
            with conectar() as con:
                return self._json(200, leer(con))
        return super().do_GET()

    def do_PUT(self):
        if self.path.split("?")[0] != "/api/db":
            return self._json(404, {"error": "desconocido"})
        try:
            largo = int(self.headers.get("Content-Length", 0))
            doc = json.loads(self.rfile.read(largo) or b"null")
            if not isinstance(doc, dict) or doc.get("version") != VERSION or not doc.get("locales"):
                return self._json(400, {"error": "documento no válido"})
            with conectar() as con:
                escribir(con, doc)
            return self._json(200, {"ok": True})
        except (ValueError, KeyError, sqlite3.Error) as e:
            return self._json(400, {"error": str(e)})

    def log_message(self, formato, *args):
        sys.stderr.write("%s · %s\n" % (self.address_string(), formato % args))


def main():
    puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    with conectar() as con:
        if sembrar_si_vacia(con):
            print("data/sabormap.sqlite sembrada desde data/semilla.json")
        else:
            print("data/sabormap.sqlite ya tiene datos")
    servidor = ThreadingHTTPServer(("", puerto), Manejador)
    print("SaborMap en http://localhost:%d (API: GET/PUT /api/db)" % puerto)
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\nAdiós.")


if __name__ == "__main__":
    main()
