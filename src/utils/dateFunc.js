export const formatToDDMMYYYY = (dateString) => {
    if (!dateString) return "";

    const date = new Date(dateString);

    // Use getUTC... instead of get...
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = date.getUTCFullYear();

    return `${day}-${month}-${year}`;
};

export const formatToDDMMYYYY_HHMM = (dateString) => {
    if (!dateString || typeof dateString !== "string") return "";

    const match = dateString.match(
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/
    );

    if (!match) return "";

    const [, year, month, day, hour, minute] = match;

    return `${day}-${month}-${year} ${hour}:${minute}`;
};


export const formatDateyyyymmddToddmmYYYY = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
};
