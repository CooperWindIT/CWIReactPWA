// Find the menu entry that drives the Items / Inspection screens and return its action ids.
// The menu was renamed ("Items" -> "Inspection"), so match by path first, then by name.
const ITEMS_MENU_NAMES = ["Inspection", "Items"];
const ITEMS_MENU_PATHS = ["/iom/items-list", "/iim/items-list"];

export const findItemsMenu = (menuList = []) => {
    const list = Array.isArray(menuList) ? menuList : [];
    const path = (window.location.pathname || "").toLowerCase();

    return (
        list.find(m => (m.MenuPath || "").toLowerCase() === path) ||
        list.find(m => ITEMS_MENU_PATHS.includes((m.MenuPath || "").toLowerCase())) ||
        list.find(m => ITEMS_MENU_NAMES.includes(m.MenuName))
    );
};

export const getItemsActionIds = () => {
    try {
        const menu = findItemsMenu(JSON.parse(sessionStorage.getItem("menuData") || "[]"));
        return menu?.ActionsIds ? String(menu.ActionsIds).split(",").map(Number) : [];
    } catch {
        return [];
    }
};