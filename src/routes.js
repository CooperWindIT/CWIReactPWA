// routes.js
import Home from "./Components/Home/Home";
import Blog from "./Components/Blog/Blog";
import Team from "./Components/Team/Team";
import Contact from "./Components/Contact/Contact";
import About from "./Components/About/About";
import Lifting from "./Components/Products/Lifting/Lifting.js";
import MixingTowerUnit from "./Components/Products/MixingTowerUnit/MixingTowerUnit.js";
import PhotovoltaicCleaningRobot from "./Components/Products/PhotovoltaicCleaningRobot/PhotovoltaicCleaningRobot.js";
import FallPreventionEquipment from "./Components/Products/FallPreventionEquipment/FallPreventionEquipment.js";
import WindPowerSling from "./Components/Products/WindPowerSling/WindPowerSling.js";
import ClimbingGear from "./Components/Products/ClimibingGears/ClimibingGears.js";
import TowerCylinderAccessories from "./Components/Products/TowerCylinderAccessories/TowerCylinderAccessories.js";
import Signin from "./Components/Auth/Signin.js";
import Careers from "./Components/Careers/Careers.js";
import Products from "./Components/CatProducts/Product.js";
import CapabilityDetails from "./Components/Home/CapabilityDetails.js";

const routes = [
    { path: "/", element: <Signin /> },
    { path: "/home", element: <Home /> },
    { path: "/careers", element: <Careers /> },
    { path: "/team", element: <Team /> },
    { path: "/blog", element: <Blog /> },
    { path: "/contact", element: <Contact /> },
    { path: "/about", element: <About /> },
    { path: "/product1", element: < Lifting/> },
    { path: "/products/:CatId", element: < Products/> },
    { path: "/capability-details", element: < CapabilityDetails/> },
    { path: "/product2", element: < MixingTowerUnit/> },
    { path: "/product3", element: < PhotovoltaicCleaningRobot/> },
    { path: "/product4", element: < FallPreventionEquipment/> },
    { path: "/product5", element: < WindPowerSling/> },
    { path: "/product6", element: < ClimbingGear/> },
    { path: "/product7", element: < TowerCylinderAccessories/> },
];

export default routes;

