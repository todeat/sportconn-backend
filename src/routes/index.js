// src/routes/index.js
const express = require("express");
const router = express.Router();
const sportRoutes  = require("./sportRoutes");
const cityRoutes  = require("./cityRoutes");
const userRoutes    = require("./userRoutes");
const locationRoutes = require("./locationRoutes");
const reservationRoutes = require("./reservationRoutes");
const emailVerificationRoutes = require("./emailVerificationRoutes");
const chatRoutes = require("./chatRoutes");

router.use("/sports", sportRoutes);
router.use("/cities", cityRoutes)
router.use("/user", userRoutes);
router.use("/locations", locationRoutes);
router.use("/reservations", reservationRoutes);
router.use("/email-verification", emailVerificationRoutes);
router.use("/chat", chatRoutes);


module.exports = router;
