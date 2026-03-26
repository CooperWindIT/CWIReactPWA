import React from "react";

const getWindDirection = (degree) => {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.round(degree / 45) % 8];
};

const formatToIST = (dateString) => {
  const date = new Date(dateString);

  const istOffset = 5.5 * 60;
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const istTime = new Date(utc + istOffset * 60000);

  const day = String(istTime.getDate()).padStart(2, "0");
  const month = String(istTime.getMonth() + 1).padStart(2, "0");
  const year = istTime.getFullYear();

  const hours = String(istTime.getHours()).padStart(2, "0");
  const minutes = String(istTime.getMinutes()).padStart(2, "0");

  return `${day}-${month}-${year} ${hours}:${minutes}`;
};

const WeatherDetails = ({ weather }) => {
  if (!weather) return null;

  return (

    <div
      style={{
        minWidth: 280,
        padding: "16px",
        borderRadius: "16px",
      }}
    >
      {/* Header */}
      <div style={{ 
  display: "flex", 
  alignItems: "center", 
  justifyContent: "space-between", 
  marginBottom: 16,
  gap: "10px" 
}}>
  {/* Left Side: Condition + City Suffix */}
  <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
    <div style={{ fontSize: 18, fontWeight: 700, color: "#333", whiteSpace: "nowrap" }}>
      {weather.condition}
    </div>
    <div style={{ 
      fontSize: 13, 
      fontWeight: 500, 
      color: "#666", 
      textTransform: "capitalize",
      borderLeft: "1px solid #ddd",
      paddingLeft: "8px"
    }}>
      {weather.city}
    </div>
  </div>

  {/* Right Side: Icon */}
  <div style={{ 
    fontSize: 28, 
    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))" 
  }}>
    {weather.icon}
  </div>
</div>

      {/* Temperature */}
      <div style={{ fontSize: 36, fontWeight: 800, color: "#0369a1", marginBottom: 16 }}>
        {weather.temp}°C
      </div>

      {/* Info Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: 13 }}>

        <div className="d-flex align-items-center gap-2">
          <i className="fa-solid fa-wind text-primary"></i>
          <div>
            <div className="text-muted" style={{ fontSize: "11px" }}>Wind</div>
            <div className="fw-bold">{weather.windspeed} km/h</div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <i className="fa-solid fa-compass text-primary"></i>
          <div>
            <div className="text-muted" style={{ fontSize: "11px" }}>Direction</div>
            <div className="fw-bold">{weather.winddirection}° ({getWindDirection(weather.winddirection)})</div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <i className={`fa-solid ${weather.isDay ? 'fa-sun' : 'fa-moon'} text-warning`}></i>
          <div>
            <div className="text-muted" style={{ fontSize: "11px" }}>Period</div>
            <div className="fw-bold">{weather.isDay ? "Day" : "Night"}</div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <i className="fa-regular fa-clock text-primary"></i>
          <div>
            <div className="text-muted" style={{ fontSize: "11px" }}>Updated</div>
            <div className="fw-bold">{formatToIST(weather.fetchedAt)}</div>
          </div>
        </div>

      </div>
    </div>

  );
};

export default WeatherDetails;
