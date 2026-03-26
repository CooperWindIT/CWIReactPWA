// api.js

import { BASE_API } from "../Components/Config/Config";

export const refreshAccessToken = async () => {
    const refreshToken = sessionStorage.getItem("refreshToken");

    const response = await fetch(`${BASE_API}Public/refreshToken`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "refreshToken": refreshToken }),
    });

    if (!response.ok) {
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = "/"; // force logout
        return null;
    }

    const result = await response.json();
    sessionStorage.setItem("accessToken", result.data.accessToken);
    return result.data.accessToken;
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

    // If token expired, try refreshing once
    if (res.status === 401) {
        token = await refreshAccessToken();
        if (!token) return res; // refresh failed

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
  