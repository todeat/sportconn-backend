const { Pool } = require("pg");
require("dotenv").config({ path: require('path').resolve(__dirname, '../../.env') });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT)
});

// După conectare, setează fusul orar
pool.connect()
  .then(client => {
    console.log("Connected to the database successfully.");
    return client.query("SET TIME ZONE 'Europe/Bucharest';")
      .then(() => {
        console.log("Timezone set to Europe/Bucharest.");
        client.release(); // Eliberează conexiunea
      })
      .catch(err => {
        console.error("Failed to set timezone:", err);
        client.release(); // Asigură eliberarea conexiunii chiar și în caz de eroare
      });
  })
  .catch(err => console.error("Failed to connect to the database:", err));

module.exports = {
  query: (text, params) => pool.query(text, params),
};
