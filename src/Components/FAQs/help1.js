import React, { useState, useEffect } from "react";
import ReactPlayer from "react-player";
import { useNavigate } from "react-router-dom";
import Base1 from "../Config/Base1";
import { fetchWithAuth } from "../../utils/api";

const Help1 = () => {

    const navigate = useNavigate();
    const [sessionUserData, setSessionUserData] = useState([]);

    const [search, setSearch] = useState("");
    const [faqsData, setFaqsData] = useState([]);
    const [filteredFaqs, setFilteredFaqs] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [dataLoading, setDataLoading] = useState(false);
    const [moduleName, setModuleName] = useState("");
    const [sessionModuleId, setSessionModuleId] = useState(null);
    const navigationPath = sessionStorage.getItem("navigationPath") || "/";

    useEffect(() => {
        const userDataString = sessionStorage.getItem('userData');
        const moduleString = localStorage.getItem('ModuleData');

        if (userDataString) {
            const userData = JSON.parse(userDataString);
            const moduledata = JSON.parse(moduleString);
            setModuleName(moduledata?.ModuleName);
            setSessionUserData(userData);

            const moduleId = moduledata?.Id?.toString();
            setSessionModuleId(moduleId);
        } else {
            console.log('User data not found in sessionStorage');
        }
    }, []);


    const fetchDModuleFaqsata = async () => {
        setDataLoading(true);
        try {
            const response = await fetch(`https://qacwiapi.cooperwind.online/public/GetFAQs?ModuleId=${sessionModuleId}&IsExternal=0`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setFaqsData(data.data);
                    setFilteredFaqs(data.data);
                } else {
                    setFaqsData([]);
                    setFilteredFaqs([]);
                }
            } else {
                console.error('Failed to fetch attendance data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching attendance data:', error.message);
        } finally {
            setDataLoading(false);
        }
    };

    // const fetchDModuleFaqsata = async () => {
    //     setDataLoading(true);
    //         try {
    //             const response = await fetchWithAuth(
    //                 `public/GetFAQs?ModuleId=${sessionModuleId}&IsExternal=0`,
    //                 {
    //                     method: "GET",
    //                     headers: { "Content-Type": "application/json" },
    //                 }
    //             );
    
    //             if (!response.ok) throw new Error("Network response was not ok");
    
    //             const data = await response.json();
    
    //             if (data.success) {
    //                 setFaqsData(data.data);
    //                 setFilteredFaqs(data.data);
    //             } else {
    //                 setFaqsData([]);
    //                 setFilteredFaqs([]);
    //             }
    
    //         } catch (error) {
    //             console.error("Failed to fetch types data:", error);
    //             setFilteredFaqs([]);
    //         } finally {
    //             setDataLoading(false);
    //         }
    //     };

    useEffect(() => {
        if (sessionModuleId) {
            fetchDModuleFaqsata();
        }
    }, [sessionModuleId]);

    useEffect(() => {
        if (!search.trim()) {
            setFilteredFaqs(faqsData); // Show everything if search is empty
            return;
        }

        const searchTree = (list) => {
            return list
                .map((item) => ({ ...item })) // Clone to avoid mutating original state
                .filter((item) => {
                    const searchTerm = search.toLowerCase();

                    // Check if the current item matches
                    const matchesCurrent =
                        item.Question.toLowerCase().includes(searchTerm) ||
                        item.Answer.toLowerCase().includes(searchTerm);

                    // Recursively check if any children match
                    if (item.children && item.children.length > 0) {
                        item.children = searchTree(item.children);
                    }

                    // Keep the item if it matches OR if any of its children matched
                    return matchesCurrent || (item.children && item.children.length > 0);
                });
        };

        const results = searchTree(faqsData);
        setFilteredFaqs(results);
    }, [search, faqsData]);

    const renderMedia = (filePath) => {
        if (!filePath) return null;

        const isVideo = /\.(mp4|webm|ogg)$/i.test(filePath);
        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(filePath);

        if (isVideo) {
            return (
                <video
                    width="100%"
                    height="100%"
                    controls
                    preload="metadata"
                    style={{ borderRadius: "8px" }}
                >
                    <source src={filePath} type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
            );
        }

        if (isImage) {
            return (
                <img
                    src={filePath}
                    alt="faq-media"
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: "8px"
                    }}
                />
            );
        }

        return null;
    };

    const renderFaq = (faqs, parentIndex = "") => {
        return faqs.map((faq, index) => {

            const uniqueId = `${parentIndex}${index}-${faq.Id}`;

            return (
                <div className="accordion-item border-0 border-bottom " key={uniqueId}>
                    <h2 className="accordion-header">
                        <button
                            className="accordion-button collapsed fw-semibold"
                            data-bs-toggle="collapse"
                            data-bs-target={`#faq-${uniqueId}`}
                            onClick={() =>
                                setActiveId(activeId === uniqueId ? null : uniqueId)
                            }
                            style={{
                                background: activeId === uniqueId ? "#e0f2fe" : "#ffffff",
                                color: activeId === uniqueId ? "#0369a1" : "#000",
                                borderRadius: "10px",
                                margin: "8px 0",
                                transition: "0.3s",
                                boxShadow: activeId === uniqueId
                                    ? "0 4px 15px rgba(3,105,161,0.2)"
                                    : "0 2px 10px rgba(0,0,0,0.05)"
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "scale(1.01)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "scale(1)";
                            }}
                        >
                            <i className="fa-solid fa-circle-info text-primary me-2"></i>
                            {faq.Question}
                        </button>
                    </h2>

                    <div id={`faq-${uniqueId}`} className="accordion-collapse collapse">
                        <div className="accordion-body">

                            <p><i className="bi bi-arrow-right"></i> {faq.Answer}</p>

                            {faq.FilePath && (
                                <div className="d-flex justify-content-start my-3">
                                    <div
                                        className="position-relative overflow-hidden"
                                        style={{
                                            width: "100%",
                                            maxWidth: "500px",
                                            height: "280px",
                                            borderRadius: "12px",
                                            background: "#000",
                                            boxShadow: "0 5px 20px rgba(0,0,0,0.3)",
                                        }}
                                    >
                                        {/* <button
                                            className="btn btn-light btn-sm position-absolute"
                                            style={{ top: 10, right: 10, borderRadius: "50%" }}
                                            onClick={() => setVisible(true)}
                                        >
                                            <i className="fa-solid fa-expand"></i>
                                        </button> */}

                                        {renderMedia(`https://services.cooperwind.online/uploads/QACWIDocs/${faq.FilePath}`)}
                                    </div>
                                </div>
                            )}

                            {faq.children && faq.children.length > 0 && (
                                <div className="accordion mt-3 ms-3">
                                    {renderFaq(faq.children, uniqueId + "-")}
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            );
        });
    };

    return (
        <Base1>
            <div
                className={`faq-page p-5 position-relative ${dataLoading ? "faq-loading-active" : ""}`}
                style={{
                    background: "linear-gradient(135deg, #eef2ff, #f8fafc)",
                    minHeight: "100vh"
                }}
            >
                {dataLoading && (
                    <div className="faq-loading-overlay">
                        <div className="faq-loading-card">
                            <div className="faq-loading-spinner-wrap">
                                <div className="faq-loading-spinner"></div>
                                <div className="faq-loading-spinner-ring"></div>
                            </div>

                            <div className="faq-loading-title">
                                Loading Help Center
                            </div>

                            <div className="faq-loading-text">
                                Fetching FAQs and support content...
                            </div>
                        </div>
                    </div>
                )}
                <div className="faq-content-shell">
                    <div className="containe">
                        <div className="mb-4">
                            <button
                                className="btn btn-white rounded-pill px-4 d-flex align-items-center border custom-back-btn"
                                onClick={() => navigate(navigationPath)}
                                style={{
                                    transition: "all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)",
                                    fontWeight: "600",
                                    color: "#4f46e5",
                                    background: "#fff",
                                    overflow: "hidden",
                                    position: "relative",
                                    border: "1px solid #e0e7ff"
                                }}
                            >
                                <i className="fa-solid fa-arrow-left back-icon"></i>
                                <span className="btn-text">Back to Module</span>
                            </button>
                        </div>

                        <div className="text-center mb-5">
                            <h2
                                className="fw-bold"
                                style={{ fontSize: "32px" }}
                            >
                                <i className="fa-solid fa-circle-question me-2 text-primary"></i>
                                <span style={{ color: "#97715f" }}>
                                    {moduleName}
                                </span>{" "}
                                <span
                                    style={{
                                        background: "linear-gradient(90deg, #4f46e5, #06b6d4)",
                                        WebkitBackgroundClip: "text",
                                        WebkitTextFillColor: "transparent"
                                    }}
                                >
                                    Module Help Center
                                </span>
                            </h2>

                            <p className="text-muted fs-6">
                                Find answers to your questions related to <span style={{ fontFamily: "bold", color: "#97715f" }}>
                                    {moduleName}
                                </span>{" "} module
                            </p>
                        </div>

                        <div className="d-flex justify-content-center mb-5">
                            <div
                                className="position-relative w-50"
                                style={{
                                    transition: "0.3s",
                                }}
                            >
                                <input
                                    type="text"
                                    className="form-control rounded-pill ps-4 pe-5 shadow"
                                    placeholder="Search your question..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    style={{
                                        height: "50px",
                                        border: "none",
                                        boxShadow: "0 5px 20px rgba(0,0,0,0.08)",
                                        transition: "0.3s"
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.boxShadow = "0 8px 25px rgba(79,70,229,0.25)";
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.boxShadow = "0 5px 20px rgba(0,0,0,0.08)";
                                    }}
                                />

                                <i
                                    className="fa-solid fa-magnifying-glass position-absolute"
                                    style={{
                                        top: "50%",
                                        right: "18px",
                                        transform: "translateY(-50%)",
                                        color: "#6b7280",
                                        fontSize: "18px"
                                    }}
                                ></i>
                            </div>
                        </div>

                        <div
                            className="card border-0 mb-5 p-5"
                            style={{
                                borderRadius: "20px",
                                background: "rgba(255,255,255,0.7)",
                                backdropFilter: "blur(10px)",
                                boxShadow: "0 10px 40px rgba(0,0,0,0.1)"
                            }}
                        >
                            <div className="accordion accordion-flush">
                                {filteredFaqs.length > 0 ? (
                                    <div className="row">
                                        <div className="col-md-12">
                                            <div className="accordion accordion-flush">
                                                {renderFaq(filteredFaqs)}

                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-muted py-5 fs-5">
                                        😕 No questions found
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                {`
                .faq-content-shell {
    transition: filter 0.25s ease, opacity 0.25s ease;
}

.faq-loading-active .faq-content-shell {
    filter: blur(4px);
    opacity: 0.55;
    pointer-events: none;
    user-select: none;
}

.faq-loading-overlay {
    position: absolute;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(248, 250, 252, 0.22);
    backdrop-filter: blur(6px);
}

.faq-loading-card {
    min-width: 280px;
    max-width: 340px;
    text-align: center;
    padding: 28px 24px;
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.82);
    border: 1px solid rgba(79, 70, 229, 0.12);
    box-shadow: 0 20px 50px rgba(79, 70, 229, 0.12);
}

.faq-loading-spinner-wrap {
    position: relative;
    width: 70px;
    height: 70px;
    margin: 0 auto 16px;
}

.faq-loading-spinner {
    width: 70px;
    height: 70px;
    border-radius: 50%;
    border: 4px solid rgba(79, 70, 229, 0.12);
    border-top-color: #4f46e5;
    animation: faqSpin 0.9s linear infinite;
}

.faq-loading-spinner-ring {
    position: absolute;
    inset: 10px;
    border-radius: 50%;
    border: 3px dashed rgba(6, 182, 212, 0.35);
    animation: faqSpinReverse 1.4s linear infinite;
}

.faq-loading-title {
    font-size: 18px;
    font-weight: 800;
    color: #312e81;
    margin-bottom: 6px;
}

.faq-loading-text {
    font-size: 14px;
    color: #6b7280;
}

@keyframes faqSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

@keyframes faqSpinReverse {
    from { transform: rotate(360deg); }
    to { transform: rotate(0deg); }
}

                /* Custom Back Button Animation */
                    .custom-back-btn {
                        box-shadow: 0 2px 5px rgba(79, 70, 229, 0.1);
                    }

                    .custom-back-btn:hover {
                        background-color: #f5f7ff !important;
                        color: #4338ca !important;
                        transform: translateY(-2px);
                        box-shadow: 0 8px 15px rgba(79, 70, 229, 0.15) !important;
                    }

                    /* Slide the icon back and forth */
                    .custom-back-btn:hover .back-icon {
                        animation: slideBack 0.6s infinite alternate;
                    }

                    @keyframes slideBack {
                        from { transform: translateX(0); }
                        to { transform: translateX(-5px); }
                    }

                    .custom-back-btn:active {
                        transform: translateY(0);
                        box-shadow: 0 2px 4px rgba(79, 70, 229, 0.1) !important;
                    }
                `}
            </style>
        </Base1>
    );
};

export default Help1;
