

function roundToNextHalfHour(time) {
    const date = new Date(time);
    let minutes = date.getMinutes();
    const seconds = date.getSeconds();

    if (seconds > 0) {
        minutes += 1;
    }

    if (minutes === 0 || minutes === 30) {
        date.setSeconds(0);
        return date.toISOString().slice(0, 19).replace("T", " ");
    }

    if (minutes < 30) {
        date.setMinutes(30, 0, 0);
    } else {
        date.setHours(date.getHours() + 1, 0, 0, 0);
    }

    return date.toISOString().slice(0, 19).replace("T", " ");
}

function formatDateToLocal(date) {
    if (!date) return null;
    const d = new Date(date);
    // Convertim la timezone-ul România (UTC+2 sau UTC+3)
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString();
}

function combineScheduleData(availabilityCourts, reservations, date) {
    if (!Array.isArray(availabilityCourts) || !Array.isArray(reservations) || !date) {
        throw new Error("Invalid input data");
    }

    const combinedSchedule = {};
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    availabilityCourts.forEach(court => {
        const courtId = court.courtId;
        const courtSchedule = [];
        
        // Procesăm sloturile disponibile
        court.availableSlots.forEach(slot => {
            
            const variants = generateTimeVariants(slot.start, slot.end);

            courtSchedule.push({
                start: slot.start,  // Folosim direct string-ul
                end: slot.end,      // Folosim direct string-ul
                type: 'available',
                courtId: courtId,
                courtName: court.courtName,
                availableTimes: variants
            });
        });
        
        // Procesăm rezervările
        const courtReservations = reservations.filter(res => res.courtId === courtId);
        courtReservations.forEach(reservation => {
            courtSchedule.push({
                start: reservation.startTime,  // Folosim direct string-ul
                end: reservation.endTime,      // Folosim direct string-ul
                type: 'reserved',
                courtId: courtId,
                courtName: court.courtName,
                reservationInfo: {
                    id: reservation.reservationId,
                    name: reservation.reservationName,
                    duration: reservation.duration,
                    user: reservation.user,
                    totalPrice: reservation.totalPrice
                }
            });
        });
        
        // Sortăm după timpul de start (comparăm string-urile direct)
        courtSchedule.sort((a, b) => a.start.localeCompare(b.start));
        
        // Verificăm intervalele din trecut
        // courtSchedule.forEach(slot => {
        //     if (slot.end < now) {
        //         slot.type = 'past';
        //     }
        // });
        
        // Verificăm pentru suprapuneri
        for (let i = 1; i < courtSchedule.length; i++) {
            const currentSlot = courtSchedule[i];
            const previousSlot = courtSchedule[i-1];
            
            if (currentSlot.start < previousSlot.end) {
                console.warn(`Overlapping slots detected for court ${courtId}`);
            }
        }

        combinedSchedule[courtId] = {
            courtName: court.courtName,
            schedule: courtSchedule
        };
    });
    
    return combinedSchedule;
}

function generateTimeVariants(start, end) {
    const times = [];

    // Extragem ora și minutul din string
    const [startHour, startMinute] = start.split(' ')[1].split(':').map(Number);
    const [endHour, endMinute] = end.split(' ')[1].split(':').map(Number);

    let currentHour = startHour;
    let currentMinute = startMinute;

    // Loop pentru a genera timpii
    while (true) {
        const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
        times.push(timeString);

        // Oprim dacă am atins sau depășit ora finală
        if (currentHour === endHour && currentMinute === endMinute) {
            break;
        }

        // Incrementăm cu 30 de minute
        currentMinute += 30;
        if (currentMinute >= 60) {
            currentMinute -= 60;
            currentHour += 1;
        }

        // Gestionăm trecerea peste miezul nopții
        if (currentHour === 24) {
            currentHour = 0;
        }
    }

    return times;
}






function formatTime(input) {
    if (!input) return null;
    if (typeof input === 'string') return input.substr(11, 8); // Dacă este deja string
    if (input instanceof Date) return input.toISOString().substr(11, 8); // Convertim din obiect Date
    return null; // Returnăm null dacă formatul este necunoscut
}



function findNextEventTime(currentTime, reservations, availableSlots, endTime) {
    let nextTime = endTime;

    reservations.forEach(res => {
        const startTime = formatDateTime(res.startTime)?.substr(11, 8); // Convertim în șir
        const endTime = formatDateTime(res.endTime)?.substr(11, 8); // Convertim în șir

        if (startTime > currentTime && startTime < nextTime) {
            nextTime = startTime;
        }
        if (endTime > currentTime && endTime < nextTime) {
            nextTime = endTime;
        }
    });

    availableSlots.forEach(slot => {
        const slotStart = formatDateTime(slot.start)?.substr(11, 8);
        const slotEnd = formatDateTime(slot.end)?.substr(11, 8);

        if (slotStart > currentTime && slotStart < nextTime) {
            nextTime = slotStart;
        }
        if (slotEnd > currentTime && slotEnd < nextTime) {
            nextTime = slotEnd;
        }
    });

    return nextTime;
}

// Funcție helper pentru formatarea datelor
function formatDateTime(dateTimeString) {
    if (!dateTimeString) return null;
    const date = new Date(dateTimeString);
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

function getNextHalfHour(date) {
    const minutes = date.getMinutes();
    const nextHalfHour = new Date(date);
    nextHalfHour.setMinutes(minutes < 30 ? 30 : 0);
    nextHalfHour.setHours(minutes < 30 ? nextHalfHour.getHours() : nextHalfHour.getHours() + 1);
    nextHalfHour.setSeconds(0, 0);
    return nextHalfHour;
}







// Exportă funcțiile pentru a putea fi utilizate în alte fișiere
module.exports = {
    roundToNextHalfHour,
    formatDateToLocal,
    combineScheduleData,
    getNextHalfHour
};