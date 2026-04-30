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

export const fetchWithAuth = async (url, options = {}) => {
    let token = sessionStorage.getItem("accessToken");

    const res = await fetch(BASE_API + url, {
        ...options,
        headers: {
            ...options.headers,
            Authorization: `Bearer ${token}`,
        },
    });

    if (res.status === 401) {
        token = await refreshAccessToken();
        if (!token) return res;

        return fetch(BASE_API + url, {
            ...options,
            headers: {
                ...options.headers,
                Authorization: `Bearer ${token}`,
            },
        });
    }

    return res;
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
