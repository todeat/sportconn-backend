// src/controllers/userController.js
const userModel = require("../models/userModel");
const { generateUniqueUsername, isUserAdmin, isUserEmailVerified } = require("../utils/dbUtils");

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

        // Obține informațiile de bază ale utilizatorului
        const userInfo = await userModel.getUserBasicInfo(uid);
        if (!userInfo) {
            return res.status(404).json({ message: "Utilizatorul nu a fost găsit." });
        }


        // Verifică dacă utilizatorul este admin
        const isAdminUser = await isUserAdmin(uid);

        const isEmailVerified = await isUserEmailVerified(uid);

        userInfo.adminInfo = {
            isAdmin: isAdminUser,
            locationsCount: 0,
            locationsInfo: []
        };

        // Dacă este admin, obține informațiile complete
        if (isAdminUser) {
            const locations = await userModel.getUserAdminLocations(uid);
            
            userInfo.adminInfo = {
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
        }

        // Ne asigurăm că toate câmpurile necesare există

        res.json({
            success: true,
            userInfo: {
                ...userInfo,
                isEmailVerified
            }

        });
    } catch (error) {
        console.error("Eroare la obținerea informațiilor utilizatorului:", error);
        res.status(500).json({ 
            success: false,
            message: "Eroare internă a serverului.",
            error: error.message 
        });
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


exports.updateEmail = async (req, res) => {
    try {
        const uid = req.user.uid;
        const { email } = req.body;
 
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email-ul este obligatoriu"
            });
        }
 
        const result = await userModel.updateEmail(uid, email);
        res.json(result);
 
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
 };
 
