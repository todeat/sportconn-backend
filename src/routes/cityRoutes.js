const express = require("express");
const router = express.Router();
const citiesController = require("../controllers/cityController");

router.get("/getCities", citiesController.getAllCities);

module.exports = router;