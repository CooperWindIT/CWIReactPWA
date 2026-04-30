import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const FAQButton = () => {
    
    const navigate = useNavigate();
    const location = useLocation();
    const [hover, setHover] = useState(false);
    const [expanded, setExpanded] = useState(true);

    useEffect(() => {
        setExpanded(true);
        const timer = setTimeout(() => setExpanded(false), 2000);
        return () => clearTimeout(timer);
    }, [location.pathname]);

    const handleFaq = () => {
        if (location.pathname === "/tech-tickets") {
          navigate("/tech-faqs");
        } else {
          navigate("/faq");
        }
      };

    const isOpen = hover || expanded;

    return (
        <>
            <div
                className="position-fixed d-flex align-items-center btn btn-primary shadow-lg"
                style={{
                    bottom: "20px",
                    right: "20px",
                    borderRadius: "50px",
                    width: isOpen ? "180px" : "52px",
                    height: "46px",
                    padding: "0 14px",
                    overflow: "hidden",
                    cursor: "pointer",
                    zIndex: 1050,
                    transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)", // Bouncy transition
                    opacity: isOpen ? 1 : 0.9,
                }}
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                onClick={handleFaq}
            >
               <div className="position-relative d-flex align-items-center">
                <i className={`fa-solid fa-headset fs-4 flex-shrink-0 ${!isOpen ? 'animate-headset' : ''}`}
                   style={{ color: "white" }}></i>
                
                {/* Small Notification Ping (only visible when collapsed) */}
                {!isOpen && (
                    <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle">
                        <span className="visually-hidden">New Alert</span>
                    </span>
                )}
            </div>
                <span
                    className="ms-2 text-nowrap"
                    style={{
                        opacity: isOpen ? 1 : 0,
                        transition: "opacity 0.2s ease",
                        color: "white",
                    }}
                >
                    Need Support
                </span>
            </div>

            <style>
                {`
                /* Pulsating effect for the support icon */
                    @keyframes pulse-icon {
                        0% { transform: scale(1); }
                        50% { transform: scale(1.15); }
                        100% { transform: scale(1); }
                    }

                    /* Subtle background shimmer */
                    @keyframes shimmer {
                        0% { background-position: -200% 0; }
                        100% { background-position: 200% 0; }
                    }

                    .support-btn-active {
                        background: linear-gradient(90deg, #0d6efd, #0dcaf0, #0d6efd);
                        background-size: 200% 100%;
                        animation: shimmer 3s infinite linear;
                    }

                    .animate-headset {
                        animation: pulse-icon 2s infinite ease-in-out;
                    }
                `}
            </style>
        </>
    );
};

export default FAQButton;
