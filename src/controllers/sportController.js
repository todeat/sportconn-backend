// src/controllers/sportsController.js
const sportsModel = require("../models/sportModel");

const db = require("../config/db");

exports.getAllSports = async (req, res) => {
  const cityId = req.query.cityId ? parseInt(req.query.cityId) : null;

  try {
      const sports = await sportsModel.getAllSports(cityId);
      res.json(sports);
  } catch (error) {
      console.error("Error fetching sports:", error);
      res.status(500).json({ message: "Error fetching sports" });
  }
};
