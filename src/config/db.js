// src/config/db.js
const { Pool } = require("pg");
require("dotenv").config({ path: require('path').resolve(__dirname, '../../.env') });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT)
});

pool.connect()
  .then(() => console.log("Connected to the database successfully."))
  .catch(err => console.error("Failed to connect to the database:", err));

module.exports = {
  query: (text, params) => pool.query(text, params),
};