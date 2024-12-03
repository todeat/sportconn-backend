// src/routes/userRoutes.js
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const verifyToken = require("../middleware/authMiddleware");

// Ruta pentru crearea unui nou utilizator, protejată cu verifyToken
router.post("/createUser", verifyToken, userController.createUser);
router.get("/getUserInfo", verifyToken, userController.getUserInfo);
router.post("/checkUserExists", userController.checkUserExists);
router.put("/update-email", verifyToken, userController.updateEmail);

module.exports = router;
