require("dotenv").config(); // primera línea
const express = require("express");
const cors = require("cors");
const asignarRutasAExpress = require("./rutas/rutas.js");

const app = express();
app.use(express.json());
app.use(cors());
asignarRutasAExpress(app);

const servidor = app.listen(80, () => {
  console.log("Backend corriendo en el puerto 80.");
});
