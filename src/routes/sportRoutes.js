// src/routes/sportsRoutes.js
const express = require("express");
const router = express.Router();
const sportsController = require("../controllers/sportController");

router.get("/getSports", sportsController.getAllSports);

module.exports = router;
