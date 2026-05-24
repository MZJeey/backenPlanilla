require("dotenv").config();
const express = require("express");
const cors = require("cors");
const asignarRutasAExpress = require("./rutas/rutas.js");

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.options("*", cors()); // preflight

app.use(express.json());
asignarRutasAExpress(app);

const servidor = app.listen(80, () => {
  console.log("Backend corriendo en el puerto 80.");
});
