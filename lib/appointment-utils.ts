/**
 * appointment-utils.ts
 *
 * Reusable helpers for appointment slot logic.
 * Pure functions — no React dependencies, fully testable.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DoctorAvailability {
    /** "HH:MM" — doctor's working day start */
    start: string;
    /** "HH:MM" — doctor's working day end */
    end: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a "HH:MM" string into total minutes since midnight.
 * Returns NaN for invalid input.
 */
function timeToMinutes(time: string): number {
    if (!time) return NaN;
    const [h, m] = time.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return NaN;
    return h * 60 + m;
}

/**
 * Build a Date that represents the given slotTime on the given selectedDate
 * using **local** time (no UTC conversion).
 *
 * @param slotTime     "HH:MM"
 * @param selectedDate "YYYY-MM-DD"
 */
function buildSlotDate(slotTime: string, selectedDate: string): Date {
    const [year, month, day] = selectedDate.split("-").map(Number);
    const [hours, minutes] = slotTime.split(":").map(Number);
    // new Date(year, monthIndex, day, hours, minutes) → local time
    return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

/**
 * Return a Date object set to today at midnight (00:00:00.000) in local time,
 * for pure date comparisons — ignores the time component.
 */
function localToday(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Parse a "YYYY-MM-DD" string into a local midnight Date,
 * avoiding any UTC shift that `new Date("YYYY-MM-DD")` would apply.
 */
function parseLocalDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
}

// ---------------------------------------------------------------------------
// Core exported function
// ---------------------------------------------------------------------------

/**
 * Determines whether an appointment time slot should be disabled.
 *
 * A slot is disabled when ANY of the following is true:
 *
 * A) The selected date is in the **past** (before today) → disable all slots.
 *
 * B) The slot falls **outside** the doctor's working hours
 *    (slot < availability.start OR slot >= availability.end).
 *    Skipped when `doctorAvailability` is not provided.
 *
 * C) The selected date is **today** AND the slot time is ≤ current time
 *    (i.e., the slot has already started or passed at minute precision).
 *
 * @param slotTime           "HH:MM"   — the slot's start time
 * @param selectedDate       "YYYY-MM-DD" — the chosen appointment date
 * @param doctorAvailability Optional working-hours window for the doctor
 */
export function isSlotDisabled(
    slotTime: string,
    selectedDate: string,
    doctorAvailability?: DoctorAvailability
): boolean {
    if (!slotTime || !selectedDate) return true;

    const today = localToday();
    const selectedDay = parseLocalDate(selectedDate);

    // ── Rule A: Past date → disable every slot ──────────────────────────────
    if (selectedDay < today) return true;

    // ── Rule B: Outside doctor availability ─────────────────────────────────
    if (doctorAvailability) {
        const slotMinutes = timeToMinutes(slotTime);
        const startMinutes = timeToMinutes(doctorAvailability.start);
        const endMinutes = timeToMinutes(doctorAvailability.end);

        if (
            !isNaN(slotMinutes) &&
            !isNaN(startMinutes) &&
            !isNaN(endMinutes) &&
            (slotMinutes < startMinutes || slotMinutes >= endMinutes)
        ) {
            return true;
        }
    }

    // ── Rule C: Today + slot has already passed ──────────────────────────────
    const isToday = selectedDay.getTime() === today.getTime();
    if (isToday) {
        const slotDate = buildSlotDate(slotTime, selectedDate);
        const now = new Date();
        // Disable if the slot started at or before the current minute
        if (slotDate <= now) return true;
    }

    return false;
}

// ---------------------------------------------------------------------------
// Bonus helpers (used by the UI layer)
// ---------------------------------------------------------------------------

/**
 * Returns the index of the first non-disabled, non-full slot in `slots`.
 * Returns -1 if no such slot exists.
 */
export function findFirstAvailableSlotIndex(
    slots: Array<{ time: string; isFull?: boolean }>,
    selectedDate: string,
    doctorAvailability?: DoctorAvailability
): number {
    return slots.findIndex(
        (slot) =>
            !slot.isFull &&
            !isSlotDisabled(slot.time, selectedDate, doctorAvailability)
    );
}

/**
 * Format a "HH:MM" 24-hour string to "H:MM AM/PM".
 */
export function formatTime12Hour(time24: string): string {
    if (!time24) return "";
    const [hours, minutes] = time24.split(":");
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${minutes} ${ampm}`;
}
