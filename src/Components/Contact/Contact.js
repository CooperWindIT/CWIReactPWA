import React, { useState } from 'react';
import Base from '../Config/Base.js';
import ScrollToTop from './../Config/ScrollTop';

export default function Contact() {

    return (
        <>
            <ScrollToTop />
            <Base>
                {/* Page Title */}
                <div className="page-title dark-background">
                    <div className="container position-relative">
                        <h1>Contact</h1>
                        <p>
                            Connect with Cooperwind India (CWI) for top-notch digital solutions.
                            Whether it's web development, software services, or IT consulting, we’re here to help you grow.
                        </p>
                        <nav className="breadcrumbs">
                            <ol>
                                <li><a href="/">Home</a></li>
                                <li className="current">Contact</li>
                            </ol>
                        </nav>
                    </div>
                </div>

                {/* Contact Section */}
                <section id="contact" className="contact section">
                    <div className="container" data-aos="fade-up" data-aos-delay="100">
                        <div className="row gy-4">
                            <div className="col-lg-6">
                                <div className="row gy-4">
                                    <div className="col-lg-12">
                                        <div
                                            className="info-item d-flex flex-column justify-content-center align-items-center border border-info rounded"
                                            data-aos="fade-up"
                                            data-aos-delay="200"
                                        >
                                            <i className="bi bi-geo-alt"></i>
                                            <h3>Address</h3>
                                            <p>5th Floor, CWI Towers, Thirumudivakkam, Chennai, 600044</p>
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <div
                                            className="info-item d-flex flex-column justify-content-center align-items-center border border-info rounded"
                                            data-aos="fade-up"
                                            data-aos-delay="300"
                                        >
                                            <i className="bi bi-telephone"></i>
                                            <h3>Call Us</h3>
                                            <p>+91 91234 56789</p>
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <div
                                            className="info-item d-flex flex-column justify-content-center align-items-center border border-info rounded"
                                            data-aos="fade-up"
                                            data-aos-delay="400"
                                        >
                                            <i className="bi bi-envelope"></i>
                                            <h3>Email Us</h3>
                                            <p>Info@cooperwind.com</p>
                                        </div>
                                    </div>

                                </div>
                            </div>

                            <div className="col-lg-6 ">
                                <form
                                    action="forms/contact.php"
                                    method="post"
                                    className="php-email-form border border-info rounded"
                                    data-aos="fade-up"
                                    data-aos-delay="500"
                                >
                                    <h6>Enquiry Form</h6>
                                    <div className="row gy-4">
                                        <div className="col-md-6">
                                            <input
                                                type="text"
                                                name="name"
                                                className="form-control"
                                                placeholder="Your Name"
                                                required
                                            />
                                        </div>

                                        <div className="col-md-6">
                                            <input
                                                type="email"
                                                name="email"
                                                className="form-control"
                                                placeholder="Your Email"
                                                required
                                            />
                                        </div>

                                        <div className="col-md-12">
                                            <input
                                                type="text"
                                                name="subject"
                                                className="form-control"
                                                placeholder="Subject"
                                                required
                                            />
                                        </div>

                                        <div className="col-md-12">
                                            <textarea
                                                name="message"
                                                className="form-control"
                                                rows="4"
                                                placeholder="Message"
                                                required
                                            ></textarea>
                                        </div>

                                        <div className="col-md-12 text-center">
                                            <div className="loading">Loading</div>
                                            <div className="error-message"></div>
                                            <div className="sent-message">Your message has been sent. Thank you!</div>
                                            <button type="submit">Send Message</button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Google Maps Embed */}
                        <div className="mt-5 rounded" data-aos="fade-up" data-aos-delay="200">
                            <iframe
                                style={{ border: 0, width: '100%', height: '370px' }}
                                src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d48389.78314118045!2d-74.006138!3d40.710059!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c25a22a3bda30d%3A0xb89d1fe6bc499443!2sDowntown%20Conference%20Center!5e0!3m2!1sen!2sus!4v1676961268712!5m2!1sen!2sus"
                                frameBorder="0"
                                allowFullScreen
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                title="CWI Location"
                            ></iframe>
                        </div>
                    </div>
                </section>
            </Base>
        </>
    )
}