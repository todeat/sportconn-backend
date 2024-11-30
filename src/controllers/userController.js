// src/controllers/userController.js
const userModel = require("../models/userModel");
const { generateUniqueUsername } = require("../utils/dbUtils");

const locationModel = require("../models/locationModel");

exports.createUser = async (req, res) => {
    try {
        const { email, phoneNumber, firstName, lastName, role } = req.body;
        const uid = req.user.uid;  // Preluăm uid-ul direct din tokenul decodificat

        // Verificăm dacă utilizatorul există deja în baza de date
        const userExists = await userModel.checkUserExistsByUid(uid);
        if (userExists) {
            return res.status(400).json({ message: "Utilizatorul există deja." });
        }

        // Generăm un username unic
        const baseUsername = (firstName + lastName).toLowerCase();
        const username = await generateUniqueUsername(baseUsername);

        // Creăm utilizatorul
        const newUser = await userModel.createUser({ uid, email, phoneNumber, firstName, lastName, username, role });
        res.status(201).json({ success: true, userId: newUser.id, username: newUser.username });
    } catch (error) {
        console.error("Eroare la crearea utilizatorului:", error);
        res.status(500).json({ message: "Eroare la crearea utilizatorului." });
    }
};


exports.getUserInfo = async (req, res) => {
    try {
        const uid = req.user.uid;

        const userInfo = await userModel.getUserBasicInfo(uid);
        if (!userInfo) {
            return res.status(404).json({ message: "Utilizatorul nu a fost găsit." });
        }

        const locations = await userModel.getUserAdminLocations(uid);

        const adminInfo = {
            isAdmin: locations.length > 0,
            locationsCount: locations.length,
            locationsInfo: await Promise.all(locations.map(async (location) => ({
                locationId: location.locationid,
                locationName: location.locationname,
                status: location.status,
                isValid: location.isvalid ? "1" : "0",
                schedule: location.schedule,
                address: location.address,
                description: location.description,
                cityId: location.cityid,
                cityName: location.cityname,
                courts: await locationModel.getLocationCourts(location.locationid)
            })))
        };

        userInfo.adminInfo = adminInfo;

        res.json({
            success: true,
            userInfo
        });
    } catch (error) {
        console.error("Eroare la obținerea informațiilor utilizatorului:", error);
        res.status(500).json({ message: "Eroare internă a serverului." });
    }
};

exports.checkUserExists = async (req, res) => {
    try {
        const { phoneNumber, email } = req.body;

        // Apelăm funcția din model și obținem rezultatul
        const result = await userModel.checkUserExists({ phoneNumber, email });

        res.json(result);
    } catch (error) {
        console.error("Eroare la verificarea existenței utilizatorului:", error);
        res.status(400).json({ message: error.message });
    }
};

