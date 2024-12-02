const reservationModel = require('../models/reservationModel');
const { isUserAdminOfLocation } = require("../utils/dbUtils");

exports.getAvailableTimeSlots = async (req, res) => {
    try {
        const requestData = {
            sportName: req.body.sportName || null,
            courtId: req.body.courtId ? parseInt(req.body.courtId) : null,
            cityName: req.body.cityName,
            selectedDate: req.body.selectedDate || new Date().toISOString().slice(0, 10),
            startHour: req.body.startHour,
            endHour: req.body.endHour,
            minDuration: req.body.minDuration ? parseFloat(req.body.minDuration) : 1,
            locationId: req.body.locationId ? parseInt(req.body.locationId) : null,
            token: req.body.token || req.headers.authorization?.split('Bearer ')[1] ||  null,
            cityId: req.body.cityId || null,
            sportId: req.body.sportId || null
        };

        const availableTimeSlots = await reservationModel.getAvailableTimeSlots(requestData);
        console.log(availableTimeSlots);
        res.json(availableTimeSlots);

    } catch (error) {
        console.error("Error in getAvailableTimeSlots controller:", error);
        res.status(500).json({ 
            success: false, 
            message: "Error getting available time slots",
            error: error.message 
        });
    }
};


exports.saveReservation = async (req, res) => {
    try {
        // Verificăm dacă avem toate datele necesare
        const requiredFields = ['courtId', 'dataOraStart', 'dataOraEnd', 'name'];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Următoarele câmpuri sunt obligatorii: ${missingFields.join(', ')}`
            });
        }

        // Construim obiectul cu datele necesare pentru salvarea rezervării
        const reservationData = {
            userId: req.user.uid, // UID-ul decodat din token de către middleware
            courtId: parseInt(req.body.courtId),
            dataOraStart: req.body.dataOraStart,
            dataOraEnd: req.body.dataOraEnd,
            name: req.body.name
        };

        const result = await reservationModel.saveReservation(reservationData);
        res.status(201).json(result);

    } catch (error) {
        console.error('Error in saveReservation controller:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

exports.getUserReservations = async (req, res) => {
    try {
        const uid = req.user.uid;
        
        const reservations = await reservationModel.getUserReservations(uid);
        
        if (!reservations.success) {
            // Returnăm status 200 cu un mesaj clar că nu sunt rezervări
            return res.status(200).json({
                success: false,
                message: "Nu s-au găsit rezervări pentru acest utilizator.",
                upcoming_reservations: [],
                last_reservations: [],
                admin_upcoming_reservations: [],
                admin_last_reservations: []
            });
        }
        
        res.status(200).json(reservations);
    } catch (error) {
        console.error("Error in getUserReservations controller:", error);
        res.status(500).json({ 
            success: false, 
            message: "Eroare la obținerea rezervărilor",
            error: error.message 
        });
    }
};

exports.deleteReservation = async (req, res) => {
    try {
        const { reservationId } = req.body;
        const uid = req.user.uid; 

        if (!reservationId ) {
            return res.status(400).json({
                success: false,
                message: "ID-ul rezervării este obligatoriu"
            });
        }

        // Obținem informațiile despre rezervare
        const reservationInfo = await reservationModel.getReservationInfo(reservationId);
        
        if (!reservationInfo) {
            return res.status(404).json({
                success: false,
                message: "Rezervarea specificată nu există"
            });
        }

        const locationId = reservationInfo.locationid;

        // Verificăm dacă utilizatorul este admin al locației
        const isAdmin = await isUserAdminOfLocation(uid, locationId);
        
        // Verificăm dacă utilizatorul este proprietarul rezervării sau admin
        if (reservationInfo.userId !== uid && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Nu aveți permisiunea de a șterge această rezervare"
            });
        }

        // Ștergem rezervarea
        const result = await reservationModel.deleteReservation(reservationId);
        
        res.json(result);

    } catch (error) {
        console.error("Error in deleteReservation controller:", error);
        res.status(500).json({
            success: false,
            message: "Eroare la ștergerea rezervării",
            error: error.message
        });
    }
};


