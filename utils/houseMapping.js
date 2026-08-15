// utils/houseMapping.js

// Centralized mapping of houses - updated to match RegistrationForm structure
export const houses = [
    {
        name: "Jesus Christ Our Saviour",
        color: "#FF0000",
        key: "saviour",
        shortName: "Our Saviour"
    },
    {
        name: "Jesus Christ The Holy Ghost Baptizer",
        color: "#FFD700",
        key: "holyGhost",
        shortName: "Holy Ghost Baptizer"
    },
    {
        name: "Jesus Christ Our Healer",
        color: "#0000FF",
        key: "healer",
        shortName: "Our Healer"
    },
    {
        name: "Jesus Christ Our Coming King",
        color: "#800080",
        key: "comingKing",
        shortName: "Our Coming King"
    },
];

// For backward compatibility with existing components
export const HOUSES = {
    RED: houses[0],
    YELLOW: houses[1],
    BLUE: houses[2],
    PURPLE: houses[3],
};

// List of keys (saviour, holyGhost, healer, comingKing)
export const HOUSE_KEYS = houses.map(house => house.key);

// List of old keys for backward compatibility
export const OLD_HOUSE_KEYS = Object.keys(HOUSES);

// Get house by key (e.g. "saviour" or "RED")
export function getHouseByKey(key) {
    // Try new key format first
    const houseByNewKey = houses.find(h => h.key === key);
    if (houseByNewKey) return houseByNewKey;

    // Fallback to old key format for backward compatibility
    return HOUSES[key] || null;
}

// Get the full name from a house key
export function getFullHouseName(key) {
    const house = getHouseByKey(key);
    return house?.name || key;
}

// Get just the color hex
export function getHouseColor(key) {
    const house = getHouseByKey(key);
    return house?.color || "#999999";
}

// Get short names for charts or tags
export function getShortHouseName(fullName) {
    const house = houses.find(h => h.name === fullName);
    return house ? house.shortName : fullName;
}

// Get house by full name
export function getHouseByName(fullName) {
    return houses.find(h => h.name === fullName) || null;
}

// Get house key by full name
export function getHouseKeyByName(fullName) {
    const house = getHouseByName(fullName);
    return house ? house.key : null;
}

// Get house by short name
export function getHouseByShortName(shortName) {
    return houses.find(h => h.shortName === shortName) || null;
}

// Theme colors array
export const THEME_COLORS = houses.map(house => house.color);

// Alternative theme colors (your original ones)
export const ALT_THEME_COLORS = [
    "#ef4444", // Red (Saviour)
    "#facc15", // Yellow (Holy Ghost Baptizer)
    "#3b82f6", // Blue (Healer)
    "#8b5cf6", // Purple (Coming King)
];
