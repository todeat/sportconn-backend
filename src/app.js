const express = require("express");
const cors = require("cors");  // Importează CORS
const routes = require("./routes");

const app = express();

// Configurează CORS pentru a permite cereri de la mai multe origini
app.use(cors({
    origin: [
        "http://localhost:3000",  // Pentru dezvoltare locală
        "https://sportconn-frontend.vercel.app"  // Pentru producție
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,  // Dacă folosești cookies sau autentificare bazată pe sesiuni
}));

app.use(express.json());
app.use("/api", routes);
app.get("/", (req, res) => {
    res.send("Server is working!");
});

module.exports = app;
