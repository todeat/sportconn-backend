// src/routes/reservationRoutes.js
const express = require("express");
const router = express.Router();
const reservationController = require("../controllers/reservationController");
const verifyToken = require("../middleware/authMiddleware");

router.post("/available-slots", reservationController.getAvailableTimeSlots);
router.post("/save", verifyToken,  reservationController.saveReservation);
router.post("/user-reservations", verifyToken, reservationController.getUserReservations);
router.post("/delete", verifyToken, reservationController.deleteReservation);

module.exports = router;