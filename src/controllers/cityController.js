// src/controllers/citiesController.js

const citiesModel = require("../models/cityModel");

const db = require("../config/db");

exports.getAllCities = async (req, res) => {
    try {
        const cities = await citiesModel.getAllCities();
        res.json(cities);
    } catch (error) {
        console.error("Error fetching cities:", error);
        res.status(500).json({ message: "Error fetching cities" });
    }
};

