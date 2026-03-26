import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { VMS_URL } from "./Config";

const IdleTimerProvider = ({ children }) => {
  const navigate = useNavigate();
  const timeoutRef = useRef(null);
  const idleTime = 1000 * 60 * 60 * 10; // 10 hour
// const idleTime = 1000 * 10; // 30 seconds

  const [loading, setLoading] = useState(false);

  const sessionUserData = JSON.parse(
    sessionStorage.getItem("userData") || "{}"
  );

  const handleLogout = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${VMS_URL}LogOut`, {
        UserId: sessionUserData.Id,
      });

      if (response.data.ResultData[0].Status === "Success") {
        sessionStorage.clear();
        localStorage.clear();
        navigate("/");
      } else {
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
      console.error("Logout failed:", error);
    }
  };

  const resetTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, idleTime);
  };

  useEffect(() => {
    const events = ["mousemove", "keydown", "mousedown", "touchstart"];
    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return children;
};

export default IdleTimerProvider;
