
import React, { useEffect, useState } from "react";
import { Tree, TreeNode } from "react-organizational-chart";
import { Popover } from "antd";
import "./new.css"
import { BASE_API } from "../Config/Config";
import EmployeeProfileModal from "./empdetails";

const OrgChart = () => {
    const [ceoId, setCeoId] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [collapsed, setCollapsed] = useState([]);
    const [data, setData] = useState([]);
    const [sessionUserData, setSessionUserData] = useState(null)
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        try {
            const userDataString = sessionStorage.getItem("userData");
            if (userDataString) {
                const userData = JSON.parse(userDataString);
                setSessionUserData(userData);
            } else {
                setSessionUserData(null);
            }
        } catch (error) {
            console.error("Error parsing userData from sessionStorage:", error);
            setSessionUserData(null);
        }
    }, []);

    const fetchOrgChart = async (ORGID, currentUserId) => {
        try {
            const response = await fetch(
                `${BASE_API}/AdminRoutes/getUsers?OrgId=${ORGID}`
            );

            if (!response.ok) throw new Error("Network response was not ok");

            const apiData = await response.json();

            const formatted = (apiData?.ResultData || []).map(item => ({
                id: item.Id,
                managerId: item.ManagerId,
                name: item.Name,
                role: item.RoleName,
                email: item.Email,
                phone: item.Mobile
            }));

            // CEO
            const ceo = formatted.find(user => user.id === user.managerId);

            // Current logged-in employee
            const currentUser = formatted.find(user => user.id === currentUserId);

            let filteredData = formatted;

            if (currentUser && (currentUser.role === "Employee" || currentUser.role === "Security")) {

                // Manager
                const manager = formatted.find(user => user.id === currentUser.managerId);

                // Colleagues (same manager)
                const colleagues = formatted.filter(
                    user => user.managerId === currentUser.managerId
                );

                // Final filtered structure
                filteredData = [
                    ceo,
                    manager,
                    ...colleagues
                ].filter(Boolean);
            }

            setCeoId(ceo?.id);
            setData(filteredData);

        } catch (error) {
            console.error("Failed to fetch org chart:", error);
        }
    };

    useEffect(() => {
        if (sessionUserData?.OrgId) {
            fetchOrgChart(sessionUserData.OrgId, sessionUserData.Id);
        }
    }, [sessionUserData]);

    const buildTree = (managerId) => {
        return data
            .filter(item => item.managerId === managerId && item.id !== managerId)
            .map(item => ({
                ...item,
                children: buildTree(item.id)
            }));
    };

    const tree = ceoId
        ? [{
            ...data.find(x => x.id === ceoId),
            children: buildTree(ceoId)
        }]
        : [];

    const toggleNode = (id) => {
        setCollapsed(prev =>
            prev.includes(id)
                ? prev.filter(x => x !== id)
                : [...prev, id]
        );
    };

    const renderTree = (nodes) => {
        if (!nodes) return null;

        return nodes.map(node => {
            const hasChildren = node.children && node.children.length > 0;

            return (
                <TreeNode key={node.id} label={<NodeCard node={node} toggleNode={toggleNode} />}>
                    {/* only render children if they exist and not collapsed */}
                    {!collapsed.includes(node.id) && hasChildren && renderTree(node.children)}
                </TreeNode>
            );
        });
    };

    const NodeCard = ({ node, toggleNode }) => {

        const role = node.role.toLowerCase();

        const isCEO = node?.id === ceoId;
        const isEmployee = role === "employee";
        const isManager = role === "manager";
        const ishr = role === "hr";

        const employeeData = {
            ...node,
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
        };

        if (isEmployee) {

            const content = (
                <div style={{ textAlign: "left" }}>
                    <div><strong>Name:</strong> {node.name}</div>
                    <div><strong>Role:</strong> {node.role}</div>
                    <div><strong>Email:</strong> {node.email}</div>
                    <div><strong>Phone:</strong> {node.phone}</div>
                </div>
            );

            return (
                <>
                    <Popover
                        content={content}
                        trigger="hover"
                        placement="bottom"
                    >
                        <div
                            style={styles.employeeCard}
                            onClick={() => setModalOpen(true)}
                            role="button"
                            tabIndex={0}
                            onKeyPress={(e) => {
                                if (e.key === "Enter") setModalOpen(true);
                            }}
                        >
                            <img
                                src={`https://i.pravatar.cc/100?img=${node.id}`}
                                style={styles.employeeAvatar}
                                alt={node.name}
                            />
                            <div style={styles.employeeName}>{node.name}</div>
                        </div>
                    </Popover>

                    <EmployeeProfileModal
                        show={modalOpen}
                        handleClose={() => setModalOpen(false)}
                        employee={employeeData}
                    />
                </>
            );
        }

        const cardStyle = isCEO
            ? styles.ceoCard
            : (isManager || ishr)
                ? styles.managerCard
                : styles.employeeCard;
        return (
            <div
                style={cardStyle}
                onClick={() => toggleNode(node.id)}
            >

                <img
                    src={`https://i.pravatar.cc/100?img=${node.id}`}
                    style={node.id === ceoId ? styles.ceoAvatar : styles.managerAvatar}
                    alt=""
                />

                <div style={styles.name}>{node.name}</div>
                <div style={styles.role}>{node.role}</div>
                <div style={styles.role}>{node.email} {node?.id === ceoId ? <span className="text-muted">|</span> : null} {node.phone}</div>


            </div>
        );
    };

    return (
        <div style={styles.wrapper}>

            <div className="text-center mb-4">
                <h1 className="org-heading fw-bold">
                    Organisation Chart
                </h1>

                <p className="text-muted">
                    Visual overview of company hierarchy
                </p>
            </div>

            <div style={styles.controls}>
                <button
                    className="zoom-btn"
                    style={styles.zoomBtn}
                    onClick={() => setZoom(z => z + 0.1)}
                >
                    +
                </button>

                <button
                    className="zoom-btn"
                    style={styles.zoomBtn}
                    onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
                >
                    −
                </button>
            </div>

            <div className="org-tree-wrapper">
                <div style={{ transform: `scale(${zoom})` }}>
                    <Tree
                        lineWidth={"2px"}
                        lineColor={"#999"}
                        lineBorderRadius={"8px"}
                        label={<div />}
                        nodePadding={"8px"}
                    >
                        {renderTree(tree)}
                    </Tree>
                </div>
            </div>

        </div>
    );
};



const styles = {
    zoomBtn: {
        width: "45px",
        height: "45px",
        borderRadius: "50%",
        border: "none",
        fontSize: "18px",
        fontWeight: "bold",
        cursor: "pointer",
        background: "#F4A62A",
        color: "white",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        transition: "all 0.2s ease"
    },

    zoomBtnHover: {
        transform: "scale(1.1)"
    },

    employeeCard: {
        cursor: "pointer",
        border: "1px solid #ddd",
        padding: "8px",
        borderRadius: "6px",
        textAlign: "center",
        width: "120px",
    },
    employeeAvatar: {
        width: "60px",
        height: "60px",
        borderRadius: "50%",
        marginBottom: "6px",
    },
    employeeName: {
        fontWeight: "bold",
    },

    wrapper: {
        padding: "40px",
        textAlign: "center",
        minHeight: "100vh",
        width: "auto",
        background: "linear-gradient(180deg, #f5f9ff 0%, #d4e3f7 100%)",
        backgroundSize: "200px",
    },

    controls: {
        position: "fixed",
        bottom: "30px",
        left: "30px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        zIndex: 1000
    },

    container: {
        overflow: "auto",
        transformOrigin: "top center",
        display: "flex",
        justifyContent: "center"
    },

    /* CEO CARD */

    ceoCard: {
        width: "190px",   // same width as managers
        height: "100px",
        background: "linear-gradient(135deg,#F4A62A,#ff8a00)",
        borderRadius: "12px",
        paddingTop: "45px",
        textAlign: "center",
        position: "relative",
        boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
        cursor: "pointer",
        transition: "all .3s",
        transform: "scale(1.15)",  // makes it visually bigger
        margin: "20px auto 6px"
    },

    ceoAvatar: {
        width: "80px",
        height: "80px",
        borderRadius: "50%",
        position: "absolute",
        top: "-32px",
        left: "50%",
        transform: "translateX(-50%)",
        border: "5px solid white"
    },


    /* MANAGER CARD */

    managerCard: {
        width: "150px",
        height: "110px",
        background: "#F4A62A",
        borderRadius: "10px",
        padding: "35px 10px 5px 10px",
        textAlign: "center",
        position: "relative",
        boxShadow: "0 6px 15px rgba(0,0,0,0.2)",
        cursor: "pointer",
        transition: "all .25s",
        margin: "20px auto 0px"
    },

    managerAvatar: {
        width: "65px",
        height: "65px",
        borderRadius: "50%",
        position: "absolute",
        top: "-28px",
        left: "50%",
        transform: "translateX(-50%)",
        border: "4px solid white"
    },

    role: {
        fontSize: "10px"
    },

    name: {
        fontWeight: "600",
        fontSize: "13px",
        // marginTop: "3px"
    },

    expandHint: {
        fontSize: "10px",
        opacity: 0.7,
        marginTop: "4px"
    },

    /* EMPLOYEE NODE */
};

export default OrgChart;