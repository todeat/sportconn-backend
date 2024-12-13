// src/models/reservationModel.js
const db = require("../config/db");
const { getNextHalfHour } = require("../utils/functionUtils");
const { 
    getLocationIdByCourtId,
    isUserAdminOfLocation,
    getLocationSchedule,
    checkUserIsLoggedAndAdminOfLocation,
    getLocationPhoneNumber,
    getUserInfoByUid,
    getCourtInfoByCourtId,
    calculateReservationPrice
} = require("../utils/dbUtils");
const { parse, format, isToday } = require('date-fns');
const { getAllLocationInfo } = require("../utils/locationQueries");
const { notifyAdmins } = require("../notifications");


// În reservationModel.js, funcția getAvailableTimeSlots

async function getAvailableTimeSlots(data) {
    const { cityId, sportId, selectedDate, locationId, courtId, minDuration = 1, token } = data;

    try {
        let isAdminForLocation = false;
        let locationIds = [];
        let courtIds = [];

        // Verificăm admin status dacă avem locationId și token
        if (locationId && token) {
            try {
                await checkUserIsLoggedAndAdminOfLocation(token, locationId);
                isAdminForLocation = true;
            } catch (error) {
                console.error("Eroare verificare admin:", error.message);
            }
        }

        // Construim query pentru locații bazat pe parametrii disponibili
        if (courtId) {
            // Dacă avem courtId, obținem direct locationId asociat
            const courtResult = await db.query(
                'SELECT locationid FROM mod_dms_gen_sconn___courts WHERE id = $1',
                [courtId]
            );
            if (courtResult.rows.length > 0) {
                locationIds = [courtResult.rows[0].locationid];
                courtIds = [courtId];
            }
        } else {
            // Altfel, folosim cityId și/sau locationId pentru a găsi locațiile
            let locationQuery = 'SELECT id FROM mod_dms_gen_sconn___locations WHERE 1=1';
            const queryParams = [];
            
            if (cityId) {
                locationQuery += ` AND cityid = $${queryParams.length + 1}`;
                queryParams.push(cityId);
            }
            if (locationId) {
                locationQuery += ` AND id = $${queryParams.length + 1}`;
                queryParams.push(locationId);
            }
            if (!isAdminForLocation) {
                locationQuery += ' AND valid = true';
            }

            const locations = await db.query(locationQuery, queryParams);
            locationIds = locations.rows.map(location => location.id);

            if (locationIds.length > 0) {
                // Găsim terenurile disponibile
                let courtQuery = `
                    SELECT id, locationid, name 
                    FROM mod_dms_gen_sconn___courts 
                    WHERE inactiv = false AND locationid = ANY($1)
                `;
                const courtParams = [locationIds];

                if (sportId) {
                    courtQuery += ` AND sport = $2`;
                    courtParams.push(sportId);
                }

                const courts = await db.query(courtQuery, courtParams);
                courtIds = courts.rows.map(court => court.id);
            }
        }

        if (locationIds.length === 0 || courtIds.length === 0) {
            return [];
        }

        // Restul logicii rămâne neschimbată
        const schedules = await db.query(`
            SELECT locationid, orastart, oraend, isopen
            FROM mod_dms_gen_sconn___location_schedules
            WHERE locationid = ANY($1) AND dayofweek = EXTRACT(DOW FROM $2::date)
        `, [locationIds, selectedDate]);

        const reservations = await db.query(`
            SELECT courtid, 
                   dataorastart AS dataorastart,
                   dataoraend AS dataoraend
            FROM mod_dms_gen_sconn___calendar
            WHERE courtid = ANY($1) AND (
                (dataorastart::date = $2 OR dataoraend::date = $2)
            )
        `, [courtIds, selectedDate]);

        // Procesarea și returnarea rezultatelor rămâne aceeași ca în codul original
        const groupedResults = [];
        
        for (const locationId of locationIds) {
            const locationDetails = await getAllLocationInfo(locationId);
            if (!locationDetails.success) continue;

            const locationInfo = locationDetails.locationInfo;
            const courtsForLocation = await db.query(
                `SELECT 
                    c.id, 
                    c.name,
                    c.pricePerHour,
                    s.id AS sport_id,
                    s.name AS sport_name
                FROM 
                    mod_dms_gen_sconn___courts c
                JOIN 
                    mod_dms_gen_sconn___sports s ON c.sport = s.id
                WHERE 
                    c.locationid = $1 AND c.id = ANY($2)`,
                [locationId, courtIds]
            );

            const slotsPerLocation = courtsForLocation.rows.map(court => {
                const locationSchedule = schedules.rows.find(schedule => 
                    schedule.locationid === locationId
                );

                if (!locationSchedule || !locationSchedule.isopen) return null;

                const now = new Date();
                const isTodaySelected = selectedDate === format(now, 'yyyy-MM-dd');

                let openingTime = parse(
                    `${selectedDate} ${locationSchedule.orastart}`,
                    'yyyy-MM-dd HH:mm:ss',
                    new Date()
                );

                if (isTodaySelected) {
                    const nextHalfHour = getNextHalfHour(now);
                    if (nextHalfHour > openingTime) {
                        openingTime = nextHalfHour;
                    }
                }

                let closingTime = parse(
                    `${selectedDate} ${locationSchedule.oraend}`,
                    'yyyy-MM-dd HH:mm:ss',
                    new Date()
                );

                if (locationSchedule.orastart > locationSchedule.oraend) {
                    closingTime.setDate(closingTime.getDate() + 1);
                }

                const courtReservations = reservations.rows
                    .filter(res => res.courtid === court.id)
                    .map(res => ({
                        ...res,
                        dataorastart: new Date(res.dataorastart),
                        dataoraend: new Date(res.dataoraend)
                    }));

                const availableSlots = [];
                let currentStart = openingTime;
                courtReservations.sort((a, b) => a.dataorastart - b.dataorastart);

                courtReservations.forEach(reservation => {
                    if (reservation.dataorastart > currentStart) {
                        const durationHours = (reservation.dataorastart - currentStart) / (1000 * 60 * 60);
                        if (durationHours >= minDuration) {
                            availableSlots.push({
                                start: format(currentStart, 'yyyy-MM-dd HH:mm:ss'),
                                end: format(reservation.dataorastart, 'yyyy-MM-dd HH:mm:ss')
                            });
                        }
                    }
                    currentStart = reservation.dataoraend > currentStart ? reservation.dataoraend : currentStart;
                });

                if (currentStart < closingTime) {
                    const finalDurationHours = (closingTime - currentStart) / (1000 * 60 * 60);
                    if (finalDurationHours >= minDuration) {
                        availableSlots.push({
                            start: format(currentStart, 'yyyy-MM-dd HH:mm:ss'),
                            end: format(closingTime, 'yyyy-MM-dd HH:mm:ss')
                        });
                    }
                }

                return { 
                    courtId: court.id, 
                    courtName: court.name,
                    pricePerHour: court.priceperhour, 
                    sport: {
                        id: court.sport_id,
                        name: court.sport_name
                    },                
                    availableSlots };
            });

            groupedResults.push({
                locationInfo: {
                    id: locationInfo.id,
                    name: locationInfo.name,
                    description: locationInfo.description,
                    city: locationInfo.city,
                    address: locationInfo.address,
                    schedule: locationInfo.schedule,
                    phoneNumbers: locationInfo.phoneNumbers
                },
                availableSlots: slotsPerLocation.filter(slot => slot !== null)
            });
        }

        return {
            success: true,
            results: groupedResults
        };
    } catch (error) {
        console.error("Error in getAvailableTimeSlots:", error);
        throw error;
    }
}



async function saveReservation(data) {
    try {
        // Validate required input data
        if (!data.courtId || !data.userId || !data.dataOraStart || !data.dataOraEnd) {
            throw new Error("Datele de intrare sunt incomplete.");
        }

        const { courtId, userId, dataOraStart, dataOraEnd, name } = data;
        const dataRezervare = new Date().toISOString().slice(0, 19).replace('T', ' ');
        
        const totalPrice = await calculateReservationPrice(dataOraStart, dataOraEnd, courtId);

        // Check if start time is in the past
        const currentTime = Date.now();
        const startTime = new Date(dataOraStart).getTime();
        if (startTime < currentTime) {
            throw new Error("Ora de start a rezervării nu poate fi în trecut.");
        }

        // Calculate duration in hours
        const durata = (new Date(dataOraEnd).getTime() - new Date(dataOraStart).getTime()) / (3600 * 1000);

        // Check if end time is after start time
        if (new Date(dataOraEnd) <= new Date(dataOraStart)) {
            throw new Error("Ora end nu poate fi aleasa inainte de ora start.");
        }

        // Get locationId for this court
        const locationId = await getLocationIdByCourtId(courtId);
        if (!locationId) {
            throw new Error("Terenul specificat nu există.");
        }

        const schedule = await getLocationSchedule(locationId, dataOraStart);
        if (!schedule.isOpen) {
            throw new Error("Locația este închisă în ziua selectată.");
        }
        function timeToMinutes(timeString) {
            const [hours, minutes] = timeString.split(':').map(Number);
            return hours * 60 + minutes;
        }
        
        function adjustTimeForMidnight(timeString, referenceTime) {
            let minutes = timeToMinutes(timeString);
            // Dacă ora de program este mai mică decât referința (ex: 01:00 < 23:00)
            // înseamnă că trecem peste miezul nopții, așa că adăugăm 24 de ore
            if (minutes < timeToMinutes(referenceTime)) {
                minutes += 24 * 60;
            }
            return minutes;
        }
        
        const reservationStartTime = new Date(dataOraStart).toTimeString().slice(0, 8);
        const reservationEndTime = new Date(dataOraEnd).toTimeString().slice(0, 8);
        
        // Convertim toți timpii în minute
        const startMinutes = timeToMinutes(reservationStartTime);
        const endMinutes = adjustTimeForMidnight(reservationEndTime, reservationStartTime);
        const locationStartMinutes = timeToMinutes(schedule.oraStart);
        const locationEndMinutes = adjustTimeForMidnight(schedule.oraEnd, schedule.oraStart);
        
        // Verificăm dacă rezervarea se încadrează în program
        const isStartValid = startMinutes >= locationStartMinutes;
        const isEndValid = endMinutes <= locationEndMinutes;
        
        if (!isStartValid || !isEndValid) {
            throw new Error(`Rezervarea trebuie să fie în intervalul orar al locației: ${schedule.oraStart} - ${schedule.oraEnd}`);
        }

        // Check if user is admin for this location using the utility function
        const isAdmin = await isUserAdminOfLocation(userId, locationId);

        // Check for overlapping reservations if user is not admin
        if (!isAdmin) {
            const hasOverlap = await _verificaSuprapunereRezervariUtilizator(userId, dataOraStart, dataOraEnd);
            if (hasOverlap) {
                throw new Error("Există o suprapunere cu o altă rezervare existentă.");
            }
        }

        // Check court availability
        const isUnavailable = await _verificaDispoPeCourtIdDSDE({
            courtId,
            dataOraStart,
            dataOraEnd
        });
        
        if (isUnavailable) {
            throw new Error("Terenul nu este disponibil în intervalul selectat.");
        }

        // Insert reservation
        const result = await db.query(
            `INSERT INTO mod_dms_gen_sconn___calendar 
             (dataOraStart, dataOraEnd, courtId, dataRezervare, durata, userId, name, isAdminReservation, totalPrice)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id`,
            [dataOraStart, dataOraEnd, courtId, dataRezervare, durata, userId, name, isAdmin, totalPrice]
        );

        if (!isAdmin) {
            // Obținem informațiile despre utilizator și teren
            const [userInfo, courtInfo] = await Promise.all([
                getUserInfoByUid(data.userId),
                getCourtInfoByCourtId(data.courtId)
            ]);

            if (!userInfo) {
                throw new Error("Nu s-au putut găsi informațiile despre utilizator");
            }

            if (!courtInfo) {
                throw new Error("Nu s-au putut găsi informațiile despre teren");
            }

            // Trimitem notificare către admini doar dacă nu e rezervare de admin
            notifyAdmins(db, 'newReservation', {
                locationId: courtInfo.location_id,
                locationName: courtInfo.location_name,
                courtName: courtInfo.court_name,
                sportName: courtInfo.sport_name,
                startTime: data.dataOraStart,
                endTime: data.dataOraEnd,
                clientName: `${userInfo.firstname} ${userInfo.lastname}`,
                clientPhone: userInfo.phonenumber,
                totalPrice: totalPrice
            }).catch(error => {
                console.error('Failed to send notification:', error);
            });
        }

        return {
            success: true,
            rezervareId: result.rows[0].id,
            totalPrice: totalPrice
        };
    } catch (error) {
        throw error;
    }
}

async function getUserReservations(uid, isAdmin = false) {
    try {
        const currentDateTime = new Date().toISOString();
        
        // Base query for user reservations
        const sql = `
            SELECT 
                cal.id AS "reservationId",
                cal.dataOraStart AS "dataOraStart",
                cal.dataOraEnd AS "dataOraEnd",
                cal.durata,
                cal.isAdminReservation,
                cal.totalprice AS "totalPrice",
                c.name AS "courtName",
                l.id AS "locationId",
                l.name AS "locationName",
                s.name AS "sportName",
                cit.name AS "cityName",
                (
                    SELECT phoneNumber 
                    FROM mod_dms_gen_sconn___admin_locations 
                    WHERE locationId = l.id 
                    AND role = 'admin' 
                    LIMIT 1
                ) AS "phoneNumber",
                CASE 
                    WHEN cal.dataOraStart > $1 THEN 'upcoming'
                    ELSE 'last'
                END AS "reservationType"
            FROM 
                mod_dms_gen_sconn___calendar cal
            JOIN 
                mod_dms_gen_sconn___courts c ON cal.courtId = c.id
            JOIN 
                mod_dms_gen_sconn___locations l ON c.locationId = l.id
            JOIN 
                mod_dms_gen_sconn___sports s ON c.sport = s.id
            JOIN 
                mod_dms_gen_sconn___cities cit ON l.cityId = cit.id
            WHERE 
                cal.userId = $2
                AND cal.isAdminReservation = false
            ORDER BY 
                cal.dataOraStart ASC
        `;

        const result = await db.query(sql, [currentDateTime, uid]);
        
        if (result.rows.length === 0) {
            return {
                success: false,
                message: "Nu s-au găsit rezervări pentru acest utilizator.",
                upcoming_reservations: [],
                last_reservations: []
            };
        }

        const upcoming_reservations = [];
        const last_reservations = [];

        // Process reservations
        for (const row of result.rows) {
            const reservation = {
                reservationId: row.reservationId,
                dataOraStart: row.dataOraStart,
                dataOraEnd: row.dataOraEnd,
                durata: row.durata,
                courtName: row.courtName,
                locationName: row.locationName,
                sportName: row.sportName,
                cityName: row.cityName,
                totalPrice: row.totalPrice,
                phoneNumber: row.phoneNumber || null
            };

            if (row.reservationType === 'upcoming') {
                upcoming_reservations.unshift(reservation);
            } else if (last_reservations.length < 5) {
                last_reservations.push(reservation);
            }
        }

        const response = {
            success: true,
            upcoming_reservations,
            last_reservations
        };

        // If user is admin, add admin reservations
        if (isAdmin) {
            const adminSql = `
                SELECT 
                    cal.id AS "reservationId",
                    cal.dataOraStart AS "dataOraStart",
                    cal.dataOraEnd AS "dataOraEnd",
                    cal.durata,
                    cal.totalprice AS "totalPrice",
                    c.name AS "courtName",
                    l.name AS "locationName",
                    s.name AS "sportName",
                    cit.name AS "cityName",
                    (
                        SELECT phoneNumber 
                        FROM mod_dms_gen_sconn___admin_locations 
                        WHERE locationId = l.id 
                        AND role = 'admin' 
                        LIMIT 1
                    ) AS "phoneNumber"
                FROM 
                    mod_dms_gen_sconn___calendar cal
                JOIN 
                    mod_dms_gen_sconn___courts c ON cal.courtId = c.id
                JOIN 
                    mod_dms_gen_sconn___locations l ON c.locationId = l.id
                JOIN 
                    mod_dms_gen_sconn___sports s ON c.sport = s.id
                JOIN 
                    mod_dms_gen_sconn___cities cit ON l.cityId = cit.id
                WHERE 
                    cal.userId = $1
                    AND cal.isAdminReservation = true
                    AND cal.dataOraStart > $2
                ORDER BY 
                    cal.dataOraStart ASC
            `;

            const adminResult = await db.query(adminSql, [uid, currentDateTime]);
            
            response.admin_upcoming_reservations = adminResult.rows.map(row => ({
                reservationId: row.reservationId,
                dataOraStart: row.dataOraStart,
                dataOraEnd: row.dataOraEnd,
                durata: row.durata,
                courtName: row.courtName,
                locationName: row.locationName,
                totalPrice: row.totalPrice,
                sportName: row.sportName,
                cityName: row.cityName,
                phoneNumber: row.phoneNumber || null
            }));
        }

        return response;

    } catch (error) {
        console.error("Error in getUserReservations:", error);
        throw error;
    }
}

async function deleteReservation(reservationId) {
    try {
        const sql = `
            DELETE FROM mod_dms_gen_sconn___calendar 
            WHERE id = $1 
            RETURNING id
        `;
        
        const result = await db.query(sql, [reservationId]);
        
        if (result.rowCount === 0) {
            return {
                success: false,
                message: "Rezervarea nu a putut fi ștearsă sau nu există."
            };
        }

        return {
            success: true,
            message: "Rezervarea a fost ștearsă cu succes."
        };
    } catch (error) {
        console.error("Error in deleteReservation:", error);
        throw error;
    }
}

async function getReservationInfo(reservationId) {
    try {
        const sql = `
            SELECT 
                cal.id AS "reservationId",
                cal.userId,
                cal.courtId,
                c.locationId
            FROM 
                mod_dms_gen_sconn___calendar cal
            JOIN 
                mod_dms_gen_sconn___courts c ON cal.courtId = c.id
            WHERE 
                cal.id = $1
        `;
        
        const result = await db.query(sql, [reservationId]);
        return result.rows[0] || null;
    } catch (error) {
        console.error("Error in getReservationInfo:", error);
        throw error;
    }
}


async function getReservationsByCitySportDate(city, sport, date, options = {}) {
    try {
        // Validate required parameters
        if (!city || !sport || !date) {
            throw new Error("City, sport and date are required parameters");
        }

        let params = [city, sport, date];
        let paramCount = 3;

        let sql = `
        SELECT 
            cal.id AS "reservationId",
            cal.dataOraStart,
            cal.dataOraEnd,
            cal.durata,
            cal.name AS "reservationName",
            c.name AS "courtName",
            l.name AS "locationName",
            l.id AS "locationId",
            c.id AS "courtId",
            cit.name AS "cityName"
        FROM 
            mod_dms_gen_sconn___calendar cal
        JOIN 
            mod_dms_gen_sconn___courts c ON cal.courtId = c.id
        JOIN 
            mod_dms_gen_sconn___locations l ON c.locationId = l.id
        JOIN 
            mod_dms_gen_sconn___cities cit ON l.cityId = cit.id
        JOIN 
            mod_dms_gen_sconn___sports s ON c.sport = s.id
        WHERE 
            cit.name = $1
            AND s.name = $2
            AND DATE(cal.dataOraStart) = $3
        `;

        // Add optional locationId filter
        if (options.locationId) {
            paramCount++;
            sql += ` AND l.id = $${paramCount}`;
            params.push(options.locationId);
        }

        // Add optional courtId filter
        if (options.courtId) {
            paramCount++;
            sql += ` AND c.id = $${paramCount}`;
            params.push(options.courtId);
        }

        // Only show reservations from valid locations unless specified otherwise
        if (!options.includeInvalidLocations) {
            sql += ` AND l.valid = true`;
        }

        sql += ` ORDER BY cal.dataOraStart ASC`;

        const result = await db.query(sql, params);

        return {
            success: true,
            count: result.rows.length,
            reservations: result.rows
        };

    } catch (error) {
        console.error("Error in getReservationsByCitySportDate:", error);
        throw error;
    }
}



async function _verificaSuprapunereRezervariUtilizator(userId, dataOraStartDorita, dataOraEndDorita) {
    const dataDorita = new Date(dataOraStartDorita).toISOString().slice(0, 10);

    // Check if user has any reservations on the desired date
    const countResult = await db.query(
        `SELECT COUNT(*) as "numarRezervari"
         FROM mod_dms_gen_sconn___calendar 
         WHERE userId = $1 
         AND DATE(dataOraStart) = $2
         AND isAdminReservation = false`,
        [userId, dataDorita]
    );

    if (parseInt(countResult.rows[0].numarRezervari) === 0) {
        return false;
    }

    // Check for overlapping reservations
    const overlapResult = await db.query(
        `SELECT * 
         FROM mod_dms_gen_sconn___calendar 
         WHERE userId = $1 
         AND DATE(dataOraStart) = $2
         AND isAdminReservation = false
         AND (
             (dataOraStart < $3 AND dataOraEnd > $3) OR 
             (dataOraStart < $4 AND dataOraEnd > $4) OR
             (dataOraStart > $3 AND dataOraEnd < $4) OR 
             (dataOraStart = $3 AND dataOraEnd = $4)
         )`,
        [userId, dataDorita, dataOraStartDorita, dataOraEndDorita]
    );

    return overlapResult.rows.length > 0;
}

async function _verificaDispoPeCourtIdDSDE(data) {
    const { courtId, dataOraStart, dataOraEnd } = data;

    const result = await db.query(
        `SELECT COUNT(*) as conflicting_reservations
         FROM mod_dms_gen_sconn___calendar
         WHERE courtId = $1
         AND (
             (dataOraStart < $2 AND dataOraEnd > $2) OR 
             (dataOraStart < $3 AND dataOraEnd > $3) OR
             (dataOraStart > $2 AND dataOraEnd < $3) OR 
             (dataOraStart = $2 AND dataOraEnd = $3)
         )`,
        [courtId, dataOraStart, dataOraEnd]
    );

    return parseInt(result.rows[0].conflicting_reservations) > 0;
}



module.exports = {
    getAvailableTimeSlots,
    saveReservation,
    getUserReservations,
    deleteReservation,
    getReservationInfo
};