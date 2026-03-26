import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import VisitingList from './Components/Visitings/List';
import ContactorsList from './Components/Contarctors/List';
import UsersList from './Components/Users/List';
import RoleMenu from './Components/RoleMenu/RoleMenu';
import ReportData from './Components/Reports/ReportData';
import Dashboard from './Components/Dashboard/Dashboard';
import CheckinValidation from './Components/CheckinValidation/CheckinValidation';
import Screen from './Components/Visitings/Screen';
import SampleScreen2 from './Components/Auth/sample2';
import NewSignIn from './Components/Auth/newsignin';
import ManualTimeLog from './Components/Contarctors/CLS/ManualTimelog';
import WorkingDays from './Components/WorkingDays/WorkingDays';
import ContractorDashboard from './Components/Contarctors/Dashboard/Dashboard';
import CLAttendanceList from './Components/Contarctors/CLAttendance';
import AlertsList from './Components/Alerts/AlertsList';
import CloseAlertsList from './Components/Alerts/CloseAlerts';
import AssetsList from './Components/EAM/Asset/List';
import AssetDashboard from './Components/EAM/Dashboard/Dashboard';
import EAMTicketsList from './Components/EAM/Tickets/List';
import EAMAlertsList from './Components/EAM/Alerts/List';
import EDMDashboard from './Components/EDM/Dashboard/dahboard';
import DocumentList from './Components/EDM/Documents/List';
import DocVersion from './Components/EDM/Documents/Version';
import AssetDetailsView from './Components/EAM/Asset/View';
import EAMTicketView from './Components/EAM/Tickets/View';
import MyAssetsList from './Components/EAM/Asset/MyAssets';
import AssetViewMore from './Components/EAM/Asset/ViewMore';
import TechTicketsList from './Components/EAM/Tickets/Technicians/TechTickets';

import UserAccessDoc from './Components/EDM/UserAccess/UserAccess';
import OrgChart from './Components/orgCharts/OrgChartPage1';
import InactiveAssetsList from './Components/EAM/Asset/InactiveAssets';

function App() {
  return (
    <Router basename='/'>
      <Routes>
        <Route path="/visit/:RequestId/:OrgId/:userid" element={<Screen />} />
        <Route
          path="*"
          element={
            <Routes>
              <Route path="/" element={<NewSignIn />} />

              {/* VMS */}
              <Route path="/vms/vms-dashboard" element={<Dashboard />} />
              <Route path="/vms/visitors" element={<VisitingList />} />

              {/* CMS */}
              <Route path="/cms/cms-dashboard" element={<ContractorDashboard />} />
              <Route path="/cms/contractors" element={<ContactorsList />} />
              <Route path="/cms/checkin-validation" element={<CheckinValidation />} />
              <Route path="cms/working-days" element={<WorkingDays />} />
              <Route path="/cms/manual-timelog" element={<ManualTimeLog />} />
              <Route path="/cms/cl-attendance" element={<CLAttendanceList />} />

              {/* Alerts */}
              <Route path="/alert/alerts-list" element={<AlertsList />} />
              <Route path="/alert/close-alerts" element={<CloseAlertsList />} />

              {/* EAM */}
              <Route path="/eam/eam-dashboard" element={<AssetDashboard />} />
              <Route path="/eam/assets" element={<AssetsList />} />
              <Route path="/eam/inactive-assets" element={<InactiveAssetsList />} />
              <Route path="/eam/my-assets" element={<MyAssetsList />} />
              <Route path="/eam/tickets" element={<EAMTicketsList />} />
              <Route path="/eam/alerts" element={<EAMAlertsList />} />
              <Route path="/eam/asset-view/:orgId/:machineId" element={<AssetDetailsView />} />
              <Route path="/eam/ticket-view/:orgId/:ticketId" element={<EAMTicketView />} />
              <Route path="/eam/asset-info/:orgId/:machineId" element={<AssetViewMore />} />
              <Route path="/tech-tickets" element={<TechTicketsList />} />

              {/* Reports */}
              <Route path="/report" element={<ReportData />} />

              <Route path="/user-modules" element={<SampleScreen2 />} />
              <Route path="/users" element={<UsersList />} />
              <Route path="/role-menu" element={<RoleMenu />} />

              {/* EDM */}
              <Route path="/edm/edm-dashboard" element={<EDMDashboard />} />
              <Route path="/edm/documents" element={<DocumentList />} />
              <Route path="/edm/doc-version/:docId" element={<DocVersion />} />
              <Route path="/edm/user-access" element={<UserAccessDoc />} />

              {/* Organization charts */}
              <Route path="/org-chart" element={<OrgChart />} />
            </Routes>
          }
        />
      </Routes>
    </Router>

  );
}

export default App;
