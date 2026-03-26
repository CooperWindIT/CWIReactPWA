import React, {useState, useEffect} from 'react';
// import Base from '../Config/Base';
import { VMS_URL } from '../Config/Config';
import RoleSideImg from './rolemenu.jpg';
import Base1 from '../Config/Base1';
import { Link, useNavigate } from 'react-router-dom';


export default function RoleMenu () {

    const navigate = useNavigate();
    const [sessionUserData, setsessionUserData] = useState({});
    const [rolesData, setRolesData] = useState([]);
    const [menuData, setMenuData] = useState([]);
    const [selectedRole, setSelectedRole] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
        } else {
            navigate("/");
        }
    }, [navigate]);

    const fetchRolesData = async () => {
        if (sessionUserData.OrgId) {
            try {
                const response = await fetch(`${VMS_URL}getRoles?OrgId=${sessionUserData.OrgId}`);
                if (response.ok) {
                    const data = await response.json();
                    setRolesData(data.ResultData);
                } else {
                    console.error('Failed to fetch attendance data:', response.statusText);
                }
            } catch (error) {
                console.error('Error fetching attendance data:', error.message);
            }
        }
    };

    const fetchUserPermissons = async () => {
        if (sessionUserData.OrgId) {
            try {
                setIsLoading(true);
                const response = await fetch(`${VMS_URL}UserPermissions?OrgId=${sessionUserData.OrgId}&RoleId=${selectedRole}&ModuleId=0`);
                if (response.ok) {
                    const data = await response.json();
                    setMenuData(data.ResultData);
                    setIsLoading(false);
                } else {
                    setIsLoading(false);
                    console.error('Failed to fetch attendance data:', response.statusText);
                }
            } catch (error) {
                setIsLoading(false);
                console.error('Error fetching attendance data:', error.message);
            }
        }
    };

    useEffect(() => {
        fetchUserPermissons();
    }, [selectedRole]);

    const handleRoleChange = (e) => {
        setSelectedRole(e.target.value);
    };

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchRolesData();
        }
    }, [sessionUserData]);

    const handleCheckboxChange = async (menuId, permissionType, checked) => {
        const updatedMenuData = menuData.map((menu) =>
          menu.AppMenuId === menuId
            ? { ...menu, [permissionType]: checked }
            : menu
        );
        setMenuData(updatedMenuData);
    
        const updatedMenu = updatedMenuData.find((menu) => menu.AppMenuId === menuId);
    
        const payload = {
          orgid: sessionUserData.OrgId,
          RoleId: Number(selectedRole),
          MenuId: menuId,
          IsActive: updatedMenu.IsActive ? 1 : 0,
          UpdatedBy: sessionUserData.Id,
        };
    
        try {
          const response = await fetch(`${VMS_URL}InactiveRoleMenu`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });
    
          const result = await response.json();
          if (!response.ok) {
            console.error("Failed to update permissions:", result);
          } else {
                fetchUserPermissons();
            console.log("Permissions updated successfully:", result);
          }
        } catch (error) {
          console.error("Error while updating permissions:", error);
        }
    };

    return (
        <Base1>
            <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
                <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                    <div className="page-title d-flex flex-column justify-content-center flex-wrap me-3">
                        <h1 className="page-heading d-flex text-gray-900 fw-bold fs-3 flex-column justify-content-center my-0">Role Menu</h1>
                        <ul className="breadcrumb breadcrumb-separatorless fw-semibold fs-7 my-0 pt-1">
                            <li className="breadcrumb-item text-muted">
                                <Link to='/dashboard' className="text-muted text-hover-primary">Home</Link>
                            </li>
                            <li className="breadcrumb-item">
                                <span className="bullet bg-gray-500 w-5px h-2px"></span>
                            </li>
                            <li className="breadcrumb-item text-muted">Role Access</li>
                        </ul>
                    </div>
                </div>
            </div>
            <div className="d-flex flex-column flex-column-fluid">
                <div id="kt_app_content" className="app-content flex-column-fluid">
                    <div id="kt_app_content_container" className="app-container container-xxl">
                        <div className='row'>
                            <div className="col-md-4 col-lg-4 col-12 mb-2">
                                <label className="form-label">Role<span className="text-danger">*</span></label>
                                <select
                                    className="form-select"
                                    name="RoleId"
                                    onChange={handleRoleChange}
                                    value={selectedRole}
                                >
                                    <option>Choose Role</option>
                                    {rolesData && rolesData.map((role) => (
                                        <option key={role.Id} value={role.Id}>
                                            {role.Name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="row d-flex align-items-center">
                            <div className="col-md-7 col-12">
                                <div className="table-responsive">
                                    <table className={`table ${selectedRole ? 'd-block' : 'd-none'}`}>
                                        <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Menu</th>
                                            <th>Active</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                            {isLoading ? (
                                                <tr>
                                                    <td colSpan="6" className="text-center">
                                                        <div className="container" ></div>
                                                    </td>
                                                </tr>
                                            ) : selectedRole ? (
                                                menuData && menuData.length > 0 ? (
                                                menuData.map((menu, index) => (
                                                    <tr key={menu.AppMenuId}>
                                                        <td>{index + 1}</td>
                                                        <td>{menu.MenuName}</td>
                                                        <td>
                                                            <div className="form-check form-switch">
                                                            <input
                                                                className="form-check-input"
                                                                type="checkbox"
                                                                role="switch"
                                                                checked={menu.IsActive}
                                                                onChange={(e) =>
                                                                    handleCheckboxChange(menu.AppMenuId, "IsActive", e.target.checked)
                                                                }
                                                            />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                                ) : (
                                                <tr>
                                                    <td colSpan="6" className="text-center">
                                                    No data available for the selected role.
                                                    </td>
                                                </tr>
                                                )
                                            ) : (
                                                <tr>
                                                <td colSpan="6" className="text-center">
                                                    Please select a role to view the data.
                                                </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="col-md-5 col-12 text-center d-none d-md-block d-lg-block">
                                <img
                                src={RoleSideImg}
                                alt="Role Side"
                                className="img-fluid"
                                style={{ maxHeight: "350px", objectFit: "contain" }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Base1>
    )
}
