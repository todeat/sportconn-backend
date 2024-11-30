// src/models/locationModel.js
const db = require("../config/db");
const { getCityIdByName, getCourtsByLocationId } = require("../utils/dbUtils");
const { getPhoneNumberByUid } = require("../utils/dbUtils");
const { getSportIdByName } = require("../utils/dbUtils");
const { addCourt } = require("./courtModel");
const courtModel = require('./courtModel');
const reservationModel = require("./reservationModel");
const { combineScheduleData } = require("../utils/functionUtils");
const { getAllLocationInfo } = require("../utils/locationQueries");


// Funcție pentru obținerea terenurilor asociate unei locații

//rest
async function toggleLocationValidation(data) {
    const { locationId, uid } = data;

    try {
        // Verifică dacă locația este în pending
        const isPending = await isLocationPending(locationId);
        if (isPending) {
            return {
                success: false,
                message: "Locația nu are statusul valid în tabela pending."
            };
        }

        // Obține starea curentă a locației
        const currentStateResult = await db.query(
            `SELECT valid 
             FROM mod_dms_gen_sconn___locations 
             WHERE id = $1`,
            [locationId]
        );

        if (currentStateResult.rows.length === 0) {
            return {
                success: false,
                message: "Eroare la obținerea stării curente a locației."
            };
        }

        // Inversează starea
        const currentState = currentStateResult.rows[0].valid;
        const newState = !currentState;

        // Actualizează starea în baza de date
        const updateResult = await db.query(
            `UPDATE mod_dms_gen_sconn___locations 
             SET valid = $1 
             WHERE id = $2 
             RETURNING id`,
            [newState, locationId]
        );

        if (updateResult.rows.length === 0) {
            return {
                success: false,
                message: "Eroare la actualizarea stării locației."
            };
        }

        const stateMessage = newState ? "activată" : "dezactivată";
        return {
            success: true,
            message: `Locația a fost ${stateMessage} cu succes.`,
            newState: newState
        };

    } catch (error) {
        console.error("Error in toggleLocationValidation:", error);
        throw error;
    }
}

//rest
async function addLocationPending(uid, data) {
    const { locationInfo, courtsInfo } = data;

    // Validăm prezența programului
    if (!locationInfo.schedule || !Array.isArray(locationInfo.schedule) || locationInfo.schedule.length !== 7) {
        throw new Error("Programul locației este obligatoriu și trebuie să conțină date pentru toate zilele săptămânii");
    }

    const cityId = await getCityIdByName(locationInfo.city);
    if (!cityId) {
        throw new Error("Oraș invalid.");
    }

    const sportIds = [];
    for (const court of courtsInfo) {
        const sportId = await getSportIdByName(court.sport);
        if (!sportId) {
            throw new Error(`Sport invalid: ${court.sport}`);
        }
        sportIds.push(sportId);
    }

    const phoneNumber = await getPhoneNumberByUid(uid);
    const currentDateTime = new Date().toISOString();

    // Inserăm locația
    const locationId = await addLocation({
        name: locationInfo.locationName,
        lat: locationInfo.lat,
        lng: locationInfo.lng,
        cityId,
        address: locationInfo.address
    });

    if (!locationId) {
        throw new Error("Eroare la inserarea locației.");
    }

    // Adăugăm programul locației
    await addLocationSchedule(locationId, locationInfo.schedule);

    // Inserăm în admin_locations
    const adminLocationResult = await db.query(
        `INSERT INTO mod_dms_gen_sconn___admin_locations (uid, locationId, phoneNumber, role)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [uid, locationId, phoneNumber, "admin"]
    );

    // Inserăm în pending_locations
    const pendingResult = await db.query(
        `INSERT INTO mod_dms_gen_sconn___pending_locations 
         (locationName, address, lat, lng, uid, phoneNumber, status, dateAdded, locationId)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8) RETURNING id`,
        [
            locationInfo.locationName,
            locationInfo.address,
            locationInfo.lat,
            locationInfo.lng,
            uid,
            phoneNumber,
            currentDateTime,
            locationId
        ]
    );

    // Inserăm terenurile
    const courtIds = [];
    for (const [index, court] of courtsInfo.entries()) {
        const courtId = await addCourt({
            locationId,
            name: court.name,
            sport: sportIds[index],
            covered: court.covered,
            cityId,
            pricePerHour: court.pricePerHour
        });

        if (!courtId) {
            throw new Error(`Eroare la inserarea terenului: ${court.name}`);
        }

        courtIds.push(courtId);
    }

    return {
        success: true,
        message: "Locația, programul și terenurile au fost adăugate cu succes.",
        locationId,
        courtIds,
        adminLocationId: adminLocationResult.rows[0]?.id,
        pendingId: pendingResult.rows[0]?.id
    };
}

//rest
async function getLocationInfo(locationId) {
    
    const locationInfo = await getAllLocationInfo(locationId);

    if (!locationInfo) {
        throw new Error("Locația nu a fost găsită.");
    }

    return locationInfo;

}


//rest
async function getLocationCourts(locationId) {
    const result = await db.query(
        `SELECT 
            s.name AS sport,
            c.name,
            c.covered,
            c.pricePerHour,
            c.id AS courtId
        FROM 
            mod_dms_gen_sconn___courts c
        JOIN 
            mod_dms_gen_sconn___sports s ON c.sport = s.id
        WHERE 
            c.locationId = $1
        GROUP BY 
            s.name, c.name, c.covered, c.pricePerHour, c.id`,
        [locationId]
    );
    return result.rows;
}


async function getLocationSchedule(data) {
    try {
        const { locationId, selectedDate, token } = data;

        if (!locationId || !selectedDate || !token) {
            throw new Error("LocationId, data și token sunt obligatorii.");
        }

        const availabilityData = await reservationModel.getAvailableTimeSlots({
            locationId,
            selectedDate,
            token
        });

        const availableCourtData = availabilityData.results[0].availableSlots;



        const reservationsData = await getLocationReservations({
            locationId,
            date: selectedDate
        });


        const reservations = reservationsData.success ? reservationsData.reservations : [];

        schedule = combineScheduleData(
            availableCourtData,
            reservations, 
            selectedDate
        );

        return {
            success: true,
            date: selectedDate,
            schedule
        };


    }
    catch (error) {
        console.error("Error in getLocationSchedule:", error);
        throw error;
    }
}


//rest
async function handleLocationEdit(locationId, edits) {
    const response = {
        success: true,
        locationUpdates: [],
        courtsUpdates: [],
        errors: []
    };

    try {
        // Procesează editările locației
        if (edits.location && Object.keys(edits.location).length > 0) {
            const locationResult = await updateLocationProperties(locationId, edits.location);
            response.locationUpdates = locationResult.updatedProperties;
            response.errors = [...response.errors, ...locationResult.errors];
        }

        // Procesează editările terenurilor
        if (edits.courts && edits.courts.length > 0) {
            for (const court of edits.courts) {
                if (!court.courtId || !court.properties) {
                    response.errors.push("Date invalide pentru un teren.");
                    continue;
                }

                const courtId = parseInt(court.courtId);
                
                // Verifică dacă terenul aparține locației
                const belongsToLocation = await courtModel.isCourtBelongToLocation(courtId, locationId);
                if (!belongsToLocation) {
                    response.errors.push(`Terenul cu ID ${courtId} nu aparține acestei locații.`);
                    continue;
                }

                const courtResult = await courtModel.updateCourtProperties(courtId, court.properties);
                if (courtResult.updatedProperties.length > 0) {
                    response.courtsUpdates.push({
                        courtId,
                        updatedProperties: courtResult.updatedProperties
                    });
                }
                response.errors = [...response.errors, ...courtResult.errors];
            }
        }

        response.success = response.locationUpdates.length > 0 || response.courtsUpdates.length > 0;
        return response;

    } catch (error) {
        console.error("Error in handleLocationEdit:", error);
        throw error;
    }
}


async function addLocationSchedule(locationId, scheduleData) {
    try {
        // Validăm datele de intrare
        if (!Array.isArray(scheduleData) || scheduleData.length !== 7) {
            throw new Error("Programul trebuie să conțină date pentru toate cele 7 zile ale săptămânii");
        }

        // Validăm fiecare intrare din program
        scheduleData.forEach(schedule => {
            if (!schedule.hasOwnProperty('dayOfWeek') || 
                !schedule.hasOwnProperty('oraStart') || 
                !schedule.hasOwnProperty('oraEnd') || 
                !schedule.hasOwnProperty('isOpen')) {
                throw new Error("Date invalide în program");
            }

            if (schedule.dayOfWeek < 0 || schedule.dayOfWeek > 6) {
                throw new Error("Zi invalidă în program");
            }

            // Validăm formatul orei (HH:MM)
            const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timeRegex.test(schedule.oraStart) || !timeRegex.test(schedule.oraEnd)) {
                throw new Error("Format invalid pentru ore");
            }
        });

        // Inserăm programul în baza de date
        const insertPromises = scheduleData.map(schedule => 
            db.query(
                `INSERT INTO mod_dms_gen_sconn___location_schedules 
                 (locationId, dayOfWeek, oraStart, oraEnd, isOpen)
                 VALUES ($1, $2, $3, $4, $5)`,
                [locationId, schedule.dayOfWeek, schedule.oraStart, schedule.oraEnd, schedule.isOpen]
            )
        );

        await Promise.all(insertPromises);
        return true;
    } catch (error) {
        console.error("Error in addLocationSchedule:", error);
        throw error;
    }
}

async function updateLocationProperties(locationId, properties) {
    const allowedProperties = ['name', 'oraStart', 'oraEnd', 'address', 'description'];
    const result = {
        updatedProperties: [],
        errors: []
    };

    for (const [property, value] of Object.entries(properties)) {
        if (!allowedProperties.includes(property)) {
            result.errors.push(`Proprietatea ${property} nu este permisă pentru actualizare.`);
            continue;
        }

        // Validare pentru proprietățile de tip oră
        if ((property === 'oraStart' || property === 'oraEnd') && 
            !value.match(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
            result.errors.push(`Formatul orei pentru ${property} este invalid. Folosiți formatul HH:MM.`);
            continue;
        }

        try {
            const updateResult = await db.query(
                `UPDATE mod_dms_gen_sconn___locations 
                 SET ${property} = $1 
                 WHERE id = $2 
                 RETURNING id`,
                [value, locationId]
            );

            if (updateResult.rows.length > 0) {
                result.updatedProperties.push(property);
            } else {
                result.errors.push(`Eroare la actualizarea proprietății ${property}.`);
            }
        } catch (error) {
            result.errors.push(`Eroare la actualizarea proprietății ${property}: ${error.message}`);
        }
    }

    return result;
}


async function isLocationPending(locationId) {
    const result = await db.query(
        `SELECT COUNT(*) as count 
         FROM mod_dms_gen_sconn___pending_locations 
         WHERE locationId = $1 
         AND status = 'pending'`,
        [locationId]
    );
    return result.rows[0].count > 0;
}

async function addLocation(data) {
    const result = await db.query(
        `INSERT INTO mod_dms_gen_sconn___locations 
         (name, lat, lng, cityId, address, valid)
         VALUES ($1, $2, $3, $4, $5, false) 
         RETURNING id`,
        [data.name, data.lat, data.lng, data.cityId, data.address]
    );
    return result.rows[0]?.id || null;
}


async function getLocationReservations({ locationId, date = new Date().toISOString().slice(0, 10), courtId = null }) {
    const params = [locationId, date];
    
    // Mai întâi setăm timezone-ul sesiunii
    // await db.query("SET timezone='Europe/Bucharest';");
    
    let sql = `
        SELECT 
            cal.id AS "reservationId",
            to_char(cal.dataOraStart, 'YYYY-MM-DD HH24:MI:SS') AS "dataOraStart",
            to_char(cal.dataOraEnd, 'YYYY-MM-DD HH24:MI:SS') AS "dataOraEnd",
            cal.userId,
            cal.datarezervare,
            cal.courtid,
            cal.name AS "reservationName",
            cal.durata,
            cal.abonamentId,
            c.name AS "courtName",
            s.name AS "sportName",
            u.firstName,
            u.lastName,
            u.phoneNumber,
            u.email
        FROM 
            mod_dms_gen_sconn___calendar cal
        JOIN 
            mod_dms_gen_sconn___courts c ON cal.courtId = c.id
        JOIN 
            mod_dms_gen_sconn___sports s ON c.sport = s.id
        LEFT JOIN 
            mod_dms_gen_sconn___users u ON cal.userId = u.uid
        WHERE 
            c.locationId = $1
            AND DATE(cal.dataOraStart) = $2
    `;

    if (courtId) {
        sql += ` AND cal.courtId = $3`;
        params.push(courtId);
    }

    sql += ` ORDER BY cal.dataOraStart ASC`;

    const result = await db.query(sql, params);

    if (result.rows.length === 0) {
        const message = courtId
            ? `Nu s-au găsit rezervări pentru terenul specificat la data de ${date}.`
            : `Nu s-au găsit rezervări pentru această locație la data de ${date}.`;
        return {
            success: false,
            message
        };
    }

    const formattedReservations = result.rows.map(reservation => ({
        reservationId: reservation.reservationId,
        startTime: reservation.dataOraStart,
        endTime: reservation.dataOraEnd,          
        duration: reservation.durata,
        courtId: reservation.courtid,
        courtName: reservation.courtName,
        sportName: reservation.sportName,
        reservationName: reservation.reservationName,
        user: {
            userId: reservation.userid,
            name: `${reservation.firstname || ''} ${reservation.lastname || ''}`.trim(),
            phoneNumber: reservation.phonenumber,
            email: reservation.email
        },
        reservationDate: reservation.datarezervare,
        abonamentId: reservation.abonamentid
    }));

    return {
        success: true,
        date,
        reservations: formattedReservations
    };
}


async function getAllFacilities(filters) {
    try {
        const queryParams = [];
        let baseQuery = `
            WITH SportsCounts AS (
                SELECT 
                    ct.locationId,
                    s.id AS sport_id,
                    s.name AS sport_name,
                    COUNT(ct.id) as courts_count,
                    MIN(ct.pricePerHour) as min_price,
                    MAX(ct.pricePerHour) as max_price
                FROM mod_dms_gen_sconn___courts ct
                JOIN mod_dms_gen_sconn___sports s ON ct.sport = s.id
                GROUP BY ct.locationId, s.id, s.name
            )
            SELECT 
                l.id,
                l.name,
                l.description,
                l.address,
                l.lat,
                l.lng,
                l.valid,
                c.id AS city_id,
                c.name AS city_name,
                ARRAY_AGG(DISTINCT sc.sport_name) AS sports,
                JSON_AGG(
                    DISTINCT jsonb_build_object(
                        'sportId', sc.sport_id,
                        'sportName', sc.sport_name,
                        'courtsCount', sc.courts_count,
                        'priceRange', jsonb_build_object(
                            'min', sc.min_price,
                            'max', sc.max_price
                        )
                    )
                ) AS sports_details
            FROM mod_dms_gen_sconn___locations l
            JOIN mod_dms_gen_sconn___cities c ON l.cityId = c.id
            LEFT JOIN SportsCounts sc ON l.id = sc.locationId
            WHERE l.valid = true
        `;

        // Adăugăm filtrele
        if (filters.cityId) {
            queryParams.push(filters.cityId);
            baseQuery += ` AND l.cityId = $${queryParams.length}`;
        }

        if (filters.sportId) {
            queryParams.push(filters.sportId);
            baseQuery += ` AND EXISTS (
                SELECT 1 FROM mod_dms_gen_sconn___courts ct2 
                WHERE ct2.locationId = l.id AND ct2.sport = $${queryParams.length}
            )`;
        }

        if (filters.searchTerm) {
            queryParams.push(`%${filters.searchTerm}%`);
            baseQuery += ` AND (
                l.name ILIKE $${queryParams.length} OR 
                l.description ILIKE $${queryParams.length} OR 
                l.address ILIKE $${queryParams.length}
            )`;
        }

        // Adăugăm GROUP BY
        baseQuery += ` GROUP BY l.id, c.id, c.name`;

        // Adăugăm ORDER BY
        baseQuery += ` ORDER BY ${filters.sortBy} ${filters.sortOrder}`;

        // Adăugăm LIMIT și OFFSET pentru paginare
        if (filters.limit) {
            queryParams.push(filters.limit);
            baseQuery += ` LIMIT $${queryParams.length}`;
        }

        if (filters.offset) {
            queryParams.push(filters.offset);
            baseQuery += ` OFFSET $${queryParams.length}`;
        }

        // Executăm query-ul principal
        const result = await db.query(baseQuery, queryParams);

        // Procesăm rezultatele
        const facilities = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            description: row.description,
            address: row.address,
            coordinates: {
                lat: row.lat,
                lng: row.lng
            },
            city: {
                id: row.city_id,
                name: row.city_name
            },
            sports: row.sports.filter(sport => sport !== null),
            statistics: {
                totalCourtsCount: row.sports_details.reduce((sum, sport) => sum + sport.courtsCount, 0),
                sportsDetails: row.sports_details.map(sport => ({
                    sportId: sport.sportId,
                    sportName: sport.sportName,
                    courtsCount: sport.courtsCount,
                    priceRange: {
                        min: parseFloat(sport.priceRange.min),
                        max: parseFloat(sport.priceRange.max)
                    }
                }))
            }
        }));

        // Obținem numărul total pentru paginare
        const countQuery = `
            SELECT COUNT(DISTINCT l.id) 
            FROM mod_dms_gen_sconn___locations l
            WHERE l.valid = true
            ${filters.cityId ? ' AND l.cityId = $1' : ''}
        `;
        const countResult = await db.query(
            countQuery, 
            filters.cityId ? [filters.cityId] : []
        );

        return {
            facilities,
            total: parseInt(countResult.rows[0].count)
        };

    } catch (error) {
        console.error("Error in getAllFacilities model:", error);
        throw error;
    }
}



module.exports = {
    getLocationCourts,
    addLocationPending,
    toggleLocationValidation,
    getLocationInfo,
    getLocationSchedule,
    handleLocationEdit,
    getAllFacilities
};
