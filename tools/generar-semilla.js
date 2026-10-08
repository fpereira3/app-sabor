/* Genera data/semilla.json desde la semilla de assets/js/db.js.
   Es la misma semilla que usa el navegador sin servidor; server.py la
   siembra en SQLite la primera vez que arranca.
   Ejecutar desde la raíz del proyecto:  node tools/generar-semilla.js */
'use strict';
globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};
const fs = require('fs');
const path = require('path');
require(path.join(__dirname, '..', 'assets', 'js', 'datos-demo.js'));
require(path.join(__dirname, '..', 'assets', 'js', 'db.js'));
const db = SaborMapDB.sembrarDeNuevo();
const destino = path.join(__dirname, '..', 'data', 'semilla.json');
fs.writeFileSync(destino, JSON.stringify(db, null, 2) + '\n');
console.log('data/semilla.json ·', db.locales.length, 'locales ·',
  db.locales.reduce((n, l) => n + l.platos.length, 0), 'platos ·',
  db.locales.reduce((n, l) => n + l.promociones.length, 0), 'promociones');
