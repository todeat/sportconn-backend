const express = require("express");
const cors = require("cors");  // Importează CORS
const routes = require("./routes");

const app = express();


app.use(cors({
    origin: [
        "http://localhost:3000",  // pt loc
        "https://sportconn-frontend.vercel.app"  // pt prod
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
}));

app.use(express.json());
app.use("/api", routes);
app.get("/", (req, res) => {
    res.send("Server is working!");
});

module.exports = app;
