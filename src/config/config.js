// src/config/config.js
require("dotenv").config();

module.exports = {
  port: process.env.PORT || 3005,  // Preia portul din .env sau folosește 3000 implicit
};
