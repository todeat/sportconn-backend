// src/models/userModel.js
const db = require("../config/db");
const { generateUniqueUsername, isUserEmailVerified} = require("../utils/dbUtils");

// Funcție pentru a crea un nou utilizator
async function createUser(data) {
    const { uid, email, phoneNumber, firstName, lastName} = data;

    // Verificăm dacă utilizatorul există deja
    const userExists = await checkUserExistsByUid(uid);
    if (userExists) {
        throw new Error("Utilizatorul cu acest UID există deja.");
    }

    // Generăm un username unic
    const baseUsername = (firstName + lastName).toLowerCase();
    const username = await generateUniqueUsername(baseUsername);

    // Inserare utilizator în baza de date
    const sql = `
        INSERT INTO mod_dms_gen_sconn___users (uid, email, phoneNumber, firstName, lastName, username)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, username;
    `;

    const params = [uid, email, phoneNumber, firstName, lastName, username];
    const result = await db.query(sql, params);

    return result.rows[0];
}

// Funcție pentru a verifica dacă un utilizator cu uid-ul dat există deja
async function checkUserExistsByUid(uid) {
    const sql = `
        SELECT COUNT(*) as count 
        FROM mod_dms_gen_sconn___users 
        WHERE uid = $1;
    `;
    const result = await db.query(sql, [uid]);

    return result.rows[0].count > 0;  // Returnează true dacă există un utilizator cu acest uid
}

async function getUserBasicInfo(uid) {
    const sqlUser = `
        SELECT 
            uid, email, phoneNumber, firstName, lastName, username
        FROM 
            mod_dms_gen_sconn___users 
        WHERE 
            uid = $1
    `;
    const result = await db.query(sqlUser, [uid]);
    return result.rows[0] || null;
}

// Obține locațiile administrate de utilizator
async function getUserAdminLocations(uid) {
    // First get base location data
    const sqlLocations = `
        SELECT 
            al.locationId,
            l.name AS locationName,
            COALESCE(pl.status, 'active') AS status,
            l.valid AS isValid,
            l.address,
            l.description,
            l.cityId,
            c.name AS cityName
        FROM 
            mod_dms_gen_sconn___admin_locations al
        JOIN 
            mod_dms_gen_sconn___locations l ON al.locationId = l.id
        LEFT JOIN 
            mod_dms_gen_sconn___pending_locations pl ON l.id = pl.locationId
        JOIN
            mod_dms_gen_sconn___cities c ON l.cityId = c.id
        WHERE 
            al.uid = $1
    `;

    const locations = await db.query(sqlLocations, [uid]);

    // Get schedule for each location
    const locationsWithSchedule = await Promise.all(
        locations.rows.map(async (location) => {
            const scheduleQuery = `
                SELECT 
                    dayofweek,
                    orastart,
                    oraend,
                    isopen
                FROM 
                    mod_dms_gen_sconn___location_schedules
                WHERE 
                    locationid = $1
                ORDER BY 
                    dayofweek
            `;
            const scheduleResult = await db.query(scheduleQuery, [location.locationid]);
            
            return {
                ...location,
                schedule: scheduleResult.rows
            };
        })
    );

    return locationsWithSchedule;
}

async function checkUserExists(data) {
    const { phoneNumber, email } = data;

    // Verifică dacă numărul de telefon este furnizat
    if (!phoneNumber) {
        throw new Error("Numărul de telefon este obligatoriu.");
    }

    // Verificăm existența utilizatorului după numărul de telefon
    let sql = "SELECT id FROM mod_dms_gen_sconn___users WHERE phoneNumber = $1";
    let result = await db.query(sql, [phoneNumber]);

    if (result.rows.length > 0) {
        return {
            exists: true,
            message: "Utilizatorul există.",
            foundBy: "phoneNumber"
        };
    }

    // Dacă utilizatorul nu este găsit după telefon, verificăm după email (dacă este furnizat)
    if (email) {
        sql = "SELECT id FROM mod_dms_gen_sconn___users WHERE email = $1";
        result = await db.query(sql, [email]);

        if (result.rows.length > 0) {
            return {
                exists: true,
                message: "Utilizatorul există.",
                foundBy: "email"
            };
        }
    }

    // Dacă utilizatorul nu este găsit nici după telefon, nici după email
    return {
        exists: false,
        message: "Utilizatorul nu există."
    };
}

async function updateEmail(uid, newEmail) {
    try {
        
        const isVerified = await isUserEmailVerified(uid);
        if (isVerified) {
            throw new Error("Emailul verificat nu poate fi modificat");
        }

        const result = await db.query(
            `UPDATE mod_dms_gen_sconn___users 
             SET email = $1 
             WHERE uid = $2
             RETURNING email`,
            [newEmail, uid]
        );

        return {
            success: true,
            message: "Email actualizat cu succes",
            email: result.rows[0].email
        };


    } catch (error) {
        throw error;
    }
}
 




module.exports = {
    createUser,
    checkUserExistsByUid,
    getUserBasicInfo,
    getUserAdminLocations,
    checkUserExists,
    updateEmail
};
