import { createContext, useState, useEffect } from "react";
import { VMS_URL } from "./Components/Config/Config";
import { useNavigate } from "react-router-dom";


export const MenuContext = createContext();

export const MenuProvider = ({ children }) => {

    const navigate = useNavigate();
    const [sessionUserData, setsessionUserData] = useState({});
    const [menuItems, setMenuItems] = useState([]);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
        } else {
            navigate("/");
        }
    }, [navigate]);

    useEffect(() => {
        const fetchMenuData = async () => {
            try {
                const sessionData = sessionStorage.getItem("menuData");

                if (sessionData) {
                    setMenuItems(JSON.parse(sessionData));
                } else {
                    const response = await fetch(`${VMS_URL}getmenu?OrgId=${sessionUserData.OrgId}&RoleId=${sessionUserData.RoleId}`);
                    
                    if (response.ok) {
                        const data = await response.json();
                        setMenuItems(data.ResultData);
                        sessionStorage.setItem("menuData", JSON.stringify(data.ResultData));
                    } else {
                        console.error("Failed to fetch menu data:", response.statusText);
                    }
                }
            } catch (error) {
                console.error("Error fetching menu data:", error.message);
            }
        };

        fetchMenuData();
    }, []);

    return (
        <MenuContext.Provider value={{ menuItems }}>
            {children}
        </MenuContext.Provider>
    );
};
