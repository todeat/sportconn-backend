// src/controllers/locationController.js
const locationModel = require("../models/locationModel");
const { isUserAdminOfLocation } = require("../utils/dbUtils");

exports.addLocationPending = async (req, res) => {
    try {
        const uid = req.user.uid;

        const result = await locationModel.addLocationPending(uid, req.body);
        res.json(result);
    } catch (error) {
        console.error("Eroare la adăugarea locației în așteptare:", error);
        res.status(400).json({ success: false, message: error.message });
    }
};


exports.toggleLocationValidation = async (req, res) => {
    try {
        const locationId = parseInt(req.body.locationId);
        const uid = req.user.uid; // Vine direct din middleware

        if (!locationId) {
            return res.status(400).json({
                success: false,
                message: "LocationId este obligatoriu."
            });
        }

        // Verifică doar dacă utilizatorul este admin al locației
        const isAdmin = await isUserAdminOfLocation(uid, locationId);
        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Nu aveți permisiunea de a modifica această locație."
            });
        }

        const result = await locationModel.toggleLocationValidation({
            locationId,
            uid
        });

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);

    } catch (error) {
        console.error("Error in toggleLocationValidation controller:", error);
        res.status(500).json({
            success: false,
            message: "Eroare la modificarea stării locației",
            error: error.message
        });
    }
};

exports.getLocationInfo = async (req, res) => {
    try {
        const locationId = parseInt(req.params.locationId);
        
        if (!locationId) {
            return res.status(400).json({
                success: false,
                message: "LocationId este obligatoriu"
            });
        }

        const locationInfo = await locationModel.getLocationInfo(locationId);
        res.json(locationInfo);

    } catch (error) {
        console.error("Error in getLocationInfo controller:", error);
        res.status(404).json({
            success: false,
            message: error.message || "Nu s-au putut obține informațiile despre locație"
        });
    }
};

exports.getLocationSchedule = async (req, res) => {
    try {
        const locationId = parseInt(req.body.locationId);
        const uid = req.user.uid;
        const selectedDate = req.body.selectedDate || new Date().toISOString().slice(0, 10);

        const isAdmin = await isUserAdminOfLocation(uid, locationId);
        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Nu aveți permisiunea de a accesa programul acestei locații."
            });
        }

        const result = await locationModel.getLocationSchedule({
            locationId,
            uid,
            selectedDate,
            token: req.token 
        });

        res.json(result);
    } catch (error) {
        console.error("Error in getLocationSchedule controller:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Eroare la obținerea programului locației"
        });
    }
};

exports.editLocation = async (req, res) => {
    try {
        const { locationId, edits } = req.body;
        const uid = req.user.uid;

        if (!locationId || !edits) {
            return res.status(400).json({
                success: false,
                message: "LocationId și edits sunt obligatorii"
            });
        }

        const isAdmin = await isUserAdminOfLocation(uid, locationId);
        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Nu aveți permisiunea de a edita această locație"
            });
        }

        const result = await locationModel.handleLocationEdit(locationId, edits);
        res.json(result);

    } catch (error) {
        console.error("Error in editLocation controller:", error);
        res.status(500).json({
            success: false,
            message: "Eroare la editarea locației",
            error: error.message
        });
    }
};


exports.getAllFacilities = async (req, res) => {
    try {
        const filters = {
            cityId: req.body.cityId ? parseInt(req.body.cityId) : null,
            sportId: req.body.sportId ? parseInt(req.body.sportId) : null,
            searchTerm: req.body.search || null,
            limit: req.body.limit ? parseInt(req.body.limit) : null,
            offset: req.body.offset ? parseInt(req.body.offset) : 0,
            sortBy: req.body.sortBy || 'name',
            sortOrder: req.body.sortOrder?.toLowerCase() === 'desc' ? 'DESC' : 'ASC'
        };

        const result = await locationModel.getAllFacilities(filters);

        res.json({
            success: true,
            facilities: result.facilities,
            total: result.total,
            page: {
                offset: filters.offset,
                limit: filters.limit,
                total: result.total
            }
        });

    } catch (error) {
        console.error("Error in getAllFacilities controller:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching facilities",
            error: error.message
        });
    }
};
