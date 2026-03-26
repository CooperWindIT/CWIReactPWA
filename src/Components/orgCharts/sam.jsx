sam1
  <>
import React, { useState } from "react";
import ReactFlow, {
  Controls,
  MiniMap,
  Background,
  ReactFlowProvider,
  Handle,
  Position,
  applyNodeChanges,
} from "reactflow";
import "reactflow/dist/style.css";
import { Popover } from "antd";
import "antd/dist/reset.css"; // Ant Design
import "./org.css"; // Custom styles
import EmployeeProfileModal from "./empdetails";
import { disable } from "workbox-navigation-preload";

// Sample data
const initialNodes = [
  {
    id: "1",
    type: "mdNode",
    data: {
      label: "Maturi Venkateswara Rao",
      role: "Director",
      email: "md@company.com",
      phone: "+91 9876543210",
    },
    position: { x: 350, y: -100 },
  },

  {
    id: "2",
    type: "deptNode",
    data: { label: "Plant Head", role: "Department" },
    position: { x: -500, y: 250 },
  },
  {
    id: "3",
    type: "deptNode",
    data: { label: "Finance", role: "Department" },
    position: { x: 200, y: 250 },
  },
  {
    id: "4",
    type: "deptNode",
    data: { label: "HR", role: "Department" },
    position: { x: 350, y: 250 },
  },
  {
    id: "5",
    type: "deptNode",
    data: { label: "Admin", role: "Department" },
    position: { x: 500, y: 250 },
  },
  {
    id: "6",
    type: "deptNode",
    data: { label: "Purchase", role: "Department" },
    position: { x: 650, y: 250 },
  },
  {
    id: "7",
    type: "deptNode",
    data: { label: "Planning", role: "Department" },
    position: { x: 800, y: 250 },
  },
  {
    id: "8",
    type: "deptNode",
    data: { label: "Sales", role: "Department" },
    position: { x: 950, y: 250 },
  },
  {
    id: "9",
    type: "deptNode",
    data: { label: "Logistics", role: "Department" },
    position: { x: 1100, y: 250 },
  },
  {
    id: "10",
    type: "deptNode",
    data: { label: "Project", role: "Department" },
    position: { x: 1250, y: 250 },
  },
  {
    id: "11",
    type: "deptNode",
    data: { label: "IT", role: "Department" },
    position: { x: 1400, y: 250 },
  },


  {
    id: "12",
    type: "empNode",
    data: {
      label: "Govarthanan M.",
      role: "Assistant VP",
      email: "govarthanan@company.com",
      phone: "+91 9876500011",
    },
    position: { x: -500, y: 50 },
  },
  {
    id: "13",
    type: "empNode",
    data: {
      label: "Reshma R.",
      role: "AGM",
      email: "reshma@company.com",
      phone: "+91 9876500022",
    },
    position: { x: 350, y: 50 },
  },
  {
    id: "14",
    type: "empNode",
    data: {
      label: "Saranyadevi V.",
      role: "Sr Manager",
      email: "saranyadevi@company.com",
      phone: "+91 9876500033",
    },
    position: { x: 900, y: 50 },
  },
  {
    id: "15",
    type: "empNode",
    data: {
      label: "Soundariya V.",
      role: "Project Lead",
      email: "soundariya@company.com",
      phone: "+91 9876500044",
    },
    position: { x: 1340, y: 50 },
  },



  {
    id: "16",
    type: "subDeptNode",
    data: { label: "Production", role: "Sub Department", parentDept: "2" },
    position: { x: -950, y: 350 },
  },

  {
    id: "17",
    type: "subDeptNode",
    data: { label: "safety", role: "Sub Department", parentDept: "2" },
    position: { x: -800, y: 350 },
  },
  {
    id: "18",
    type: "subDeptNode",
    data: { label: "Stores", role: "Sub Department", parentDept: "2" },
    position: { x: -650, y: 350 },
  },
  {
    id: "19",
    type: "subDeptNode",
    data: { label: "Quality", role: "Sub Department", parentDept: "2" },
    position: { x: -500, y: 350 },
  },
  {
    id: "20",
    type: "subDeptNode",
    data: { label: "NPD", role: "Sub Department", parentDept: "2" },
    position: { x: -350, y: 350 },
  },
  {
    id: "21",
    type: "subDeptNode",
    data: { label: "Design", role: "Sub Department", parentDept: "2" },
    position: { x: -200, y: 350 },
  },
  {
    id: "22",
    type: "subDeptNode",
    data: { label: "Welding Inspection", role: "Sub Department", parentDept: "2" },
    position: { x: -50, y: 350 },
  },

  {
    id: "23",
    type: "empNode",
    data: {
      label: "Venkatesh c.",
      role: "Senior Engineer",
      parentDept: "2",
      email: "venkatesh@company.com",
      phone: "+91 9876500055",
    },
    position: { x: -1100, y: 450 },
  },
  {
    id: "24",
    type: "empNode",
    data: {
      label: "Iyyanar S.",
      role: "Junior Engineer",
      parentDept: "2",
      email: "iyyanar@company.com",
      phone: "+91 9876500066",
    },
    position: { x: -1200, y: 600 },
  },
  {
    id: "25",
    type: "empNode",
    data: {
      label: "Shopfloor Employees",
      role: "",
      parentDept: "2",
      email: "shop@company.com",
      phone: "+91 9876500066",
    },
    position: { x: -1050, y: 600 },
  },

  {
    id: "26",
    type: "empNode",
    data: {
      label: "Madhan Kumar P.",
      role: "Executive",
      parentDept: "2",
      email: "madhan@company.com",
      phone: "+91 9876500077",
    },
    position: { x: -950, y: 450 },
  },

  {
    id: "27",
    type: "empNode",
    data: {
      label: "Sakthivel S.",
      role: "Executive",
      parentDept: "2",
      email: "sakthivel@company.com",
      phone: "+91 9876500088",
    },
    position: { x: -800, y: 450 },
  },
  {
    id: "28",
    type: "empNode",
    data: {
      label: "Mugesh S.",
      role: "Executive",
      parentDept: "2",
      email: "mugesh@company.com",
      phone: "+91 9876500099",
    },
    position: { x: -900, y: 600 },
  },
  {
    id: "29",
    type: "empNode",
    data: {
      label: "Seshan S.",
      role: "Assistant Executive",
      parentDept: "2",
      email: "seshan@company.com",
      phone: "+91 9876500100",
    },
    position: { x: -750, y: 600 },
  },
  {
    id: "30",
    type: "empNode",
    data: {
      label: "Vignesh M.",
      role: "Assistant Executive",
      parentDept: "2",
      email: "vignesh@company.com",
      phone: "+91 9876500111",
    },
    position: { x: -600, y: 600 },
  },

  {
    id: "31",
    type: "empNode",
    data: {
      label: "Thyagarajan P.",
      role: "Senior Engineer",
      parentDept: "2",
      email: "thyagarajan@company.com",
      phone: "+91 9876500088",
    },
    position: { x: -450, y: 600 },
  },
  {
    id: "32",
    type: "empNode",
    data: {
      label: "Anandharaj G.",
      role: "Senior Engineer",
      parentDept: "2",
      email: "anandharaj@company.com",
      phone: "+91 9876500099",
    },
    position: { x: -650, y: 450 },
  },
  {
    id: "33",
    type: "empNode",
    data: {
      label: "Raja KirubakaranPaul T.",
      role: "Assistant Engineer",
      parentDept: "2",
      email: "raja@company.com",
      phone: "+91 9876500100",
    },
    position: { x: -650, y: 810 },
  },
  {
    id: "34",
    type: "empNode",
    data: {
      label: "Sliambarasan M.",
      role: "Assistant Engineer",
      parentDept: "2",
      email: "sliambarasan@company.com",
      phone: "+91 9876500111",
    },
    position: { x: -500, y: 810 },
  },
  {
    id: "35",
    type: "empNode",
    data: {
      label: "Hemamanimaran D.",
      role: "Assistant Engineer",
      parentDept: "2",
      email: "hemamanimara@company.com",
      phone: "+91 9876500122",
    },
    position: { x: -350, y: 810 },
  },
  {
    id: "36",
    type: "empNode",
    data: {
      label: "Sathish Kumar S.",
      role: "Assistant Engineer",
      parentDept: "2",
      email: "sathish@company.com",
      phone: "+91 9876500133",
    },
    position: { x: -200, y: 810 },
  },

  {
    id: "37",
    type: "empNode",
    data: {
      label: "To Be Filled",
      role: "Senior Engineer",
      parentDept: "2",
      email: "filled@company.com",
      phone: "+91 9876500133",
    },
    position: { x: -350, y: 450 },
  },
  {
    id: "38",
    type: "empNode",
    data: {
      label: "Senthil Kumar S.",
      role: "Deputy Manager",
      parentDept: "2",
      email: "senthil@company.com",
      phone: "+91 9876500133",
    },
    position: { x: -200, y: 450 },
  },
  {
    id: "39",
    type: "empNode",
    data: {
      label: "Madhan S.",
      role: "Junior Engineer",
      parentDept: "2",
      email: "madhan@company.com",
      phone: "+91 9876500133",
    },
    position: { x: -250, y: 600 },
  },

  {
    id: "40",
    type: "empNode",
    data: {
      label: "Parthipan C.",
      role: "Engineer - WeldinG Inspector",
      parentDept: "2",
      email: "parthipan@company.com",
      phone: "+91 9876500144",
    },
    position: { x: -50, y: 450 },
  },
  {
    id: "41",
    type: "empNode",
    data: {
      label: "Raja KirubakaranPaul T.",
      role: "Junior Engineer",
      parentDept: "2",
      email: "raja@company.com",
      phone: "+91 9876500155",
    },
    position: { x: -100, y: 600 },
  },
  {
    id: "42",
    type: "empNode",
    data: {
      label: "Suriya R.",
      role: "Junior Engineer",
      parentDept: "2",
      email: "suriya@company.com",
      phone: "+91 9876500166",
    },
    position: { x: 50, y: 600 },
  },
  {
    id: "43",
    type: "empNode",
    data: {
      label: "Sathish Kumar S.",
      role: "(GET) - Welding Inspection",
      parentDept: "2",
      email: "sathish@company.com",
      phone: "+91 9876500177",
    },
    position: { x: 50, y: 810 },
  },


  {
    id: "44",
    type: "empNode",
    data: {
      label: "Rajkumar M.",
      role: "Executive",
      parentDept: "3",
      email: "rajkumar@company.com",
      phone: "+91 9876500188",
    },
    position: { x: 120, y: 350 },
  },
  {
    id: "45",
    type: "empNode",
    data: {
      label: "Rajesh Kumar T.",
      role: "Finance Assistant",
      parentDept: "3",
      email: "rajeskumar@company.com",
      phone: "+91 9876500199",
    },
    position: { x: 200, y: 530 },
  },
  {
    id: "46",
    type: "empNode",
    data: {
      label: "Ravinath B.",
      role: "Senior Executive",
      parentDept: "4",
      email: "ravinath@company.com",
      phone: "+91 9876500200",
    },
    position: { x: 350, y: 350 },
  },
  {
    id: "47",
    type: "empNode",
    data: {
      label: "Shobana S.",
      role: "HR Assistant Executive",
      parentDept: "4",
      email: "shobana@company.com",
      phone: "+91 9876500211",
    },
    position: { x: 350, y: 530 },
  },


  {
    id: "48",
    type: "empNode",
    data: {
      label: "Gopi S.",
      role: "Associate",
      parentDept: "5",
      email: "gopi@company.com",
      phone: "+91 9876500222",
    },
    position: { x: 500, y: 530 },
  },
  {
    id: "49",
    type: "empNode",
    data: {
      label: "Jaganathan D.",
      role: "Junior Associate",
      parentDept: "5",
      email: "jaganathan@company.com",
      phone: "+91 9876500233",
    },
    position: { x: 650, y: 810 },
  },
  {
    id: "50",
    type: "empNode",
    data: {
      label: "Dillibabu E.",
      role: "Junior Associate",
      parentDept: "5",
      email: "dillibabu@company.com",
      phone: "+91 9876500244",
    },
    position: { x: 575, y: 670 },
  },
  {
    id: "51",
    type: "empNode",
    data: {
      label: "Venkatesan D.",
      role: "Junior Associate",
      parentDept: "5",
      email: "venkatesan@company.com",
      phone: "+91 9876500255",
    },
    position: { x: 425, y: 670 },
  },
  {
    id: "52",
    type: "empNode",
    data: {
      label: "Umamaheswarai V.",
      role: "Junior Associate",
      parentDept: "5",
      email: "umamaheswarai@company.com",
      phone: "+91 9876500266",
    },
    position: { x: 350, y: 810 },
  },
  {
    id: "53",
    type: "empNode",
    data: {
      label: "Gireesh Yaswanth P.",
      role: "Asst Engineer-backend developer",
      parentDept: "11",
      email: "gireeshyaswanth@company.com",
      phone: "+91 9876500277",
    },
    position: { x: 1300, y: 350 },
  },
  {
    id: "54",
    type: "empNode",
    data: {
      label: "Nalam Viswa Naga Chaitanya S.",
      role: "Asst Engineer-frontend developer",
      parentDept: "11",
      email: "nalamviswanagachaitanya@company.com",
      phone: "+91 9876500288",
    },
    position: { x: 1450, y: 350 },
  },


  {
    id: "55",
    type: "empNode",
    data: {
      label: "VinothKumar N.",
      role: "Senior Executive",
      parentDept: "6",
      email: "vinothkumar@company.com",
      phone: "+91 9876500299",
    },
    position: { x: 600, y: 350 },
  },
  {
    id: "56",
    type: "empNode",
    data: {
      label: "Sath Rock D.",
      role: "Deputy Manager - SCM",
      parentDept: "7",
      email: "sathrock@company.com",
      phone: "+91 9876500300",
    },
    position: { x: 800, y: 350 },
  },
  {
    id: "57",
    type: "empNode",
    data: {
      label: "Madhan Kumar P.",
      role: "Executive",
      parentDept: "7",
      email: "madhan@company.com",
      phone: "+91 9876500311",
    },
    position: { x: 750, y: 530 },
  },
  {
    id: "58",
    type: "empNode",
    data: {
      label: "Deepika G.",
      role: "Assistant",
      parentDept: "7",
      email: "deepika@company.com",
      phone: "+91 9876500322",
    },
    position: { x: 900, y: 530 },
  },
  {
    id: "59",
    type: "empNode",
    data: {
      label: "Muchanapalli Sravan Sai R.",
      role: "Assistant Manager",
      parentDept: "8",
      email: "muchanapallisravansai@company.com",
      phone: "+91 9876500333",
    },
    position: { x: 950, y: 350 },
  },
  {
    id: "60",
    type: "empNode",
    data: {
      label: "VinothKumar N.",
      role: "Senior Executive",
      parentDept: "9",
      email: "vinothkumar@company.com",
      phone: "+91 9876500299",
    },
    position: { x: 1150, y: 350 },
  },

  {
    id: "61",
    type: "empNode",
    data: {
      label: "Govarthanan M.",
      role: "Assistant VP",
      email: "govarthanan@company.com",
      phone: "+91 9876500011",
    },
    position: { x: -2175, y: 50 },
  },
  {
    id: "62",
    type: "deptNode",
    data: { label: "Production", role: "Sub Department" },
    position: { x: -2165, y: 250 },
  },
  {
    id: "63",
    type: "empNode",
    data: {
      label: "Venkatesh c.",
      role: "Senior Engineer",
      parentDept: "62",
      email: "venkatesh@company.com",
      phone: "+91 9876500055",
    },
    position: { x: -2175, y: 350 },
  },

  {
    id: "64",
    type: "empNode",
    data: {
      label: "Jayaseen K.",
      role: "Deputy Welding Associate",
      parentDept: "62",
      email: "jayaseen@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -3000, y: 600 },
  },
  {
    id: "65",
    type: "empNode",
    data: {
      label: "Bala Murugan S.",
      role: "Welding Associate",
      parentDept: "62",
      email: "bala@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -2850, y: 600 },
  },
  {
    id: "66",
    type: "empNode",
    data: {
      label: "Aridass I.",
      role: "Senior Associate",
      parentDept: "62",
      email: "aridass@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -2700, y: 600 },
  },
  {
    id: "67",
    type: "empNode",
    data: {
      label: "Bala Ganesan M.",
      role: "Associate",
      parentDept: "62",
      email: "bala@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -2550, y: 600 },
  },
  {
    id: "68",
    type: "empNode",
    data: {
      label: "Suresh Kumar M.",
      role: "Fitting Associate",
      parentDept: "62",
      email: "suresh@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -2400, y: 600 },
  },
  {
    id: "69",
    type: "empNode",
    data: {
      label: "To Be Filled.",
      role: "Deputy Welding Associate",
      parentDept: "62",
      email: "tobe@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -2250, y: 600 },
  },
  {
    id: "70",
    type: "empNode",
    data: {
      label: "Jothiraj R.",
      role: "(Assistant Engineer) - Robotic Welding",
      parentDept: "62",
      email: "jothiraj@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -2100, y: 600 },
  },
  {
    id: "71",
    type: "empNode",
    data: {
      label: "Santhirakumar P.",
      role: "Deputy Welding Associate",
      parentDept: "62",
      email: "santhirakumar@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -1950, y: 600 },
  },
  {
    id: "72",
    type: "empNode",
    data: {
      label: "Muruganantham P.",
      role: "Deputy Associate",
      parentDept: "62",
      email: "muruganantham@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -1800, y: 600 },
  },
  {
    id: "73",
    type: "empNode",
    data: {
      label: "Ramachandran C.",
      role: "Fitting Associate",
      parentDept: "62",
      email: "ramachandran@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -1650, y: 600 },
  },
  {
    id: "74",
    type: "empNode",
    data: {
      label: "Manikandan T.",
      role: "Helper",
      parentDept: "62",
      email: "manikandan@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -1500, y: 600 },
  },
  {
    id: "75",
    type: "empNode",
    data: {
      label: "Balaji S.",
      role: "Deputy Welding Associate",
      parentDept: "62",
      email: "balaji@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -1350, y: 600 },
  },

  {
    id: "76",
    type: "empNode",
    data: {
      label: "Ashokkumar V.",
      role: "Junior Robotic Welding Associate",
      parentDept: "62",
      email: "ashokkumar@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -2100, y: 750 },
  },
  {
    id: "77",
    type: "empNode",
    data: {
      label: "Thirunavukarasu A.",
      role: "Junior Robotic Welding Associate",
      parentDept: "62",
      email: "thirunavukarasu@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -1950, y: 750 },
  },
  {
    id: "78",
    type: "empNode",
    data: {
      label: "Karuppasamy S.",
      role: "Assistant Robo Welding",
      parentDept: "62",
      email: "karuppasamy@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -1800, y: 750 },
  },
  {
    id: "79",
    type: "empNode",
    data: {
      label: "Arunkumar P. P.",
      role: "Assistant Robo Welding",
      parentDept: "62",
      email: "arunkumar@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -2250, y: 750 },
  },
  {
    id: "80",
    type: "empNode",
    data: {
      label: "Rajkumar M.",
      role: "Helper",
      parentDept: "62",
      email: "rajkumar@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -2400, y: 750 },
  },




];

// Edges
const initialEdges = [
  {
    id: "e1-2",
    source: "12",
    sourceHandle: "bottom",
    target: "2",
    targetHandle: "top",
    // type: "smoothstep",
    animated: true,
    style: {
      stroke: "#112b10",
      strokeWidth: 2,
    },
    markerEnd: {
      type: "arrowclosed",
      color: "#0b3214",
    },
  },

  // { id: "e1-2", source: "12", sourceHandle: "bottom", target: "2", targetHandle: "top" },
  { id: "e1-3", source: "13", sourceHandle: "bottom", target: "3", targetHandle: "top" },
  { id: "e1-4", source: "13", sourceHandle: "bottom", target: "4", targetHandle: "top" },
  { id: "e1-5", source: "13", sourceHandle: "bottom", target: "5", targetHandle: "top" },
  { id: "e1-6", source: "14", sourceHandle: "bottom", target: "6", targetHandle: "top" },
  { id: "e1-7", source: "14", sourceHandle: "bottom", target: "7", targetHandle: "top" },
  { id: "e1-8", source: "14", sourceHandle: "bottom", target: "8", targetHandle: "top" },
  { id: "e1-9", source: "14", sourceHandle: "bottom", target: "9", targetHandle: "top" },
  { id: "e1-10", source: "15", sourceHandle: "bottom", target: "10", targetHandle: "top" },
  { id: "e1-11", source: "15", sourceHandle: "bottom", target: "11", targetHandle: "top" },

  { id: "e4-12", source: "1", sourceHandle: "bottom", target: "12", targetHandle: "top" },
  { id: "e5-13", source: "1", sourceHandle: "bottom", target: "13", targetHandle: "top" },
  { id: "e6-14", source: "1", sourceHandle: "bottom", target: "14", targetHandle: "top" },
  { id: "e7-15", source: "1", sourceHandle: "bottom", target: "15", targetHandle: "top" },

  { id: "e2-16", source: "2", sourceHandle: "bottom", target: "16", targetHandle: "top" },
  { id: "e1-17", source: "2", sourceHandle: "bottom", target: "17", targetHandle: "top" },
  { id: "e1-18", source: "2", sourceHandle: "bottom", target: "18", targetHandle: "top" },
  { id: "e1-19", source: "2", sourceHandle: "bottom", target: "19", targetHandle: "top" },
  { id: "e1-20", source: "2", sourceHandle: "bottom", target: "20", targetHandle: "top" },
  { id: "e1-21", source: "2", sourceHandle: "bottom", target: "21", targetHandle: "top" },
  { id: "e1-22", source: "2", sourceHandle: "bottom", target: "22", targetHandle: "top" },
  { id: "e1-23", source: "16", sourceHandle: "bottom", target: "23", targetHandle: "top" },
  { id: "e1-24", source: "23", sourceHandle: "bottom", target: "24", targetHandle: "top" },
  { id: "e1-25", source: "23", sourceHandle: "bottom", target: "25", targetHandle: "top" },
  { id: "e1-26", source: "17", sourceHandle: "bottom", target: "26", targetHandle: "top" },
  { id: "e1-27", source: "18", sourceHandle: "bottom", target: "27", targetHandle: "top" },
  { id: "e1-28", source: "27", sourceHandle: "bottom", target: "28", targetHandle: "top" },
  { id: "e1-29", source: "27", sourceHandle: "bottom", target: "29", targetHandle: "top" },
  { id: "e1-30", source: "27", sourceHandle: "bottom", target: "30", targetHandle: "top" },

  { id: "e1-31", source: "19", sourceHandle: "bottom", target: "31", targetHandle: "top" },
  { id: "e1-32", source: "19", sourceHandle: "bottom", target: "32", targetHandle: "top" },
  { id: "e1-33", source: "31", sourceHandle: "bottom", target: "33", targetHandle: "top" },
  { id: "e1-34", source: "31", sourceHandle: "bottom", target: "34", targetHandle: "top" },
  { id: "e1-35", source: "31", sourceHandle: "bottom", target: "35", targetHandle: "top" },
  { id: "e1-36", source: "31", sourceHandle: "bottom", target: "36", targetHandle: "top" },

  { id: "e1-37", source: "20", sourceHandle: "bottom", target: "37", targetHandle: "top" },
  { id: "e1-38", source: "21", sourceHandle: "bottom", target: "38", targetHandle: "top" },
  { id: "e1-39", source: "38", sourceHandle: "bottom", target: "39", targetHandle: "top" },
  { id: "e1-40", source: "22", sourceHandle: "bottom", target: "40", targetHandle: "top" },
  { id: "e1-41", source: "40", sourceHandle: "bottom", target: "41", targetHandle: "top" },
  { id: "e1-42", source: "40", sourceHandle: "bottom", target: "42", targetHandle: "top" },
  { id: "e1-43", source: "42", sourceHandle: "bottom", target: "43", targetHandle: "top" },

  { id: "e1-44", source: "3", sourceHandle: "bottom", target: "44", targetHandle: "top" },
  { id: "e1-45", source: "3", sourceHandle: "bottom", target: "45", targetHandle: "top" },
  { id: "e1-46", source: "4", sourceHandle: "bottom", target: "46", targetHandle: "top" },
  { id: "e1-47", source: "46", sourceHandle: "bottom", target: "47", targetHandle: "top" },
  { id: "e1-48", source: "5", sourceHandle: "bottom", target: "48", targetHandle: "top" },
  { id: "e1-49", source: "5", sourceHandle: "bottom", target: "49", targetHandle: "top" },
  { id: "e1-50", source: "5", sourceHandle: "bottom", target: "50", targetHandle: "top" },
  { id: "e1-51", source: "5", sourceHandle: "bottom", target: "51", targetHandle: "top" },
  { id: "e1-52", source: "5", sourceHandle: "bottom", target: "52", targetHandle: "top" },
  { id: "e1-53", source: "11", sourceHandle: "bottom", target: "53", targetHandle: "top" },
  { id: "e1-54", source: "11", sourceHandle: "bottom", target: "54", targetHandle: "top" },

  { id: "e1-55", source: "6", sourceHandle: "bottom", target: "55", targetHandle: "top" },
  { id: "e1-56", source: "7", sourceHandle: "bottom", target: "56", targetHandle: "top" },
  { id: "e1-57", source: "56", sourceHandle: "bottom", target: "57", targetHandle: "top" },
  { id: "e1-58", source: "56", sourceHandle: "bottom", target: "58", targetHandle: "top" },
  { id: "e1-59", source: "8", sourceHandle: "bottom", target: "59", targetHandle: "top" },
  { id: "e1-60", source: "9", sourceHandle: "bottom", target: "60", targetHandle: "top" },

  { id: "e1-62", source: "61", sourceHandle: "bottom", target: "62", targetHandle: "top" },
  { id: "e1-63", source: "62", sourceHandle: "bottom", target: "63", targetHandle: "top" },
  { id: "e1-64", source: "63", sourceHandle: "bottom", target: "64", targetHandle: "top" },
  { id: "e1-65", source: "63", sourceHandle: "bottom", target: "65", targetHandle: "top" },
  { id: "e1-66", source: "63", sourceHandle: "bottom", target: "66", targetHandle: "top" },
  { id: "e1-67", source: "63", sourceHandle: "bottom", target: "67", targetHandle: "top" },
  { id: "e1-68", source: "63", sourceHandle: "bottom", target: "68", targetHandle: "top" },
  { id: "e1-69", source: "63", sourceHandle: "bottom", target: "69", targetHandle: "top" },
  { id: "e1-70", source: "63", sourceHandle: "bottom", target: "70", targetHandle: "top" },
  { id: "e1-71", source: "63", sourceHandle: "bottom", target: "71", targetHandle: "top" },
  { id: "e1-72", source: "63", sourceHandle: "bottom", target: "72", targetHandle: "top" },
  { id: "e1-73", source: "63", sourceHandle: "bottom", target: "73", targetHandle: "top" },
  { id: "e1-74", source: "63", sourceHandle: "bottom", target: "74", targetHandle: "top" },
  { id: "e1-75", source: "63", sourceHandle: "bottom", target: "75", targetHandle: "top" },
  { id: "e1-76", source: "70", sourceHandle: "bottom", target: "76", targetHandle: "top" },
  { id: "e1-80", source: "70", sourceHandle: "bottom", target: "80", targetHandle: "top" },
  { id: "e1-77", source: "70", sourceHandle: "bottom", target: "77", targetHandle: "top" },
  { id: "e1-78", source: "70", sourceHandle: "bottom", target: "78", targetHandle: "top" },
  { id: "e1-79", source: "70", sourceHandle: "bottom", target: "79", targetHandle: "top" },
];

// Node styles
const deptStyle = {
  padding: "10px 15px",
  borderRadius: 12,
  backgroundColor: "#198754",
  color: "#fff",
  fontWeight: 600,
  boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
  minWidth: 120,
  textAlign: "center",
  cursor: "grab",
};

const subdeptStyle = {
  padding: "10px 15px",
  borderRadius: 12,
  backgroundColor: "#5c3987",
  color: "#fff",
  fontWeight: 600,
  boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
  minWidth: 120,
  textAlign: "center",
  cursor: "grab",
};

// Popover content
const popoverContent = (data) => (
  <div style={{ textAlign: "left" }}>
    <div><strong>Name: </strong> {data.label}</div >
    <div><strong>Role: </strong> {data.role}</div >
    {data.email && <div><strong>Email:< /strong> {data.email}</div >}
    {data.phone && <div><strong>Phone: </strong> {data.phone}</div >}
  </div>
);

// Nodes
const MDNode = ({ data }) => (
  <Popover content={popoverContent(data)} placement="top" >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "grab" }}>
      <i className="fa-solid fa-user" style={{ fontSize: 40, color: "#0d6efd" }}> </i>
      < div style={{ marginTop: 5 }}> {data.label} </>
      < Handle type="source" position={Position.Bottom} id="bottom" />
    </div>
  </Popover>
);

const DeptNode = ({ id, data }) => (
  <div
    // className="card text-white bg-success text-center shadow"
    style={deptStyle}
    onClick={() => data.onToggle(id)}
  >
    <div className="card-body p-0" >
      <strong>{data.label} </strong>
    </div>

    < Handle type="target" position={Position.Top} id="top" />
    <Handle type="source" position={Position.Bottom} id="bottom" />
  </div>
);

const subDeptNode = ({ data }) => (
  <div
    // className="card text-white bg-success text-center shadow"
    style={subdeptStyle}
  >
    <div className="card-body p-0" >
      <strong>{data.label} </strong>
    </div>

    < Handle type="target" position={Position.Top} id="top" />
    <Handle type="source" position={Position.Bottom} id="bottom" />
  </div>
);

const EmpNode = ({ data }) => {
  const getRoleStyle = () => {
    switch (data.role) {
      case "Director":
        return {
          border: "4px solid #0d6efd",
          image: "https://randomuser.me/api/portraits/men/32.jpg",
          badge: "bg-primary",
        };
      case "Sr Manager":
      case "AGM":
      case "Project Lead":
      case "Assistant VP":
        return {
          border: "4px solid #6b14a5",
          image: "https://randomuser.me/api/portraits/men/45.jpg",
          badge: "bg-info color-white",
        };
      case "Executive":
      case "Senior Engineer":
      case "Deputy Manager":
      case "Engineer - WeldinG Inspector":
        return {
          border: "4px solid #198754",
          image: "https://randomuser.me/api/portraits/men/65.jpg",
          badge: "bg-success",
        };
      default:
        return {
          border: "4px solid #69a1d1",
          image: "https://randomuser.me/api/portraits/men/12.jpg",
          badge: "bg-secondary",
        };
    }
  };

  const roleStyle = getRoleStyle();

  return (
    <div
      className={`collapse ${data.isCollapsed ? "" : "show"}`
      }
      onClick={() => data.onOpen(data)}
      style={{ cursor: "pointer" }}
    >
      <Popover content={popoverContent(data)} placement="bottom" >
        <div
          className="text-center bg-white p-3 rounded-4 shadow"
          style={{
            transition: "all 0.3s ease",
            width: "140px",
            minHeight: "100px",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = "translateY(-5px)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.transform = "translateY(0px)")
          }
        >
          {/* Profile Image */}
          < div className="position-relative d-inline-block" >
            <img
              src={roleStyle.image}
              alt="profile"
              className="rounded-circle shadow"
              width="70"
              height="70"
              style={{
                objectFit: "cover",
                ...{ border: roleStyle.border },
              }}
            />

            {/* Role Badge */}
            <span
              className={`badge ${roleStyle.badge} position-absolute top-100 start-50 translate-middle px-2 py-1 text-truncate`}
              style={{
                fontSize: "10px",
                maxWidth: "140px",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            // title={data.role}  
            >
              {data.role}
            </span>
          </div>

          {/* Name */}
          <div
            className="mt-3 fw-semibold text-dark text-truncate"
            style={{
              maxWidth: "160px",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
            }}
          // title={data.label}
          >
            {data.label}
          </div>

          {/* Handles */}
          <Handle type="target" position={Position?.Top} id="top" />
          <Handle type="source" position={Position?.Bottom} id="bottom" />
        </div>
      </Popover>
    </div>
  );
};

const nodeTypes = { mdNode: MDNode, deptNode: DeptNode, subDeptNode: subDeptNode, empNode: EmpNode };

function OrgChart() {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [collapsedDepts, setCollapsedDepts] = useState([]);

  const openEmployeeModal = (empData) => {
    setSelectedEmployee(empData);
  };

  const toggleDept = (deptId) => {
    setCollapsedDepts((prev) =>
      prev.includes(deptId)
        ? prev.filter((id) => id !== deptId)
        : [...prev, deptId]
    );
  };

  const enhancedNodes = nodes.map((node) => {
    let updatedNode = { ...node };

    // ✅ Department Toggle
    if (node.type === "deptNode") {
      updatedNode = {
        ...updatedNode,
        data: {
          ...updatedNode.data,
          onToggle: toggleDept,
        },
      };
    }

    // ✅ Employee Modal + Extra Details
    if (node.type === "empNode") {
      updatedNode = {
        ...updatedNode,
        data: {
          ...updatedNode.data,

          // Modal function
          onOpen: openEmployeeModal,
          // name: node.data.label,
          // designation: node.data.role,

          // Extra Details
          joinDate: "2019-06-15",
          department: "Management",
          location: "Chennai, India",
          image: "https://randomuser.me/api/portraits/men/32.jpg",

          project: {
            name: "Enterprise HRMS",
            role: "Project Lead",
            status: "In Progress",
          },

          skills: [
            { name: "Leadership", value: 40 },
            { name: "Management", value: 30 },
            { name: "Strategy", value: 20 },
            { name: "Communication", value: 10 },
          ],
        },
      };
    }

    return updatedNode;
  });

  const visibleNodes = enhancedNodes.filter((node) => {
    if (node.data.parentDept) {
      return !collapsedDepts.includes(node.data.parentDept);
    }
    return true;
  });

  const visibleEdges = edges.filter((edge) => {
    const childNode = visibleNodes.find((n) => n.id === edge.target);
    return childNode !== undefined;
  });

  return (
    <div style={{ height: "80vh", width: "100%", border: "1px solid #ccc" }
    }>
      <ReactFlowProvider>
        <ReactFlow
          nodes={visibleNodes}
          edges={visibleEdges}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={{
            // type: "smoothstep",
            animated: true,
            style: {
              stroke: "#6f42c1",
              strokeWidth: 2,
            },
            markerEnd: {
              type: "arrowclosed",
              color: "#a996cb",
            },
          }}
          fitView
          nodesDraggable
          zoomOnScroll
          panOnDrag
          connectionLineType="smoothstep"
          onNodesChange={(changes) => setNodes((nds) => applyNodeChanges(changes, nds))}
        >
          <MiniMap
            nodeColor={
              (node) =>
                node.type === "mdNode" ? "#0d6efd" : node.type === "deptNode" ? "#198754" : "#999"
            }
          />
          < Controls />
          <Background color="#aaa" gap={16} />

        </ReactFlow>
      </ReactFlowProvider>

      {
        selectedEmployee && (
          <EmployeeProfileModal show={true} handleClose={() => setSelectedEmployee(null)
          } employee={selectedEmployee} />
        )}


    </div>
  );
}

export default OrgChart;

</>


  sam2
import React, { useState } from "react";
import ReactFlow, {
  Controls,
  MiniMap,
  Background,
  ReactFlowProvider,
  Handle,
  Position,
  applyNodeChanges,
} from "reactflow";
import "reactflow/dist/style.css";
import { Popover } from "antd";
import "antd/dist/reset.css"; // Ant Design
import "./org.css"; // Custom styles
// import EmployeeProfileModal from "./empdetails";
// import { disable } from "workbox-navigation-preload";

// Sample data
const initialNodes = [
  {
    id: "1",
    type: "mdNode",
    data: {
      label: "Maturi Venkateswara Rao",
      role: "Director",
      email: "md@company.com",
      phone: "+91 9876543210",
    },
    position: { x: 350, y: -100 },
  },

  {
    id: "2",
    type: "deptNode",
    data: { label: "Plant Head", role: "Department" },
    position: { x: -500, y: 250 },
  },
  {
    id: "3",
    type: "deptNode",
    data: { label: "Finance", role: "Department" },
    position: { x: 200, y: 250 },
  },
  {
    id: "4",
    type: "deptNode",
    data: { label: "HR", role: "Department" },
    position: { x: 350, y: 250 },
  },
  {
    id: "5",
    type: "deptNode",
    data: { label: "Admin", role: "Department" },
    position: { x: 500, y: 250 },
  },
  {
    id: "6",
    type: "deptNode",
    data: { label: "Purchase", role: "Department" },
    position: { x: 650, y: 250 },
  },
  {
    id: "7",
    type: "deptNode",
    data: { label: "Planning", role: "Department" },
    position: { x: 800, y: 250 },
  },
  {
    id: "8",
    type: "deptNode",
    data: { label: "Sales", role: "Department" },
    position: { x: 950, y: 250 },
  },
  {
    id: "9",
    type: "deptNode",
    data: { label: "Logistics", role: "Department" },
    position: { x: 1100, y: 250 },
  },
  {
    id: "10",
    type: "deptNode",
    data: { label: "Project", role: "Department" },
    position: { x: 1250, y: 250 },
  },
  {
    id: "11",
    type: "deptNode",
    data: { label: "IT", role: "Department" },
    position: { x: 1400, y: 250 },
  },


  {
    id: "12",
    type: "empNode",
    data: {
      label: "Govarthanan M.",
      role: "Assistant VP",
      email: "govarthanan@company.com",
      phone: "+91 9876500011",
    },
    position: { x: -500, y: 50 },
  },
  {
    id: "13",
    type: "empNode",
    data: {
      label: "Reshma R.",
      role: "AGM",
      email: "reshma@company.com",
      phone: "+91 9876500022",
    },
    position: { x: 350, y: 50 },
  },
  {
    id: "14",
    type: "empNode",
    data: {
      label: "Saranyadevi V.",
      role: "Sr Manager",
      email: "saranyadevi@company.com",
      phone: "+91 9876500033",
    },
    position: { x: 900, y: 50 },
  },
  {
    id: "15",
    type: "empNode",
    data: {
      label: "Soundariya V.",
      role: "Project Lead",
      email: "soundariya@company.com",
      phone: "+91 9876500044",
    },
    position: { x: 1340, y: 50 },
  },



  {
    id: "16",
    type: "subDeptNode",
    data: { label: "Production", role: "Sub Department", parentDept: "2" },
    position: { x: -950, y: 350 },
  },

  {
    id: "17",
    type: "subDeptNode",
    data: { label: "safety", role: "Sub Department", parentDept: "2" },
    position: { x: -800, y: 350 },
  },
  {
    id: "18",
    type: "subDeptNode",
    data: { label: "Stores", role: "Sub Department", parentDept: "2" },
    position: { x: -650, y: 350 },
  },
  {
    id: "19",
    type: "subDeptNode",
    data: { label: "Quality", role: "Sub Department", parentDept: "2" },
    position: { x: -500, y: 350 },
  },
  {
    id: "20",
    type: "subDeptNode",
    data: { label: "NPD", role: "Sub Department", parentDept: "2" },
    position: { x: -350, y: 350 },
  },
  {
    id: "21",
    type: "subDeptNode",
    data: { label: "Design", role: "Sub Department", parentDept: "2" },
    position: { x: -200, y: 350 },
  },
  {
    id: "22",
    type: "subDeptNode",
    data: { label: "Welding Inspection", role: "Sub Department", parentDept: "2" },
    position: { x: -50, y: 350 },
  },

  {
    id: "23",
    type: "empNode",
    data: {
      label: "Venkatesh c.",
      role: "Senior Engineer",
      parentDept: "2",
      email: "venkatesh@company.com",
      phone: "+91 9876500055",
    },
    position: { x: -1100, y: 450 },
  },
  {
    id: "24",
    type: "empNode",
    data: {
      label: "Iyyanar S.",
      role: "Junior Engineer",
      parentDept: "2",
      email: "iyyanar@company.com",
      phone: "+91 9876500066",
    },
    position: { x: -1200, y: 600 },
  },
  {
    id: "25",
    type: "empNode",
    data: {
      label: "Shopfloor Employees",
      role: "",
      parentDept: "2",
      email: "shop@company.com",
      phone: "+91 9876500066",
    },
    position: { x: -1050, y: 600 },
  },

  {
    id: "26",
    type: "empNode",
    data: {
      label: "Madhan Kumar P.",
      role: "Executive",
      parentDept: "2",
      email: "madhan@company.com",
      phone: "+91 9876500077",
    },
    position: { x: -950, y: 450 },
  },

  {
    id: "27",
    type: "empNode",
    data: {
      label: "Sakthivel S.",
      role: "Executive",
      parentDept: "2",
      email: "sakthivel@company.com",
      phone: "+91 9876500088",
    },
    position: { x: -800, y: 450 },
  },
  {
    id: "28",
    type: "empNode",
    data: {
      label: "Mugesh S.",
      role: "Executive",
      parentDept: "2",
      email: "mugesh@company.com",
      phone: "+91 9876500099",
    },
    position: { x: -900, y: 600 },
  },
  {
    id: "29",
    type: "empNode",
    data: {
      label: "Seshan S.",
      role: "Assistant Executive",
      parentDept: "2",
      email: "seshan@company.com",
      phone: "+91 9876500100",
    },
    position: { x: -750, y: 600 },
  },
  {
    id: "30",
    type: "empNode",
    data: {
      label: "Vignesh M.",
      role: "Assistant Executive",
      parentDept: "2",
      email: "vignesh@company.com",
      phone: "+91 9876500111",
    },
    position: { x: -600, y: 600 },
  },

  {
    id: "31",
    type: "empNode",
    data: {
      label: "Thyagarajan P.",
      role: "Senior Engineer",
      parentDept: "2",
      email: "thyagarajan@company.com",
      phone: "+91 9876500088",
    },
    position: { x: -450, y: 600 },
  },
  {
    id: "32",
    type: "empNode",
    data: {
      label: "Anandharaj G.",
      role: "Senior Engineer",
      parentDept: "2",
      email: "anandharaj@company.com",
      phone: "+91 9876500099",
    },
    position: { x: -650, y: 450 },
  },
  {
    id: "33",
    type: "empNode",
    data: {
      label: "Raja KirubakaranPaul T.",
      role: "Assistant Engineer",
      parentDept: "2",
      email: "raja@company.com",
      phone: "+91 9876500100",
    },
    position: { x: -650, y: 810 },
  },
  {
    id: "34",
    type: "empNode",
    data: {
      label: "Sliambarasan M.",
      role: "Assistant Engineer",
      parentDept: "2",
      email: "sliambarasan@company.com",
      phone: "+91 9876500111",
    },
    position: { x: -500, y: 810 },
  },
  {
    id: "35",
    type: "empNode",
    data: {
      label: "Hemamanimaran D.",
      role: "Assistant Engineer",
      parentDept: "2",
      email: "hemamanimara@company.com",
      phone: "+91 9876500122",
    },
    position: { x: -350, y: 810 },
  },
  {
    id: "36",
    type: "empNode",
    data: {
      label: "Sathish Kumar S.",
      role: "Assistant Engineer",
      parentDept: "2",
      email: "sathish@company.com",
      phone: "+91 9876500133",
    },
    position: { x: -200, y: 810 },
  },

  {
    id: "37",
    type: "empNode",
    data: {
      label: "To Be Filled",
      role: "Senior Engineer",
      parentDept: "2",
      email: "filled@company.com",
      phone: "+91 9876500133",
    },
    position: { x: -350, y: 450 },
  },
  {
    id: "38",
    type: "empNode",
    data: {
      label: "Senthil Kumar S.",
      role: "Deputy Manager",
      parentDept: "2",
      email: "senthil@company.com",
      phone: "+91 9876500133",
    },
    position: { x: -200, y: 450 },
  },
  {
    id: "39",
    type: "empNode",
    data: {
      label: "Madhan S.",
      role: "Junior Engineer",
      parentDept: "2",
      email: "madhan@company.com",
      phone: "+91 9876500133",
    },
    position: { x: -250, y: 600 },
  },

  {
    id: "40",
    type: "empNode",
    data: {
      label: "Parthipan C.",
      role: "Engineer - WeldinG Inspector",
      parentDept: "2",
      email: "parthipan@company.com",
      phone: "+91 9876500144",
    },
    position: { x: -50, y: 450 },
  },
  {
    id: "41",
    type: "empNode",
    data: {
      label: "Raja KirubakaranPaul T.",
      role: "Junior Engineer",
      parentDept: "2",
      email: "raja@company.com",
      phone: "+91 9876500155",
    },
    position: { x: -100, y: 600 },
  },
  {
    id: "42",
    type: "empNode",
    data: {
      label: "Suriya R.",
      role: "Junior Engineer",
      parentDept: "2",
      email: "suriya@company.com",
      phone: "+91 9876500166",
    },
    position: { x: 50, y: 600 },
  },
  {
    id: "43",
    type: "empNode",
    data: {
      label: "Sathish Kumar S.",
      role: "(GET) - Welding Inspection",
      parentDept: "2",
      email: "sathish@company.com",
      phone: "+91 9876500177",
    },
    position: { x: 50, y: 810 },
  },


  {
    id: "44",
    type: "empNode",
    data: {
      label: "Rajkumar M.",
      role: "Executive",
      parentDept: "3",
      email: "rajkumar@company.com",
      phone: "+91 9876500188",
    },
    position: { x: 120, y: 350 },
  },
  {
    id: "45",
    type: "empNode",
    data: {
      label: "Rajesh Kumar T.",
      role: "Finance Assistant",
      parentDept: "3",
      email: "rajeskumar@company.com",
      phone: "+91 9876500199",
    },
    position: { x: 200, y: 530 },
  },
  {
    id: "46",
    type: "empNode",
    data: {
      label: "Ravinath B.",
      role: "Senior Executive",
      parentDept: "4",
      email: "ravinath@company.com",
      phone: "+91 9876500200",
    },
    position: { x: 350, y: 350 },
  },
  {
    id: "47",
    type: "empNode",
    data: {
      label: "Shobana S.",
      role: "HR Assistant Executive",
      parentDept: "4",
      email: "shobana@company.com",
      phone: "+91 9876500211",
    },
    position: { x: 350, y: 530 },
  },


  {
    id: "48",
    type: "empNode",
    data: {
      label: "Gopi S.",
      role: "Associate",
      parentDept: "5",
      email: "gopi@company.com",
      phone: "+91 9876500222",
    },
    position: { x: 500, y: 530 },
  },
  {
    id: "49",
    type: "empNode",
    data: {
      label: "Jaganathan D.",
      role: "Junior Associate",
      parentDept: "5",
      email: "jaganathan@company.com",
      phone: "+91 9876500233",
    },
    position: { x: 650, y: 810 },
  },
  {
    id: "50",
    type: "empNode",
    data: {
      label: "Dillibabu E.",
      role: "Junior Associate",
      parentDept: "5",
      email: "dillibabu@company.com",
      phone: "+91 9876500244",
    },
    position: { x: 575, y: 670 },
  },
  {
    id: "51",
    type: "empNode",
    data: {
      label: "Venkatesan D.",
      role: "Junior Associate",
      parentDept: "5",
      email: "venkatesan@company.com",
      phone: "+91 9876500255",
    },
    position: { x: 425, y: 670 },
  },
  {
    id: "52",
    type: "empNode",
    data: {
      label: "Umamaheswarai V.",
      role: "Junior Associate",
      parentDept: "5",
      email: "umamaheswarai@company.com",
      phone: "+91 9876500266",
    },
    position: { x: 350, y: 810 },
  },
  {
    id: "53",
    type: "empNode",
    data: {
      label: "Gireesh Yaswanth P.",
      role: "Asst Engineer-backend developer",
      parentDept: "11",
      email: "gireeshyaswanth@company.com",
      phone: "+91 9876500277",
    },
    position: { x: 1300, y: 350 },
  },
  {
    id: "54",
    type: "empNode",
    data: {
      label: "Nalam Viswa Naga Chaitanya S.",
      role: "Asst Engineer-frontend developer",
      parentDept: "11",
      email: "nalamviswanagachaitanya@company.com",
      phone: "+91 9876500288",
    },
    position: { x: 1450, y: 350 },
  },


  {
    id: "55",
    type: "empNode",
    data: {
      label: "VinothKumar N.",
      role: "Senior Executive",
      parentDept: "6",
      email: "vinothkumar@company.com",
      phone: "+91 9876500299",
    },
    position: { x: 600, y: 350 },
  },
  {
    id: "56",
    type: "empNode",
    data: {
      label: "Sath Rock D.",
      role: "Deputy Manager - SCM",
      parentDept: "7",
      email: "sathrock@company.com",
      phone: "+91 9876500300",
    },
    position: { x: 800, y: 350 },
  },
  {
    id: "57",
    type: "empNode",
    data: {
      label: "Madhan Kumar P.",
      role: "Executive",
      parentDept: "7",
      email: "madhan@company.com",
      phone: "+91 9876500311",
    },
    position: { x: 750, y: 530 },
  },
  {
    id: "58",
    type: "empNode",
    data: {
      label: "Deepika G.",
      role: "Assistant",
      parentDept: "7",
      email: "deepika@company.com",
      phone: "+91 9876500322",
    },
    position: { x: 900, y: 530 },
  },
  {
    id: "59",
    type: "empNode",
    data: {
      label: "Muchanapalli Sravan Sai R.",
      role: "Assistant Manager",
      parentDept: "8",
      email: "muchanapallisravansai@company.com",
      phone: "+91 9876500333",
    },
    position: { x: 950, y: 350 },
  },
  {
    id: "60",
    type: "empNode",
    data: {
      label: "VinothKumar N.",
      role: "Senior Executive",
      parentDept: "9",
      email: "vinothkumar@company.com",
      phone: "+91 9876500299",
    },
    position: { x: 1150, y: 350 },
  },

  {
    id: "61",
    type: "empNode",
    data: {
      label: "Govarthanan M.",
      role: "Assistant VP",
      email: "govarthanan@company.com",
      phone: "+91 9876500011",
    },
    position: { x: -2175, y: 50 },
  },
  {
    id: "62",
    type: "deptNode",
    data: { label: "Production", role: "Sub Department" },
    position: { x: -2165, y: 250 },
  },
  {
    id: "63",
    type: "empNode",
    data: {
      label: "Venkatesh c.",
      role: "Senior Engineer",
      parentDept: "62",
      email: "venkatesh@company.com",
      phone: "+91 9876500055",
    },
    position: { x: -2175, y: 350 },
  },

  {
    id: "64",
    type: "empNode",
    data: {
      label: "Jayaseen K.",
      role: "Deputy Welding Associate",
      parentDept: "62",
      email: "jayaseen@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -3000, y: 600 },
  },
  {
    id: "65",
    type: "empNode",
    data: {
      label: "Bala Murugan S.",
      role: "Welding Associate",
      parentDept: "62",
      email: "bala@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -2850, y: 600 },
  },
  {
    id: "66",
    type: "empNode",
    data: {
      label: "Aridass I.",
      role: "Senior Associate",
      parentDept: "62",
      email: "aridass@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -2700, y: 600 },
  },
  {
    id: "67",
    type: "empNode",
    data: {
      label: "Bala Ganesan M.",
      role: "Associate",
      parentDept: "62",
      email: "bala@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -2550, y: 600 },
  },
  {
    id: "68",
    type: "empNode",
    data: {
      label: "Suresh Kumar M.",
      role: "Fitting Associate",
      parentDept: "62",
      email: "suresh@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -2400, y: 600 },
  },
  {
    id: "69",
    type: "empNode",
    data: {
      label: "To Be Filled.",
      role: "Deputy Welding Associate",
      parentDept: "62",
      email: "tobe@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -2250, y: 600 },
  },
  {
    id: "70",
    type: "empNode",
    data: {
      label: "Jothiraj R.",
      role: "(Assistant Engineer) - Robotic Welding",
      parentDept: "62",
      email: "jothiraj@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -2100, y: 600 },
  },
  {
    id: "71",
    type: "empNode",
    data: {
      label: "Santhirakumar P.",
      role: "Deputy Welding Associate",
      parentDept: "62",
      email: "santhirakumar@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -1950, y: 600 },
  },
  {
    id: "72",
    type: "empNode",
    data: {
      label: "Muruganantham P.",
      role: "Deputy Associate",
      parentDept: "62",
      email: "muruganantham@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -1800, y: 600 },
  },
  {
    id: "73",
    type: "empNode",
    data: {
      label: "Ramachandran C.",
      role: "Fitting Associate",
      parentDept: "62",
      email: "ramachandran@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -1650, y: 600 },
  },
  {
    id: "74",
    type: "empNode",
    data: {
      label: "Manikandan T.",
      role: "Helper",
      parentDept: "62",
      email: "manikandan@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -1500, y: 600 },
  },
  {
    id: "75",
    type: "empNode",
    data: {
      label: "Balaji S.",
      role: "Deputy Welding Associate",
      parentDept: "62",
      email: "balaji@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -1350, y: 600 },
  },

  {
    id: "76",
    type: "empNode",
    data: {
      label: "Ashokkumar V.",
      role: "Junior Robotic Welding Associate",
      parentDept: "62",
      email: "ashokkumar@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -2100, y: 750 },
  },
  {
    id: "77",
    type: "empNode",
    data: {
      label: "Thirunavukarasu A.",
      role: "Junior Robotic Welding Associate",
      parentDept: "62",
      email: "thirunavukarasu@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -1950, y: 750 },
  },
  {
    id: "78",
    type: "empNode",
    data: {
      label: "Karuppasamy S.",
      role: "Assistant Robo Welding",
      parentDept: "62",
      email: "karuppasamy@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -1800, y: 750 },
  },
  {
    id: "79",
    type: "empNode",
    data: {
      label: "Arunkumar P. P.",
      role: "Assistant Robo Welding",
      parentDept: "62",
      email: "arunkumar@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -2250, y: 750 },
  },
  {
    id: "80",
    type: "empNode",
    data: {
      label: "Rajkumar M.",
      role: "Helper",
      parentDept: "62",
      email: "rajkumar@company.com",
      phone: "+91 9876500299",
    },
    position: { x: -2400, y: 750 },
  },




];

// Edges
const initialEdges = [

  { id: "e1-2", source: "12", sourceHandle: "bottom", target: "2", targetHandle: "top" },
  { id: "e1-3", source: "13", sourceHandle: "bottom", target: "3", targetHandle: "top" },
  { id: "e1-4", source: "13", sourceHandle: "bottom", target: "4", targetHandle: "top" },
  { id: "e1-5", source: "13", sourceHandle: "bottom", target: "5", targetHandle: "top" },
  { id: "e1-6", source: "14", sourceHandle: "bottom", target: "6", targetHandle: "top" },
  { id: "e1-7", source: "14", sourceHandle: "bottom", target: "7", targetHandle: "top" },
  { id: "e1-8", source: "14", sourceHandle: "bottom", target: "8", targetHandle: "top" },
  { id: "e1-9", source: "14", sourceHandle: "bottom", target: "9", targetHandle: "top" },
  { id: "e1-10", source: "15", sourceHandle: "bottom", target: "10", targetHandle: "top" },
  { id: "e1-11", source: "15", sourceHandle: "bottom", target: "11", targetHandle: "top" },

  { id: "e4-12", source: "1", sourceHandle: "bottom", target: "12", targetHandle: "top" },
  { id: "e5-13", source: "1", sourceHandle: "bottom", target: "13", targetHandle: "top" },
  { id: "e6-14", source: "1", sourceHandle: "bottom", target: "14", targetHandle: "top" },
  { id: "e7-15", source: "1", sourceHandle: "bottom", target: "15", targetHandle: "top" },

  { id: "e2-16", source: "2", sourceHandle: "bottom", target: "16", targetHandle: "top" },
  { id: "e1-17", source: "2", sourceHandle: "bottom", target: "17", targetHandle: "top" },
  { id: "e1-18", source: "2", sourceHandle: "bottom", target: "18", targetHandle: "top" },
  { id: "e1-19", source: "2", sourceHandle: "bottom", target: "19", targetHandle: "top" },
  { id: "e1-20", source: "2", sourceHandle: "bottom", target: "20", targetHandle: "top" },
  { id: "e1-21", source: "2", sourceHandle: "bottom", target: "21", targetHandle: "top" },
  { id: "e1-22", source: "2", sourceHandle: "bottom", target: "22", targetHandle: "top" },
  { id: "e1-23", source: "16", sourceHandle: "bottom", target: "23", targetHandle: "top" },
  { id: "e1-24", source: "23", sourceHandle: "bottom", target: "24", targetHandle: "top" },
  { id: "e1-25", source: "23", sourceHandle: "bottom", target: "25", targetHandle: "top" },
  { id: "e1-26", source: "17", sourceHandle: "bottom", target: "26", targetHandle: "top" },
  { id: "e1-27", source: "18", sourceHandle: "bottom", target: "27", targetHandle: "top" },
  { id: "e1-28", source: "27", sourceHandle: "bottom", target: "28", targetHandle: "top" },
  { id: "e1-29", source: "27", sourceHandle: "bottom", target: "29", targetHandle: "top" },
  { id: "e1-30", source: "27", sourceHandle: "bottom", target: "30", targetHandle: "top" },

  { id: "e1-31", source: "19", sourceHandle: "bottom", target: "31", targetHandle: "left" },
  { id: "e1-32", source: "19", sourceHandle: "bottom", target: "32", targetHandle: "left" },
  { id: "e1-33", source: "31", sourceHandle: "bottom", target: "33", targetHandle: "left" },
  { id: "e1-34", source: "31", sourceHandle: "bottom", target: "34", targetHandle: "left" },
  { id: "e1-35", source: "31", sourceHandle: "bottom", target: "35", targetHandle: "left" },
  { id: "e1-36", source: "31", sourceHandle: "bottom", target: "36", targetHandle: "left" },

  { id: "e1-37", source: "20", sourceHandle: "bottom", target: "37", targetHandle: "top" },
  { id: "e1-38", source: "21", sourceHandle: "bottom", target: "38", targetHandle: "top" },
  { id: "e1-39", source: "38", sourceHandle: "bottom", target: "39", targetHandle: "top" },
  { id: "e1-40", source: "22", sourceHandle: "bottom", target: "40", targetHandle: "top" },
  { id: "e1-41", source: "40", sourceHandle: "bottom", target: "41", targetHandle: "top" },
  { id: "e1-42", source: "40", sourceHandle: "bottom", target: "42", targetHandle: "top" },
  { id: "e1-43", source: "42", sourceHandle: "bottom", target: "43", targetHandle: "top" },

  { id: "e1-44", source: "3", sourceHandle: "bottom", target: "44", targetHandle: "top" },
  { id: "e1-45", source: "3", sourceHandle: "bottom", target: "45", targetHandle: "top" },
  { id: "e1-46", source: "4", sourceHandle: "bottom", target: "46", targetHandle: "top" },
  { id: "e1-47", source: "46", sourceHandle: "bottom", target: "47", targetHandle: "top" },
  { id: "e1-48", source: "5", sourceHandle: "bottom", target: "48", targetHandle: "top" },
  { id: "e1-49", source: "5", sourceHandle: "bottom", target: "49", targetHandle: "top" },
  { id: "e1-50", source: "5", sourceHandle: "bottom", target: "50", targetHandle: "top" },
  { id: "e1-51", source: "5", sourceHandle: "bottom", target: "51", targetHandle: "top" },
  { id: "e1-52", source: "5", sourceHandle: "bottom", target: "52", targetHandle: "top" },
  { id: "e1-53", source: "11", sourceHandle: "bottom", target: "53", targetHandle: "top" },
  { id: "e1-54", source: "11", sourceHandle: "bottom", target: "54", targetHandle: "top" },

  { id: "e1-55", source: "6", sourceHandle: "bottom", target: "55", targetHandle: "top" },
  { id: "e1-56", source: "7", sourceHandle: "bottom", target: "56", targetHandle: "top" },
  { id: "e1-57", source: "56", sourceHandle: "bottom", target: "57", targetHandle: "top" },
  { id: "e1-58", source: "56", sourceHandle: "bottom", target: "58", targetHandle: "top" },
  { id: "e1-59", source: "8", sourceHandle: "bottom", target: "59", targetHandle: "top" },
  { id: "e1-60", source: "9", sourceHandle: "bottom", target: "60", targetHandle: "top" },

  { id: "e1-62", source: "61", sourceHandle: "bottom", target: "62", targetHandle: "top" },
  { id: "e1-63", source: "62", sourceHandle: "bottom", target: "63", targetHandle: "top" },
  { id: "e1-64", source: "63", sourceHandle: "bottom", target: "64", targetHandle: "top" },
  { id: "e1-65", source: "63", sourceHandle: "bottom", target: "65", targetHandle: "top" },
  { id: "e1-66", source: "63", sourceHandle: "bottom", target: "66", targetHandle: "top" },
  { id: "e1-67", source: "63", sourceHandle: "bottom", target: "67", targetHandle: "top" },
  { id: "e1-68", source: "63", sourceHandle: "bottom", target: "68", targetHandle: "top" },
  { id: "e1-69", source: "63", sourceHandle: "bottom", target: "69", targetHandle: "top" },
  { id: "e1-70", source: "63", sourceHandle: "bottom", target: "70", targetHandle: "top" },
  { id: "e1-71", source: "63", sourceHandle: "bottom", target: "71", targetHandle: "top" },
  { id: "e1-72", source: "63", sourceHandle: "bottom", target: "72", targetHandle: "top" },
  { id: "e1-73", source: "63", sourceHandle: "bottom", target: "73", targetHandle: "top" },
  { id: "e1-74", source: "63", sourceHandle: "bottom", target: "74", targetHandle: "top" },
  { id: "e1-75", source: "63", sourceHandle: "bottom", target: "75", targetHandle: "top" },
  { id: "e1-76", source: "70", sourceHandle: "bottom", target: "76", targetHandle: "top" },
  { id: "e1-80", source: "70", sourceHandle: "bottom", target: "80", targetHandle: "top" },
  { id: "e1-77", source: "70", sourceHandle: "bottom", target: "77", targetHandle: "top" },
  { id: "e1-78", source: "70", sourceHandle: "bottom", target: "78", targetHandle: "top" },
  { id: "e1-79", source: "70", sourceHandle: "bottom", target: "79", targetHandle: "top" },
];

// Node styles
const deptStyle = {
  padding: "10px 15px",
  borderRadius: 12,
  backgroundColor: "#198754",
  color: "#fff",
  fontWeight: 600,
  boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
  minWidth: 120,
  textAlign: "center",
  cursor: "grab",
};

const subdeptStyle = {
  padding: "10px 15px",
  borderRadius: 12,
  backgroundColor: "#5c3987",
  color: "#fff",
  fontWeight: 600,
  boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
  minWidth: 120,
  textAlign: "center",
  cursor: "grab",
};

// Popover content
const popoverContent = (data) => (
  <div style={{ textAlign: "left" }}>
    <div><strong>Name:</strong> {data.label}</div>
    <div><strong>Role:</strong> {data.role}</div>
    {data.email && <div><strong>Email:</strong> {data.email}</div>}
    {data.phone && <div><strong>Phone:</strong> {data.phone}</div>}
  </div>
);

// Nodes
const MDNode = ({ data }) => (
  <Popover content={popoverContent(data)} placement="top">
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "grab" }}>
      <i className="fa-solid fa-user" style={{ fontSize: 40, color: "#0d6efd" }}></i>
      <div style={{ marginTop: 5 }}>{data.label}</div>
      <Handle type="source" position={Position.Bottom} id="bottom" />
    </div>
  </Popover>
);

const DeptNode = ({ id, data }) => (
  <div
    // className="card text-white bg-success text-center shadow"
    style={deptStyle}
    onClick={() => data.onToggle(id)}
  >
    <div className="card-body p-0">
      <strong>{data.label}</strong>
    </div>

    <Handle type="target" position={Position.Top} id="top" />
    <Handle type="source" position={Position.Bottom} id="bottom" />
  </div>
);

const subDeptNode = ({ data }) => (
  <div
    // className="card text-white bg-success text-center shadow"
    style={subdeptStyle}
  >
    <div className="card-body p-0">
      <strong>{data.label}</strong>
    </div>

    <Handle type="target" position={Position.Top} id="top" />
    <Handle type="source" position={Position.Bottom} id="bottom" />
  </div>
);

const EmpNode = ({ data }) => {
  const getRoleStyle = () => {
    switch (data.role) {
      case "Director":
        return {
          border: "4px solid #0d6efd",
          image: "https://randomuser.me/api/portraits/men/32.jpg",
          badge: "bg-primary",
        };
      case "Sr Manager":
      case "AGM":
      case "Project Lead":
      case "Assistant VP":
        return {
          border: "4px solid #6b14a5",
          image: "https://randomuser.me/api/portraits/men/45.jpg",
          badge: "bg-info color-white",
        };
      case "Executive":
      case "Senior Engineer":
      case "Deputy Manager":
      case "Engineer - WeldinG Inspector":
        return {
          border: "4px solid #198754",
          image: "https://randomuser.me/api/portraits/men/65.jpg",
          badge: "bg-success",
        };
      default:
        return {
          border: "4px solid #69a1d1",
          image: "https://randomuser.me/api/portraits/men/12.jpg",
          badge: "bg-secondary",
        };
    }
  };

  const roleStyle = getRoleStyle();

  return (
    <div
      className={`collapse ${data.isCollapsed ? "" : "show"}`}
      onClick={() => data.onOpen(data)}
      style={{ cursor: "pointer" }}
    >
      <Popover content={popoverContent(data)} placement="bottom">
        <div
          // className="text-center bg-white p-3 rounded-4 shadow"
          style={{
            transition: "all 0.3s ease",
            width: "140px",
            minHeight: "100px",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = "translateY(-5px)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.transform = "translateY(0px)")
          }
        >
          {/* Profile Image */}
          <div className="position-relative d-inline-block">
            <img
              src={roleStyle.image}
              alt="profile"
              className="rounded-circle shadow"
              width="70"
              height="70"
              style={{
                objectFit: "cover",
                ...{ border: roleStyle.border },
              }}
            />

            {/* Role Badge */}
            <span
              className={`badge ${roleStyle.badge} position-absolute top-100 start-50 translate-middle px-2 py-1 text-truncate`}
              style={{
                fontSize: "10px",
                maxWidth: "140px",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            // title={data.role}  
            >
              {data.role}
            </span>
          </div>

          {/* Name */}
          <div
            className="mt-3 fw-semibold text-dark text-truncate"
            style={{
              maxWidth: "160px",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
            }}
          // title={data.label}
          >
            {data.label}
          </div>

          {/* Handles */}
          <Handle type="target" position={Position.Top} id="top" />
          <Handle type="source" position={Position.Bottom} id="bottom" />

          {/* Only left target needed */}
          <Handle type="target" position={Position.Left} id="left" />



        </div>
      </Popover>
    </div>
  );
};

const nodeTypes = { mdNode: MDNode, deptNode: DeptNode, subDeptNode: subDeptNode, empNode: EmpNode };

function OrgChart() {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [collapsedDepts, setCollapsedDepts] = useState([]);

  const openEmployeeModal = (empData) => {
    setSelectedEmployee(empData);
  };

  const toggleDept = (deptId) => {
    setCollapsedDepts((prev) =>
      prev.includes(deptId)
        ? prev.filter((id) => id !== deptId)
        : [...prev, deptId]
    );
  };

  const enhancedNodes = nodes.map((node) => {
    let updatedNode = { ...node };

    // ✅ Department Toggle
    if (node.type === "deptNode") {
      updatedNode = {
        ...updatedNode,
        data: {
          ...updatedNode.data,
          onToggle: toggleDept,
        },
      };
    }

    // ✅ Employee Modal + Extra Details
    if (node.type === "empNode") {
      updatedNode = {
        ...updatedNode,
        data: {
          ...updatedNode.data,

          // Modal function
          onOpen: openEmployeeModal,
          // name: node.data.label,
          // designation: node.data.role,

          // Extra Details
          joinDate: "2019-06-15",
          department: "Management",
          location: "Chennai, India",
          image: "https://randomuser.me/api/portraits/men/32.jpg",

          project: {
            name: "Enterprise HRMS",
            role: "Project Lead",
            status: "In Progress",
          },

          skills: [
            { name: "Leadership", value: 40 },
            { name: "Management", value: 30 },
            { name: "Strategy", value: 20 },
            { name: "Communication", value: 10 },
          ],
        },
      };
    }

    return updatedNode;
  });

  const visibleNodes = enhancedNodes.filter((node) => {
    if (node.data.parentDept) {
      return !collapsedDepts.includes(node.data.parentDept);
    }
    return true;
  });

  const visibleEdges = edges.filter((edge) => {
    const childNode = visibleNodes.find((n) => n.id === edge.target);
    return childNode !== undefined;
  });

  return (
    <div style={{ position: "relative", height: "80vh", width: "100%", border: "1px solid #ccc" }}>
      {/* Watermark */}
      <div
        style={{
          height: "80vh",
          width: "100%",
          backgroundColor: "#f0f8ff", // <-- your solid color here (e.g., light blue)
          border: "1px solid #ccc",
          position: "relative",
        }}
      >
        {/* Watermark Container */}
        {/* <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
          pointerEvents: "none",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, 200px)",
          gridTemplateRows: "repeat(auto-fill, 200px)",
          justifyItems: "center",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        {Array.from({ length: 100 }).map((_, idx) => (
          <div
            key={idx}
            style={{
              transform: "rotate(-30deg)",
              fontSize: "60px",
              fontWeight: "bold",
              color: "rgba(71, 74, 77, 0.09)",
              userSelect: "none",
            }}
          >
            CWI
          </div>
        ))}
      </div> */}




        <ReactFlowProvider>
          <ReactFlow
            nodes={visibleNodes}
            edges={visibleEdges}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={{
              type: "smoothstep",
            }}
            fitView
            nodesDraggable
            zoomOnScroll
            panOnDrag
            connectionLineType="smoothstep"
            style={{ zIndex: 1 }} // make sure ReactFlow is above watermark
            onNodesChange={(changes) => setNodes((nds) => applyNodeChanges(changes, nds))}
          >
            <MiniMap
              nodeColor={(node) =>
                node.type === "mdNode" ? "#0d6efd" : node.type === "deptNode" ? "#198754" : "#999"
              }
            />
            <Controls />

          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>

  );
}

export default OrgChart;



================================================================================================
import React, { useState, useEffect } from "react";
import ReactFlow, {
  Controls,
  Background,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";

const OrgChart = () => {
  // API DATA (later you will replace this)
  const orgData = [
    { id: 1, name: "CEO", managerId: null, role: "CEO" },
    { id: 2, name: "Manager A", managerId: 1, role: "Manager" },
    { id: 3, name: "Manager B", managerId: 1, role: "Manager" },
    { id: 4, name: "Employee 1", managerId: 2, role: "Employee" },
    { id: 5, name: "Employee 2", managerId: 2, role: "Employee" },
    { id: 6, name: "Employee 3", managerId: 3, role: "Employee" },
    { id: 7, name: "Employee 4", managerId: 3, role: "Employee" },
  ];

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  useEffect(() => {
    generateChart();
  }, []);

  const generateChart = () => {
    const nodeSpacingX = 220;
    const nodeSpacingY = 120;

    const levels = {};
    const nodeList = [];
    const edgeList = [];

    // Find levels
    const getLevel = (node) => {
      if (!node.managerId) return 0;
      const parent = orgData.find((n) => n.id === node.managerId);
      return 1 + getLevel(parent);
    };

    orgData.forEach((node) => {
      const level = getLevel(node);
      if (!levels[level]) levels[level] = [];
      levels[level].push(node);
    });

    // Create nodes
    Object.keys(levels).forEach((level) => {
      levels[level].forEach((node, index) => {
        nodeList.push({
          id: node.id.toString(),
          data: {
            label: (
              <div style={styles.card}>
                <strong>{node.name}</strong>
                <div style={styles.role}>{node.role}</div>
              </div>
            ),
          },
          position: {
            x: index * nodeSpacingX,
            y: level * nodeSpacingY,
          },
        });
      });
    });

    // Create edges
    orgData.forEach((node) => {
      if (node.managerId) {
        edgeList.push({
          id: `e${node.managerId}-${node.id}`,
          source: node.managerId.toString(),
          target: node.id.toString(),
          type: "smoothstep",
        });
      }
    });

    setNodes(nodeList);
    setEdges(edgeList);
  };

  return (
    <div style={styles.container}>
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
};

const styles = {
  container: {
    width: "100%",
    height: "90vh",
    background: "#f5f7fb",
  },

  card: {
    padding: "10px 18px",
    borderRadius: "8px",
    background: "white",
    border: "1px solid #ddd",
    textAlign: "center",
    minWidth: "120px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },

  role: {
    fontSize: "12px",
    color: "#666",
  },
};

export default function ChartWrapper() {
  return (
    <ReactFlowProvider>
      <OrgChart />
    </ReactFlowProvider>
  );
}

=================================================================================================
import React from "react";
import { Tree, TreeNode } from "react-organizational-chart";

const OrgChartPage1 = () => {

    const data = [
        { id: 1, name: "CEO", managerId: null, role: "CEO" },
        { id: 2, name: "Manager", managerId: 1, role: "manager" },
        { id: 3, name: "33333", managerId: 1, role: "manager" },
        { id: 4, name: "Employee1", managerId: 1, role: "Manager" },
        { id: 5, name: "555555", managerId: 4, role: "employee" },
        { id: 6, name: "Manager2", managerId: 4, role: "employee" },
        { id: 6, name: "Manager2", managerId: 3, role: "employee" },
        { id: 6, name: "Manager2", managerId: 3, role: "employee" },
        { id: 6, name: "Manager2", managerId: 3, role: "employee" },
        { id: 6, name: "Manager2", managerId: 3, role: "employee" },
        { id: 6, name: "Manager2", managerId: 3, role: "employee" },
        { id: 6, name: "Manager2", managerId: 3, role: "employee" },
        { id: 6, name: "Manager2", managerId: 3, role: "employee" },
        { id: 6, name: "Manager2", managerId: 3, role: "employee" },
        { id: 6, name: "Manager2", managerId: 3, role: "employee" },
        { id: 6, name: "Manager2", managerId: 3, role: "employee" },
        { id: 6, name: "Manager2", managerId: 3, role: "employee" },
        { id: 6, name: "Manager2", managerId: 3, role: "employee" },
        { id: 6, name: "Manager2", managerId: 3, role: "employee" },
        { id: 6, name: "Manager2", managerId: 3, role: "employee" },
        { id: 6, name: "Manager2", managerId: 3, role: "employee" },
        { id: 6, name: "Manager2", managerId: 3, role: "employee" },
        { id: 6, name: "Manager2", managerId: 3, role: "employee" },
        { id: 6, name: "Manager2", managerId: 3, role: "employee" },
        { id: 6, name: "Manager2", managerId: 3, role: "employee" },
        { id: 6, name: "Manager2", managerId: 3, role: "employee" },
        { id: 6, name: "Manager2", managerId: 3, role: "employee" },
        { id: 6, name: "Manager2", managerId: 3, role: "employee" },
        { id: 6, name: "Manager2", managerId: 3, role: "employee" },
        { id: 6, name: "Manager2", managerId: 3, role: "employee" },
        { id: 6, name: "Manager2", managerId: 3, role: "employee" },
    ];

    const buildTree = (data) => {
        const map = {};
        let root = null;

        data.forEach((item) => {
            map[item.id] = { ...item, children: [] };
        });

        data.forEach((item) => {
            if (item.managerId === null) {
                root = map[item.id];
            } else {
                map[item.managerId]?.children.push(map[item.id]);
            }
        });

        return root;
    };

    const tree = buildTree(data);

    const renderTree = (node) => (
        <TreeNode key={node.id} label={<NodeCard node={node} />}>
            {node.children.map((child) => renderTree(child))}
        </TreeNode>
    );

    const NodeCard = ({ node }) => {

        const role = node.role?.toLowerCase();

        if (role === "ceo") {
            return (
                <div style={styles.ceoCard}>
                    <div style={styles.ceoAvatar}>{node.name.charAt(0)}</div>
                    <div style={styles.name}>{node.name}</div>
                    <div style={styles.role}>CEO</div>
                </div>
            );
        }

        if (role === "manager") {
            return (
                <div style={styles.managerCard}>
                    <div style={styles.managerAvatar}>{node.name.charAt(0)}</div>
                    <div style={styles.name}>{node.name}</div>
                    <div style={styles.role}>Manager</div>
                </div>
            );
        }

        return (
            <div style={styles.employeeCard}>
                <div style={styles.employeeAvatar}>{node.name.charAt(0)}</div>
                <div style={styles.name}>{node.name}</div>
                <div style={styles.role}>Employee</div>
            </div>
        );
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>Organization Chart</h2>

            <Tree
                lineWidth={"2px"}
                lineColor={"#ccc"}
                lineBorderRadius={"10px"}
                label={<NodeCard node={tree} />}
            >
                {tree.children.map((child) => renderTree(child))}
            </Tree>
        </div>
    );
};

const styles = {

    container: {
        padding: "40px",
        background: "#f5f7fb",
        minHeight: "100vh",
        overflow: "auto",
        textAlign: "center"
    },

    title: {
        marginBottom: "40px"
    },

    role: {
        fontSize: "11px",
        color: "#888"
    },

    name: {
        fontSize: "14px",
        fontWeight: "600"
    },

    /* CEO */

    ceoCard: {
        width: "200px",
        height: "110px",
        background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
        color: "#fff",
        borderRadius: "12px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 10px 25px rgba(0,0,0,0.25)"
    },

    ceoAvatar: {
        width: "42px",
        height: "42px",
        borderRadius: "50%",
        background: "#fff",
        color: "#4f46e5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "bold",
        marginBottom: "6px"
    },

    /* MANAGER */

    managerCard: {
        width: "170px",
        height: "90px",
        background: "#fff",
        borderRadius: "10px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
        borderTop: "4px solid #6366f1"
    },

    managerAvatar: {
        width: "34px",
        height: "34px",
        borderRadius: "50%",
        background: "#6366f1",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "4px"
    },

    /* EMPLOYEE */

    employeeCard: {
        width: "140px",
        height: "70px",
        background: "#ffffff",
        borderRadius: "8px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 3px 8px rgba(0,0,0,0.12)"
    },

    employeeAvatar: {
        width: "26px",
        height: "26px",
        borderRadius: "50%",
        background: "#9333ea",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "12px",
        marginBottom: "3px"
    }

};

export default OrgChartPage1;