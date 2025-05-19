import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { BASE_API_URL } from './Config';

const Base = ({ children }) => {

    const location = useLocation();
    const currentPath = location.pathname;
    const [showChat, setShowChat] = useState(false);
    const [showEnquiry, setShowEnquiry] = useState(false);
    const [catDropDowns, setCatDropDowns] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchContentByType();
    }, []);

    const fetchContentByType = async (type) => {
        setLoading(true);
    
        // Check sessionStorage first
        const cachedData = sessionStorage.getItem("categoryItems");
        if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            setCatDropDowns(parsedData);
            setLoading(false);
            return parsedData;
        }
    
        try {
            const response = await axios.get(`${BASE_API_URL}ADMINRoutes/GetDDLItems?OrgId=9330&UserId=1`);
            const allItems = response.data.ResultData;
    
            const categoryItems = allItems.filter(item => item.DDLName === "Categories");
    
            // Save to sessionStorage
            sessionStorage.setItem("categoryItems", JSON.stringify(categoryItems));
    
            setCatDropDowns(categoryItems);
            setLoading(false);
            return categoryItems;
        } catch (error) {
            console.error(`Error fetching ${type}:`, error);
            setLoading(false);
            return null;
        }
    };    

    return (
        <>
            <header id="header" className="header d-flex align-items-center fixed-top">
                <div className="container-fluid container-xl position-relative d-flex align-items-center justify-content-between">
                    <a className="logo d-flex align-items-center text-decoration-none">
                        <img src="assets/img/logo.png" alt="" />
                        <h1 className="sitename">CWI</h1>
                    </a>
                    <nav id="navmenu" className="navmenu">
                        <ul>
                            <li><Link to='/home' className={`text-decoration-none ${currentPath === '/' ? 'active' : ''}`}>Home</Link></li>
                            <li className="dropdown "><a href="#" className='text-decoration-none'><span>Products</span> <i className="bi bi-chevron-down toggle-dropdown"></i></a>
                                <ul>
                                    {catDropDowns && catDropDowns?.map((item, indx) => (
                                        <li key={indx}><Link to={`/products/${item.ItemId}`} className='text-decoration-none'>{item.ItemValue}</Link></li>
                                    ))}

                                    {/* <li><Link to='/product2' className='text-decoration-none'>Product-2</Link></li>
                                    <li><Link to='/product3' className='text-decoration-none'>Product-3</Link></li>
                                    <li><Link to='/product4' className='text-decoration-none'>Product-4</Link></li>
                                    <li><Link to='/product5' className='text-decoration-none'>Product-5</Link></li>
                                    <li><Link to='/product6' className='text-decoration-none'>Product-6</Link></li>
                                    <li><Link to='/product7' className='text-decoration-none'>Product-7</Link></li> */}
                                </ul>
                            </li>
                            {/* <li><a className='text-decoration-none' style={{ cursor: 'pointer' }} onClick={() => setShowEnquiry(true)}>Enquiry</a></li> */}
                            {/* <li><Link to='/about' className={`text-decoration-none ${currentPath === '/about' ? 'active' : ''}`}>About</Link></li> */}
                            <li><Link to='/careers' className={`text-decoration-none ${currentPath === '/careers' ? 'active' : ''}`}>Careers</Link></li>
                            {/* <li><Link to='/team' className={`text-decoration-none ${currentPath === '/team' ? 'active' : ''}`}>Team</Link></li> */}
                            {/* <li><Link to='/blog' className='text-decoration-none'>Blog</Link></li> */}
                            <li><Link to='/contact' className='text-decoration-none'>Contact</Link></li>
                            <li><Link to='/' className='text-decoration-none text-warning'
                                onClick={() => {
                                    localStorage.clear();
                                    sessionStorage.clear();
                                  }}
                            >Logout</Link></li>
                        </ul>
                        <i className="mobile-nav-toggle d-xl-none bi bi-list"></i>
                    </nav>
                </div>
            </header>

            <main className="main">
                {children}
            </main>

            <footer id="footer" className="footer dark-background">
                {/* <div className="footer-newsletter">
                    <div className="container">
                        <div className="row justify-content-center text-center">
                            <div className="col-lg-6">
                                <h4>Join Our Newsletter</h4>
                                <p>Subscribe to our newsletter and receive the latest news about our products and services!</p>
                                <form action="forms/newsletter.php" method="post" className="php-email-form">
                                    <div className="newsletter-form"><input type="email" name="email" /><input type="submit" value="Subscribe" /></div>
                                    <div className="loading">Loading</div>
                                    <div className="error-message"></div>
                                    <div className="sent-message">Your subscription request has been sent. Thank you!</div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div> */}

                <div className="container footer-top">
                    <div className="row gy-4">
                        <div className="col-lg-4 col-md-6 footer-about">
                            <a href="index.html" className="d-flex align-items-center">
                                <span className="sitename">Cooperwind India Pvt Ltd  </span>
                            </a>
                            <div className="footer-contact pt-3">
                                <p>S.F.No.269/1E, Thiruneermalai main road,</p>
                                <p>Thirumudivakkam, Chennai, 600044</p>
                                <p className="mt-3"><strong>Phone:</strong> <span>+91 8939896671</span></p>
                                <p><strong>Email:</strong> <span>Info@cooperwind.com</span></p>
                            </div>
                        </div>

                        <div className="col-lg-2 col-md-3 footer-links">
                            <h4>Useful Links</h4>
                            <ul>
                                <li><i className="bi bi-chevron-right"></i> <Link to='/home' className='text-decoration-none'>Home</Link></li>
                                <li><i className="bi bi-chevron-right"></i> <Link to='/contact' className='text-decoration-none'>Contact us</Link></li>
                                <li><i className="bi bi-chevron-right"></i> <Link to='/blog' className='text-decoration-none'>Blog</Link></li>
                                <li><i className="bi bi-chevron-right"></i> <Link to='/careers' className='text-decoration-none'>Careers</Link></li>
                            </ul>
                        </div>

                        <div className="col-lg-2 col-md-3 footer-links">
                            <h4>Quick Links</h4>
                            <ul>
                                <li><i className="bi bi-chevron-right"></i> <a >Supplier portal</a></li>
                                <li><i className="bi bi-chevron-right"></i> <a >Custmer portal</a></li>
                                {/* <li><i className="bi bi-chevron-right"></i> <a >Product Management</a></li>
                                <li><i className="bi bi-chevron-right"></i> <a >Marketing</a></li> */}
                            </ul>
                        </div>

                        <div className="col-lg-4 col-md-12">
                            <h4>Follow Us</h4>
                            <p>Stay connected with us on social media for the latest updates, behind-the-scenes content, and exciting announcements. Join our community and be part of our journey.</p>
                            <div className="social-links d-flex">
                                {/* <a href=""><i className="bi bi-twitter-x"></i></a>
                                <a href=""><i className="bi bi-facebook"></i></a>
                                <a href=""><i className="bi bi-instagram"></i></a>
                                <a href=""><i className="bi bi-linkedin"></i></a> */}
                            </div>
                        </div>

                    </div>
                </div>

                <div className="container copyright text-center mt-4">
                    <p>© <span>Copyright</span> <strong className="px-1 sitename">CWI</strong> <span>All Rights Reserved</span></p>
                    <div className="credits">
                        Designed by <a href="#">Cooperwind</a>
                    </div>
                </div>

            </footer>
            <button
                onClick={() => setShowChat(prev => !prev)}
                className="chatbot-toggle-btn"
            >
                <i className="bi bi-chat-dots-fill"></i>
            </button>

            {showChat && (
                <div className="chatbot-box">
                    <div className="chatbot-header">
                        <span>Support Chat</span>
                        <button onClick={() => setShowChat(false)} className="close-chat">&times;</button>
                    </div>
                    <div className="chatbot-body">
                        <div className="chatbot-messages">
                            <p className="bot-message">Hello! How can we assist you today? <span className="emoji-bounce">😊</span></p>
                            {/* Add more messages dynamically if needed */}
                        </div>
                    </div>
                    <div className="chatbot-input">
                        <input
                            type="text"
                            placeholder="Type your message..."
                            className="form-control"
                        />
                        <button className="btn text-white" style={{ backgroundColor: '#284e62' }}>Send</button>
                    </div>
                </div>
            )}

            <style>
                {`
                .emoji-bounce {
                    display: inline-block;
                    animation: bounce 1.2s infinite ease-in-out;
                    }

                    @keyframes bounce {
                    0%, 100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-6px);
                    }
                    }
                .chatbot-toggle-btn {
                        position: fixed;
                        bottom: 20px;
                        right: 20px;
                        background-color: #284e62;
                        color: white;
                        border: none;
                        border-radius: 50%;
                        width: 60px;
                        height: 60px;
                        font-size: 24px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 9999;
                        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                        cursor: pointer;
                        transition: transform 0.3s ease;
                    }
                    .chatbot-toggle-btn:hover {
                        transform: scale(1.1);
                    }

                    .chatbot-box {
                        position: fixed;
                        bottom: 90px;
                        right: 20px;
                        width: 300px;
                        height: 400px;
                        background: white;
                        border: 1px solid #ccc;
                        border-radius: 12px;
                        box-shadow: 0 6px 20px rgba(0,0,0,0.15);
                        z-index: 9999;
                        display: flex;
                        flex-direction: column;
                        overflow: hidden;
                    }

                    .chatbot-header {
                        background: #284e62;
                        color: white;
                        padding: 10px;
                        font-weight: bold;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }

                    .chatbot-body {
                        padding: 10px;
                        flex: 1;
                        overflow-y: auto;
                    }

                    .close-chat {
                        background: none;
                        border: none;
                        color: white;
                        font-size: 20px;
                        cursor: pointer;
                    }
                        .chatbot-messages {
                    padding: 10px;
                    flex: 1;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    }

                    .chatbot-input {
                    display: flex;
                    padding: 10px;
                    border-top: 1px solid #ddd;
                    gap: 10px;
                    }

                    .chatbot-input input {
                    flex: 1;
                    }

                    .bot-message {
                    background: #1e435;
                    padding: 8px 12px;
                    border-radius: 10px;
                    max-width: 80%;
                    margin-bottom: 8px;
                    }
                    .modal-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0,0,0,0.4);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 10000;
                        }

                        .modal-box {
                        background: white;
                        padding: 20px 25px;
                        border-radius: 10px;
                        width: 400px;
                        max-width: 90%;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                        }

                        .modal-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        }

                        .modal-header h5 {
                        margin: 0;
                        }

                        .close-modal {
                        background: none;
                        border: none;
                        font-size: 24px;
                        cursor: pointer;
                        }

                        .modal-body input,
                        .modal-body textarea {
                        width: 100%;
                        margin-top: 10px;
                        padding: 10px;
                        border: 1px solid #ddd;
                        border-radius: 5px;
                        }
                `}
            </style>

            {showEnquiry && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <div className="modal-header">
                            <h5>Enquiry Form</h5>
                            <button onClick={() => setShowEnquiry(false)} className="close-modal">&times;</button>
                        </div>
                        <form className="modal-body">
                            <div className="d-flex gap-2">
                                <input type="text" className='form-control' placeholder="First Name" required />
                                <input type="text" className='form-control' placeholder="Last Name" required />
                            </div>
                            <input type="email" className='form-control' placeholder="Email" required />
                            <textarea rows="4" className='form-control' placeholder="Leave your message..." required></textarea>
                            <button type="submit" className="btn text-white w-100 mt-3" style={{ backgroundColor: '#284e62' }}>Send Message</button>
                        </form>
                    </div>
                </div>
            )}

        </>
    )
};

export default Base;