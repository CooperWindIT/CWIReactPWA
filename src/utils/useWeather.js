// useWeather.js
import { useEffect, useState } from "react";

export const useWeather = () => {

  const weatherCodeMap = {
    0: { label: "Clear Sky", icon: "☀️" },

    1: { label: "Mainly Clear", icon: "🌤" },
    2: { label: "Partly Cloudy", icon: "⛅" },
    3: { label: "Overcast", icon: "☁️" },

    45: { label: "Fog", icon: "🌫" },
    48: { label: "Depositing Rime Fog", icon: "🌫" },

    51: { label: "Light Drizzle", icon: "🌦" },
    53: { label: "Moderate Drizzle", icon: "🌦" },
    55: { label: "Dense Drizzle", icon: "🌧" },

    61: { label: "Slight Rain", icon: "🌧" },
    63: { label: "Moderate Rain", icon: "🌧" },
    65: { label: "Heavy Rain", icon: "🌧" },

    71: { label: "Slight Snow", icon: "❄️" },
    73: { label: "Moderate Snow", icon: "❄️" },
    75: { label: "Heavy Snow", icon: "❄️" },

    80: { label: "Light Rain Showers", icon: "🌦" },
    81: { label: "Moderate Rain Showers", icon: "🌧" },
    82: { label: "Violent Rain Showers", icon: "⛈" },

    95: { label: "Thunderstorm", icon: "⛈" },
    96: { label: "Thunderstorm with Hail", icon: "⛈" },
    99: { label: "Heavy Thunderstorm with Hail", icon: "⛈" },
  };

  const [weather, setWeather] = useState(null);

  const fetchCityName = async (lat, lon) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
      );

      const data = await res.json();

      const address = data.address;

      return (
        address.city ||
        address.town ||
        address.village ||
        address.hamlet ||
        address.state ||
        "Unknown Location"
      );
    } catch (error) {
      console.error("City fetch failed", error);
      return "Unknown Location";
    }
  };

  // useEffect(() => {

  //     const fetchWeather = async (lat, lon, city) => {
  //         try {
  //             const res = await fetch(
  //                 `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
  //             );

  //             const data = await res.json();
  //             const current = data.current_weather;

  //             const weatherInfo = weatherCodeMap[current.weathercode] || {
  //                 label: "Unknown",
  //                 icon: "❓",
  //             };

  //             setWeather({
  //                 city: city,
  //                 temp: current.temperature,
  //                 condition: weatherInfo.label,
  //                 icon: weatherInfo.icon,
  //                 windspeed: current.windspeed,
  //                 winddirection: current.winddirection,
  //                 isDay: current.is_day,
  //                 time: current.time,
  //                 fetchedAt: new Date(),
  //             });

  //         } catch (error) {
  //             console.error("Weather fetch failed", error);
  //         }
  //     };

  //     // 🌍 Get user location
  //     if (navigator.geolocation) {

  //         navigator.geolocation.getCurrentPosition(

  //           // ✅ SUCCESS CALLBACK
  //           async (position) => {
  //             const lat = position.coords.latitude;
  //             const lon = position.coords.longitude;

  //             const city = await fetchCityName(lat, lon);

  //             fetchWeather(lat, lon, city);
  //           },

  //           // ❌ ERROR CALLBACK
  //           (error) => {
  //             console.error("Location permission denied", error);

  //             // Fallback location (Hyderabad)
  //             fetchWeather(17.375, 78.5, "Hyderabad");
  //           }

  //         );

  //       } else {
  //         console.error("Geolocation not supported");
  //         fetchWeather(17.375, 78.5, "Hyderabad");
  //       }          

  // }, []);

  const WEATHER_CACHE_KEY = "app_weather_cache";
  const TEN_MINUTES = 10 * 60 * 1000;

  useEffect(() => {

    const loadWeather = async () => {

      // 🔍 Check cache first
      const cached = sessionStorage.getItem(WEATHER_CACHE_KEY);

      if (cached) {
        const parsed = JSON.parse(cached);

        const now = new Date().getTime();

        if (now - parsed.timestamp < TEN_MINUTES) {
          // ✅ Use cached data
          setWeather(parsed.data);
          return;
        }
      }

      // 🌍 Get location
      const fetchAndStore = async (lat, lon, city) => {
        try {
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
          );

          const data = await res.json();
          const current = data.current_weather;

          const weatherInfo = weatherCodeMap[current.weathercode] || {
            label: "Unknown",
            icon: "❓",
          };

          const weatherData = {
            city: city,
            temp: current.temperature,
            condition: weatherInfo.label,
            icon: weatherInfo.icon,
            windspeed: current.windspeed,
            winddirection: current.winddirection,
            isDay: current.is_day,
            time: current.time,
            fetchedAt: new Date(),
          };

          setWeather(weatherData);

          // 💾 Save to session
          sessionStorage.setItem(
            WEATHER_CACHE_KEY,
            JSON.stringify({
              timestamp: new Date().getTime(),
              data: weatherData,
            })
          );

        } catch (error) {
          console.error("Weather fetch failed", error);
        }
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            const city = await fetchCityName(lat, lon);

            fetchAndStore(lat, lon, city);
          },
          () => {
            fetchAndStore(17.375, 78.5, "Hyderabad");
          }
        );
      } else {
        fetchAndStore(17.375, 78.5, "Hyderabad");
      }
    };

    loadWeather();

    // 🔁 Auto refresh every 10 minutes
    const interval = setInterval(loadWeather, TEN_MINUTES);

    return () => clearInterval(interval);

  }, []);

  return weather;
};
