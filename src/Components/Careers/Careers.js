import React, { useEffect, useState } from 'react';
import Base from '../Config/Base.js';
import ScrollToTop from './../Config/ScrollTop';
import axios from 'axios';
import { BASE_API_URL, BASE_IMAGE_API_URL } from '../Config/Config.js';


export default function Careers() {
    const [selectedCareer, setSelectedCareer] = useState(null);
    const [careersData, setCareersData] = useState(null);
    const [careersFirstData, setCareersFirstData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchContentByType();
    }, []);

    const fetchContentByType = async (type) => {
        setLoading(true);
        try {
            setLoading(true);
            const response = await axios.get(`${BASE_API_URL}CWIRoutes/GetContentByType`, {
                params: {
                    OrgId: 9330,
                    Type: "Careers",
                }
            });
            setCareersData(response.data.ResultData.slice(1));
            setCareersFirstData(response.data.ResultData[0]);
            console.log(response.data.ResultData);
            setLoading(false);
        } catch (error) {
            setLoading(false);
            console.error(`Error fetching ${type}:`, error);
            return null;
        }
    };
    

    return (
        <>
            <ScrollToTop />
            <Base>
                {loading && (
                    <div className="loading-overlay">
                        <div className="spinner">Loading...</div>
                    </div>
                )}
                <style>
        {`.loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            backdrop-filter: blur(5px); /* adds the blur */
            background-color: rgba(0, 0, 0, 0.3); /* optional: dark translucent layer */
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        }

        .spinner {
            color: white;
            font-size: 1.5rem;
            font-weight: bold;
        }
        `}
                </style>
                {/* Page Title */}
                <div className="page-title dark-background"
                    style={{
                        backgroundColor: '#222',
                        backgroundImage: careersFirstData?.ImageUrl1
                            ? `url(${BASE_IMAGE_API_URL}${careersFirstData.ImageUrl1})`
                            : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                    }}
                >
                    <div className="container position-relative">
                        <h1>Careers</h1>
                        <p>
                            {careersFirstData && careersFirstData?.Description1}
                        </p>
                        <nav className="breadcrumbs">
                            <ol>
                                <li><a href="/home">Home</a></li>
                                <li className="current">Careers</li>
                            </ol>
                        </nav>
                    </div>
                </div>

                <section id="climbing-gear" className="section">
                    <div className="container">
                        <div className="row">
                            {careersData && careersData?.map((career, index) => (
                                <div key={index} className="col-md-6 col-lg-3 mb-4">
                                    <div
                                        className="card h-100 career-card"
                                        onClick={() => setSelectedCareer(career)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div className="card-body d-flex align-items-center">
                                            <i class="bi bi-tools career-icon"></i>
                                            {/* <div
                                                className="icon"
                                                dangerouslySetInnerHTML={{ __html: career.ImageUrl1 }}
                                            ></div> */}
                                            <div className="ms-3">
                                                <h5 className="card-title">{career.Title}</h5>
                                                <p className="card-text">{career.Description1}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {/* <p className='text-center'>No data available.</p> */}
                        </div>
                    </div>
                </section>

                {/* Modal */}
                {selectedCareer && (
                    <div className="modal-overlay" onClick={() => setSelectedCareer(null)}>
                        <div className="custom-modal" onClick={e => e.stopPropagation()}>
                            <button className="close-btn" onClick={() => setSelectedCareer(null)}>&times;</button>
                            <h4>{selectedCareer.Title}</h4>
                            <p>{selectedCareer.Description2}</p>
                        </div>
                    </div>
                )}

                <style>
                    {`
                    .career-card {
                        transition: transform 0.3s ease, box-shadow 0.3s ease;
                    }

                    .career-card:hover {
                        transform: scale(1.05);
                        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.12),
                            0 4px 8px rgba(0, 0, 0, 0.06);
                    }

                    .career-icon {
                        font-size: 2rem;
                        color: #007bff;
                    }

                    .modal-overlay {
                        position: fixed;
                        top: 0; left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0, 0, 0, 0.5);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 1050;
                    }

                    .custom-modal {
                        background: white;
                        padding: 2rem;
                        border-radius: 12px;
                        max-width: 500px;
                        width: 100%;
                        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
                        animation: fadeInScale 0.3s ease;
                    }

                    .close-btn {
                        position: absolute;
                        top: 1rem;
                        right: 1rem;
                        background: none;
                        border: none;
                        font-size: 1.5rem;
                        cursor: pointer;
                    }

                    @keyframes fadeInScale {
                        from {
                            opacity: 0;
                            transform: scale(0.9);
                        }
                        to {
                            opacity: 1;
                            transform: scale(1);
                        }
                    }
                    `}
                </style>
            </Base>
        </>
    );
}
