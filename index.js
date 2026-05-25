process.on("uncaughtException", (err) => {
  console.error("ERROR FATAL:", err.message, err.stack);
});

process.on("unhandledRejection", (reason) => {
  console.error("PROMESA RECHAZADA:", reason);
});

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const asignarRutasAExpress = require("./rutas/rutas.js");

const app = express();

const corsOptions = {
  origin: "https://app-planilla.vercel.app",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.options("*", cors(corsOptions));
app.use(cors(corsOptions));

app.use(express.json());
asignarRutasAExpress(app);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Backend corriendo en el puerto ${PORT}`);
});
