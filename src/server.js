// src/server.js
require("dotenv").config();  // Încarcă variabilele din .env

process.env.TZ = "Europe/Bucharest";

const app = require("./app");  // Importă aplicația configurată din app.js
const { port } = require("./config/config");  // Importă portul din configurare



// Pornește serverul pe portul specificat
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
