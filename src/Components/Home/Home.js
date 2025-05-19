import React, { useEffect, useState } from "react";
import Base from "../Config/Base";
import AOS from "aos";
import "aos/dist/aos.css";
import ScrollToTop from "./../Config/ScrollTop";
import axios from "axios";
import { BASE_API_URL, BASE_IMAGE_API_URL } from "../Config/Config";
import C1Img from './1.png';
import C2Img from './2.png';
import C3Img from './3.png';
import C4Img from './4.jpg';

export default function Home() {
  useEffect(() => {
    AOS.init({
      duration: 600,
      easing: "ease-in-out",
      once: true,
      mirror: false,
    });
  }, []);

  const [capabilitiesData, setCapabilitiesData] = useState(null);
  const [featureData, setFeatureData] = useState(null);
  const [featureData0, setFeatureData0] = useState(null);
  const [randdData, setRanddData] = useState(null);
  const [bannersData, setBannersData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchContentByType = async (type) => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_API_URL}CWIRoutes/GetContentByType`, {
        params: {
          OrgId: 9330,
          Type: type,
        },
      });
      setLoading(false);
      return response.data.ResultData;
    } catch (error) {
      setLoading(false);
      console.error(`Error fetching ${type}:`, error);
      return null;
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      const getOrFetch = async (key, type) => {
        const cached = sessionStorage.getItem(key);
        if (cached) return JSON.parse(cached);

        const data = await fetchContentByType(type);
        if (data) sessionStorage.setItem(key, JSON.stringify(data));
        return data;
      };

      const capabilities = await getOrFetch("capabilitiesData", "Capabilities");
      const banners = await getOrFetch("bannersData", "Banners");
      const features = await getOrFetch("featuresData", "Features");
      const randd = await getOrFetch("randdData", "R&D");

      setCapabilitiesData(capabilities);
      console.log(capabilities)
      setFeatureData(features?.slice(1));
      setFeatureData0(features?.[0]);
      setRanddData(randd);
      setBannersData(banners);
    };

    fetchAll();
  }, []);

  return (
    <>
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
      <ScrollToTop />
      <Base>
        {loading && (
          <div className="loading-overlay">
            <div className="spinner">Loading...</div>
          </div>
        )}

        <section id="hero" className="hero section dark-background">
          {bannersData?.[0]?.ImageUrl1 && (
            <div
              className="hero-bg"
              style={{
                background: `linear-gradient(to right, color-mix(in srgb, var(--background-color), transparent 90%), var(--background-color)), url(https://drive.google.com/uc?export=view&id=13GJgGVsxw35v_GjzWF2u0O0G8yO4SFwM) center top no-repeat`,
                backgroundSize: "cover",
              }}
            ></div>
          )}
          <div
            id="hero-carousel"
            className="carousel carousel-fade"
            data-bs-ride="carousel"
            data-bs-interval="5000"
          >
            <div className="container position-relative">
              {bannersData &&
                bannersData?.map((item, index) => (
                  <div
                    className={`carousel-item ${index === 0 ? "active" : ""}`}
                    key={index}
                  >
                    <div className="carousel-container">
                      <h2>{item.Title}</h2>
                      <p>{item.Description1}</p>
                      <a href="#" className="btn-get-started">
                        Read More
                      </a>
                    </div>
                  </div>
                ))}

              <a
                className="carousel-control-prev"
                href="#hero-carousel"
                role="button"
                data-bs-slide="prev"
              >
                <span
                  className="carousel-control-prev-icon bi bi-chevron-left"
                  aria-hidden="true"
                ></span>
              </a>

              <a
                className="carousel-control-next"
                href="#hero-carousel"
                role="button"
                data-bs-slide="next"
              >
                <span
                  className="carousel-control-next-icon bi bi-chevron-right"
                  aria-hidden="true"
                ></span>
              </a>

              <ol className="carousel-indicators">
                {bannersData &&
                  bannersData.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      data-bs-target="#hero-carousel"
                      data-bs-slide-to={index}
                      className={index === 0 ? "active" : ""}
                      aria-current={index === 0 ? "true" : undefined}
                      aria-label={`Slide ${index + 1}`}
                    ></button>
                  ))}
              </ol>
            </div>
          </div>
        </section>

        <section id="featured-services" className="featured-services section">
          <div className="container">
            <h2 className="text-center">Our Capabilities</h2>
            <div className="row gy-4">
              {capabilitiesData &&
                capabilitiesData?.map((item, index) => (
                  <div
                    className="col-lg-3 col-md-6"
                    data-aos="fade-up"
                    data-aos-delay="200"
                    key={item.Id}
                  >
                    <div className="service-item item-cyan position-relative">
                      <div
                        className="icon"
                        dangerouslySetInnerHTML={{ __html: item.ImageUrl1 }}
                      ></div>
                      <a
                        href="capability-details"
                        className="stretched-link text-decoration-none text-dark"
                      >
                        <h3>{item.Title}</h3>
                      </a>
                      <p>{item.Description1}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>

        <section id="about" className="about section light-background">
          <div className="container">
            <div className="row gy-4">
              <div
                className="col-lg-6 position-relative align-self-start"
                data-aos="fade-up"
                data-aos-delay="100"
              >
                <img src={C4Img} className="img-fluid rounded" alt="" />
                <a
                  // href="https://www.youtube.com/watch?v=Y7f98aduVJ8"
                  className="glightbox pulsating-play-btn"
                ></a>
              </div>
              <div
                className="col-lg-6 content"
                data-aos="fade-up"
                data-aos-delay="200"
              >
                {randdData &&
                  randdData?.map((item, index) => (
                    <div key={index}>
                      <h3>{item.Title}</h3>
                      <p className="fst-italic">{item.Description1}</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="features section">
          <div className="container section-title" data-aos="fade-up">
            <h2>{featureData0 && featureData0?.Title}</h2>
            <p>{featureData0 && featureData0?.Description1}</p>
          </div>

          <div className="container">
            {featureData &&
              featureData?.map((item, indx) => {
                const isEven = indx % 2 === 0;

                return (
                  <div
                    className="row gy-4 align-items-center features-item"
                    key={indx}
                  >
                    {/* Image Column */}
                    <div
                      className={`col-md-5 d-flex align-items-center ${isEven ? "order-1 order-md-1" : "order-1 order-md-2"
                        }`}
                      data-aos="zoom-out"
                      data-aos-delay="100"
                    >
                      <img
                        src={`${BASE_IMAGE_API_URL}${item.ImageUrl1}`}
                        className="img-fluid rounded"
                        alt={`Feature ${indx + 1}`}
                      />
                    </div>

                    {/* Content Column */}
                    <div
                      className={`col-md-7 ${isEven ? "order-2 order-md-2" : "order-2 order-md-1"
                        }`}
                      data-aos="fade-up"
                      data-aos-delay="100"
                    >
                      <h3>{item.Title}</h3>
                      <p className="fst-italic">{item.Description1}</p>
                      <ul>{item.Description2}</ul>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>

        <section className="about section light-background">
          <div className="container">
            <h3 className="text-center mb-3">Certifications</h3>
            <div className="row justify-content-center align-items-center">
              <div className="col-4 d-flex justify-content-center">
                <img src={C1Img} className="img-fluid w-75 rounded shadow certification-img" alt="C1" />
              </div>
              <div className="col-4 d-flex justify-content-center">
                <img src={C2Img} className="img-fluid w-75 rounded shadow certification-img" alt="C2" />
              </div>
              <div className="col-4 d-flex justify-content-center">
                <img src={C3Img} className="img-fluid w-75 rounded shadow certification-img" alt="C3" />
              </div>
            </div>
          </div>
        </section>

        <style>
          {`
            .certification-img {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }

          .certification-img:hover {
            transform: scale(1.05);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
          }
          `}
        </style>
      </Base>
    </>
  );
}
