// src/utils/userUtils.js
const db = require("../config/db");
const admin = require('../config/firebase');



// Funcție pentru generarea unui username unic
async function generateUniqueUsername(baseUsername) {
    let username = baseUsername;
    let suffix = 1;

    while (true) {
        const checkSql = `SELECT COUNT(*) as count FROM mod_dms_gen_sconn___users WHERE username = $1`;
        const { rows } = await db.query(checkSql, [username]);
        
        if (rows[0].count === "0") break;  // Username este unic
        username = `${baseUsername}${suffix++}`;  // Adaugă un sufix dacă există duplicate
    }

    return username;
}

async function getPhoneNumberByUid(uid) {
    const result = await db.query("SELECT phoneNumber FROM mod_dms_gen_sconn___users WHERE uid = $1", [uid]);
    return result.rows[0]?.phonenumber || null;
}

async function getCityIdByName(city) {
    const result = await db.query("SELECT id FROM mod_dms_gen_sconn___cities WHERE name = $1", [city]);
    return result.rows[0]?.id || null;
}

async function getSportIdByName(sport) {
    const result = await db.query("SELECT id FROM mod_dms_gen_sconn___sports WHERE name = $1", [sport]);
    return result.rows[0]?.id || null;
}

async function getCityIdByLocationId(locationId) {
    if (!locationId) {
        throw new Error("LocationId este obligatoriu");
    }

    const result = await db.query(
        `SELECT 
            cit.id AS cityid
         FROM 
            mod_dms_gen_sconn___locations l
         LEFT JOIN 
            mod_dms_gen_sconn___cities cit ON l.cityId = cit.id
         WHERE 
            l.id = $1`,
        [locationId]
    );

    return result.rows[0]?.cityid || null;
}

async function checkUserIsLoggedAndAdminOfLocation(idToken, locationId) {
    if (!idToken || !locationId) {
        throw new Error("Token-ul și locationId sunt obligatorii");
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const result = await db.query(
            `SELECT id 
             FROM mod_dms_gen_sconn___admin_locations 
             WHERE uid = $1 AND locationId = $2`,
            [uid, locationId]
        );

        if (result.rows.length === 0) {
            throw new Error("Utilizatorul nu este administrator pentru această locație");
        }

        return {
            isValid: true,
            uid: uid,
            locationId: locationId
        };

    } catch (error) {
        if (error.code === 'auth/id-token-expired') {
            throw new Error("Token-ul a expirat");
        } else if (error.code === 'auth/invalid-id-token') {
            throw new Error("Token invalid");
        }
        throw error;
    }
}

async function isUserAdminOfLocation(uid, locationId) {
    try {
        if (!uid || !locationId) {
            throw new Error("UID și locationId sunt obligatorii");
        }

        const result = await db.query(
            `SELECT EXISTS (
                SELECT 1 
                FROM mod_dms_gen_sconn___admin_locations 
                WHERE uid = $1 
                AND locationId = $2
                AND role = 'admin'
            ) as "isAdmin"`,
            [uid, locationId]
        );

        return result.rows[0]?.isAdmin || false; 
    } catch (error) {
        console.error("Error in isUserAdminOfLocation:", error);
        throw error;
    }
}

async function isUserAdmin(uid) {
    try {
        if (!uid) {
            throw new Error("UID este obligatoriu");
        }

        const result = await db.query(
            `SELECT EXISTS (
                SELECT 1 
                FROM mod_dms_gen_sconn___admin_locations 
                WHERE uid = $1 
                AND role = 'admin'
            ) as "isAdmin"`,
            [uid]
        );

        return result.rows[0]?.isAdmin || false;
    } catch (error) {
        console.error("Error in isUserAdmin:", error);
        throw error;
    }
}

async function getLocationIdByCourtId(courtId) {
    if (!courtId) {
        throw new Error("CourtId este obligatoriu");
    }

    const result = await db.query(
        "SELECT locationId FROM mod_dms_gen_sconn___courts WHERE id = $1",
        [courtId]
    );

    return result.rows[0]?.locationid || null;
}


async function getCourtsByLocationId(locationId) {
    const sql = `
        SELECT 
            c.id, 
            c.name, 
            s.name AS sportName
        FROM 
            mod_dms_gen_sconn___courts c
        JOIN 
            mod_dms_gen_sconn___sports s ON c.sport = s.id
        WHERE 
            c.locationId = $1
    `;
    
    const result = await db.query(sql, [locationId]);
    return result.rows;
}


async function getLocationSchedule(locationId, date) {
    try {
        if (!locationId || !date) {
            throw new Error("LocationId și data sunt obligatorii");
        }

        // Convertim data într-un obiect Date
        const dateObj = new Date(date);
        
        // Obținem ziua săptămânii (0 = Duminică, 1 = Luni, ..., 6 = Sâmbătă)
        const dayOfWeek = dateObj.getDay();

        const query = `
            SELECT orastart, oraend, isopen
            FROM mod_dms_gen_sconn___location_schedules
            WHERE locationid = $1 AND dayofweek = $2;
        `;

        const result = await db.query(query, [locationId, dayOfWeek]);

        if (result.rows.length === 0) {
            throw new Error("Nu s-a găsit program pentru această zi");
        }

        if (!result.rows[0].isopen) {
            return {
                isOpen: false,
                message: "Locația este închisă în această zi"
            };
        }

        return {
            isOpen: true,
            oraStart: result.rows[0].orastart,
            oraEnd: result.rows[0].oraend
        };

    } catch (error) {
        console.error("Error in getLocationSchedule:", error);
        throw error;
    }
}

async function getLocationPhoneNumber(locationId) {
    try {
        if (!locationId) {
            throw new Error("LocationId este obligatoriu");
        }

        const result = await db.query(
            `SELECT DISTINCT phoneNumber 
             FROM mod_dms_gen_sconn___admin_locations 
             WHERE locationId = $1 
             AND role = 'admin' 
             LIMIT 1`,
            [locationId]
        );

        return result.rows[0]?.phonenumber || null;
    } catch (error) {
        console.error("Error in getLocationPhoneNumber:", error);
        throw error;
    }
}



async function getUserEmailByUid(uid) {
    try {
        const result = await db.query(
            `SELECT email 
             FROM mod_dms_gen_sconn___users 
             WHERE uid = $1`,
            [uid]
        );

        if (result.rows.length === 0) {
            throw new Error("Utilizatorul nu a fost găsit");
        }

        return result.rows[0].email;
    } catch (error) {
        console.error("Error in getUserEmailByUid:", error);
        throw error;
    }
}

async function isUserEmailVerified(uid) {
    try {
        const result = await db.query(
            `SELECT is_verified 
             FROM mod_dms_gen_sconn___email_verifications 
             WHERE uid = $1`,
            [uid]
        );

        return result.rows.length > 0 && result.rows[0].is_verified;
    } catch (error) {
        console.error("Error in isUserEmailVerified:", error);
        throw error;
    }
}

async function getAdminEmails(db, locationId) {
    const result = await db.query(`
        SELECT DISTINCT u.email
        FROM mod_dms_gen_sconn___admin_locations al
        JOIN mod_dms_gen_sconn___users u ON al.uid = u.uid
        WHERE al.locationId = $1 AND al.role = 'admin'
    `, [locationId]);
    
    return result.rows.map(row => row.email);
}

async function getCourtInfoByCourtId(courtId) {
    const result = await db.query(
        `SELECT 
            c.name AS court_name, 
            l.name AS location_name, 
            l.id AS location_id,
            s.name AS sport_name
         FROM mod_dms_gen_sconn___courts c
         JOIN mod_dms_gen_sconn___locations l ON c.locationId = l.id
         JOIN mod_dms_gen_sconn___sports s ON c.sport = s.id
         WHERE c.id = $1`,
        [courtId]
    );
    
    return result.rows[0] || null;
}


async function getUserInfoByUid(uid) {
    const result = await db.query(
        `SELECT firstName, lastName, phoneNumber, email
         FROM mod_dms_gen_sconn___users
         WHERE uid = $1`,
        [uid]
    );
    
    return result.rows[0] || null;
}

async function getCourtPricePerHour(courtId) {
    try {
        const result = await db.query(
            `SELECT pricePerHour 
             FROM mod_dms_gen_sconn___courts 
             WHERE id = $1`,
            [courtId]
        );

        if (result.rows.length === 0) {
            throw new Error("Terenul nu a fost găsit");
        }

        return parseFloat(result.rows[0].priceperhour);
    } catch (error) {
        console.error("Error in getCourtPricePerHour:", error);
        throw error;
    }
}

async function calculateReservationPrice(dataOraStart, dataOraEnd, courtId) {
    try {
        const pricePerHour = await getCourtPricePerHour(courtId);
        
        // Calculăm diferența în ore
        const startTime = new Date(dataOraStart);
        const endTime = new Date(dataOraEnd);
        const durationHours = (endTime - startTime) / (1000 * 60 * 60);
        
        // Calculăm prețul total
        const totalPrice = pricePerHour * durationHours;
        
        return parseFloat(totalPrice.toFixed(2)); // Rotunjim la 2 zecimale
    } catch (error) {
        console.error("Error in calculateReservationPrice:", error);
        throw error;
    }
}

async function hasPendingLocation(uid) {
    try {
        const result = await db.query(
            `SELECT COUNT(*) as count
             FROM mod_dms_gen_sconn___pending_locations pl
             WHERE pl.uid = $1 AND pl.status = 'pending'`,
            [uid]
        );
        
        return result.rows[0].count > 0;
    } catch (error) {
        console.error("Error in hasPendingLocation:", error);
        throw error;
    }
}


module.exports = {
    generateUniqueUsername,
    getPhoneNumberByUid,
    getCityIdByName,
    getSportIdByName,
    checkUserIsLoggedAndAdminOfLocation,
    getCityIdByLocationId,
    getLocationIdByCourtId,
    isUserAdminOfLocation,
    getCourtsByLocationId,
    getLocationSchedule,
    getLocationPhoneNumber,
    isUserAdmin,
    getUserEmailByUid,
    isUserEmailVerified,
    getAdminEmails,
    getCourtInfoByCourtId,
    getUserInfoByUid,
    calculateReservationPrice,
    hasPendingLocation
};
