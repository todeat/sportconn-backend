// src/app.js
const express = require("express");
const cors = require("cors");  // Importează CORS
const routes = require("./routes");

const app = express();

// Configurează CORS pentru a permite cereri de la frontend-ul local
app.use(cors({
    origin: "http://localhost:3000"  // Adaugă domeniul frontend-ului tău aici
}));

app.use(express.json());
app.use("/api", routes);
app.get("/", (req, res) => {
    res.send("Server is working!");
});

module.exports = app;
