import React, { useState, useEffect } from 'react';
import Base from '../Config/Base.js';
import ProductImg from '../Assets/Images/product-2.jpg';
import ScrollToTop from '../Config/ScrollTop';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { BASE_API_URL, BASE_IMAGE_API_URL } from '../Config/Config.js';

export default function CapabilityDetails() {

    const { CatId } = useParams();
    const [loading, setLoading] = useState(false);
    const [productsData, setProductsData] = useState([]);
    const [catchedData, setCatchedData] = useState({});

    useEffect(() => {
        const loadData = async () => {
            const cachedCategories = sessionStorage.getItem("categoryItems");

            if (cachedCategories) {
                const parsedCategories = JSON.parse(cachedCategories);
                const match = parsedCategories.find(item => item.ItemId.toString() === CatId);

                if (match) {
                    setCatchedData(match)
                    console.log(match);
                    return;
                }
            }
        };

        loadData();
    }, [CatId]);

    useEffect(() => {
        fetchProductsByCatId();
    }, [CatId]);

    const fetchProductsByCatId = async (type) => {
        setLoading(false);
        try {
            setLoading(false);
            const response = await axios.get(`${BASE_API_URL}CWIRoutes/GetProducts?OrgId=9330&CategoryId=${CatId}`);
            setProductsData(response.data.ResultData);
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
                {loading && (
                    <div className="loading-overlay">
                        <div className="spinner">Loading...</div>
                    </div>
                )}
                {/* Page Title */}
                <div
                    className="page-title dark-background"
                    style={{
                        backgroundColor: '#222',
                        backgroundImage: catchedData?.DisplayValue
                            ? `url(${BASE_IMAGE_API_URL}${catchedData.DisplayValue})`
                            : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                    }}
                >
                    <div className="container position-relative">
                        <h1>{catchedData?.ItemValue}</h1>
                        <p>
                            Smart cleaning solutions designed for efficient, safe, and automated maintenance of solar panel systems.
                        </p>
                        <nav className="breadcrumbs">
                            <ol>
                                <li><a href="/">Home</a></li>
                                <li className="current">Photovoltaic Cleaning Robot</li>
                            </ol>
                        </nav>
                    </div>
                </div>

                <section id="pv-cleaning-robot" className="section">
                    <div className="container">
                        <div className="row gy-4">
                            {productsData?.length > 0 && productsData?.map((product, index) => (
                                <div
                                    className="col-md-6 col-lg-4 mb-4"
                                    key={product.id}
                                    data-aos="fade-up"
                                    data-aos-delay={`${index * 100}`}
                                >
                                    <div className="flip-card">
                                        <div className="flip-card-inner">
                                            <div className="flip-card-front">
                                                <img
                                                    src={`${BASE_IMAGE_API_URL}${product.ImageUrl}`}
                                                    className="img-fluid w-100 h-100 object-fit-cover"
                                                    alt={product.ProductName}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <h5 className='text-dark mt-5'>{product.ProductName}</h5>
                                </div>
                            ))}
                        </div>
                        <a href='home' className='text-decoration-none'>
                            <button className='btn btn-secondary d-flex m-auto' type='submit'>Back To Capabilities</button>
                        </a>
                    </div>
                </section>
            </Base>
        </>
    );
}
