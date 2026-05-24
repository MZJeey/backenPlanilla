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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Backend corriendo en el puerto ${PORT}`);
});
