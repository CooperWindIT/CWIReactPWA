import { BASE_API } from "../Components/Config/Config";

export const refreshAccessToken = async () => {
    try {
        const refreshToken = sessionStorage.getItem("refreshToken");

        if (!refreshToken) {
            sessionStorage.clear();
            localStorage.clear();
            window.location.href = "/";
            return null;
        }

        const response = await fetch(`${BASE_API}Public/refreshToken`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
            sessionStorage.clear();
            localStorage.clear();
            window.location.href = "/";
            return null;
        }

        const result = await response.json();
        const newAccessToken = result?.data?.accessToken;

        if (!newAccessToken) {
            sessionStorage.clear();
            localStorage.clear();
            window.location.href = "/";
            return null;
        }

        sessionStorage.setItem("accessToken", newAccessToken);
        return newAccessToken;
    } catch (error) {
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = "/";
        return null;
    }
};

// export const fetchWithAuth = async (url, options = {}) => {
//     let token = sessionStorage.getItem("accessToken");

//     const res = await fetch(BASE_API + url, {
//         ...options,
//         headers: {
//             ...options.headers,
//             Authorization: `Bearer ${token}`,
//         },
//     });

//     if (res.status === 401) {
//         token = await refreshAccessToken();
//         if (!token) return res;

//         return fetch(BASE_API + url, {
//             ...options,
//             headers: {
//                 ...options.headers,
//                 Authorization: `Bearer ${token}`,
//             },
//         });
//     }

//     return res;
// };

export const fetchWithAuth = async (url, options = {}) => {
    let token = sessionStorage.getItem("accessToken");

    // No access token available → logout immediately
    if (!token) {
        handleSessionExpired();
        return null;
    }

    const makeRequest = (accessToken) => {
        return fetch(BASE_API + url, {
            ...options,
            headers: {
                ...options.headers,
                Authorization: `Bearer ${accessToken}`,
            },
        });
    };

    try {
        let res = await makeRequest(token);

        // Access token expired
        if (res.status === 401) {
            token = await refreshAccessToken();

            // Refresh failed → logout
            if (!token) {
                handleSessionExpired();
                return res;
            }

            // Retry request with new token
            res = await makeRequest(token);

            // New token also rejected → logout
            if (res.status === 401) {
                handleSessionExpired();
            }
        }

        return res;

    } catch (error) {
        console.error("API request error:", error);
        throw error;
    }
};

const handleSessionExpired = () => {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
    sessionStorage.removeItem("userData");

    // If you have other authentication/session values,
    // remove them here as well.

    window.location.href = "/";
};

export const fetchWithAuthExternal = async (baseUrl, url, options = {}) => {
    let token = sessionStorage.getItem("accessToken");

    const res = await fetch(baseUrl + url, {
        ...options,
        headers: {
            ...options.headers,
            Authorization: `Bearer ${token}`,
        },
    });

    if (res.status === 401) {
        token = await refreshAccessToken();
        if (!token) return res;

        return fetch(baseUrl + url, {
            ...options,
            headers: {
                ...options.headers,
                Authorization: `Bearer ${token}`,
            },
        });
    }

    return res;
};
