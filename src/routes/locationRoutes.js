// src/routes/locationsRoutes.js
const express = require("express");
const router = express.Router();
const locationController = require("../controllers/locationController");
const verifyToken = require("../middleware/authMiddleware");
const requireVerifiedEmail = require("../middleware/emailVerifiedMiddleware");
const checkPendingLocation = require("../middleware/pendingLocationMiddleware");


router.post("/addLocationPending",
     verifyToken, 
    //  requireVerifiedEmail,
     checkPendingLocation, 
     locationController.addLocationPending);
router.post("/toggle-validation", verifyToken, locationController.toggleLocationValidation);
router.get("/:locationId/info", locationController.getLocationInfo);
router.post("/schedule", verifyToken, locationController.getLocationSchedule);
router.post("/edit", verifyToken, locationController.editLocation);
router.post("/facilities", locationController.getAllFacilities);

module.exports = router;
