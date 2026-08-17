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
import InactiveAssetsList from './Components/EAM/Asset/InactiveAssets';
import Help1 from './Components/FAQs/help1';
import TechHelp1 from './Components/FAQs/techHelp';
import FullOrgChartstatic from './Components/orgCharts/fullOrgchartstatic';
import ReminderScreen from './Components/FAQs/reminder';
import SampleRM from './Components/RM/sample';
import ItemMasterDetails from './Components/RM/sampleView';
import SampleRM1 from './Components/RM/sample1';
import InActiveDocsList from './Components/EDM/Documents/InactiveDocsList';
import FlowBuilderC from './Components/FBC/flowbuilder2';
import TicketsListByUser from './Components/EAM/Tickets/ListByUser';

import KPIMaster from './Components/KPI/KPIMaster/kpiMaster';
import KPIDashboard from './Components/KPI/Dashboard/dashboard';
import EmployeeKpi from './Components/KPI/Employees/employeeKpi';
import MyKPIs from './Components/KPI/Employees/myKpis';
import AllocateKPI from './Components/KPI/Employees/allocateKPI';
import ManagerReviewCycle from './Components/KPI/Employees/managerReviewCycle';
import ReviewCycles from './Components/KPI/ReviewCycle/reviewCycles';
import EmployeeReviewCycle from './Components/KPI/Employees/employeeReviewCycle';
import AssetlessTicketRequest from './Components/ServiceNow/AssetlessTicketRequest';
import AssetlessMyTickets from './Components/ServiceNow/MyTickets';
import AssetlessTechMyTickets from './Components/ServiceNow/TechMyTickets';
import KPIHRPublish from './Components/KPI/Publish/KPIHRPublish';

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
              <Route path="/vms/dashboard" element={<Dashboard />} />
              <Route path="/vms/visitors" element={<VisitingList />} />

              {/* CMS */}
              <Route path="/cms/dashboard" element={<ContractorDashboard />} />
              <Route path="/cms/contractors" element={<ContactorsList />} />
              <Route path="/cms/checkin-validation" element={<CheckinValidation />} />
              <Route path="cms/working-days" element={<WorkingDays />} />
              <Route path="/cms/manual-timelog" element={<ManualTimeLog />} />
              <Route path="/cms/cl-attendance" element={<CLAttendanceList />} />

              {/* Alerts */}
              <Route path="/alert/alerts-list" element={<AlertsList />} />
              <Route path="/alert/close-alerts" element={<CloseAlertsList />} />

              {/* EAM */}
              <Route path="/eam/dashboard" element={<AssetDashboard />} />
              <Route path="/eam/assets" element={<AssetsList />} />
              <Route path="/eam/inactive-assets" element={<InactiveAssetsList />} />
              <Route path="/eam/my-assets" element={<MyAssetsList />} />
              <Route path="/eam/tickets" element={<EAMTicketsList />} />
              <Route path="/eam/alerts" element={<EAMAlertsList />} />
              <Route path="/eam/asset-view/:orgId/:machineId" element={<AssetDetailsView />} />
              <Route path="/eam/ticket-view/:orgId/:ticketId" element={<EAMTicketView />} />
              <Route path="/eam/asset-info/:orgId/:machineId" element={<AssetViewMore />} />
              <Route path="/tech-tickets" element={<TechTicketsList />} />
              <Route path="/eam/my-tickets" element={<TicketsListByUser />} />

              {/* Reports */}
              <Route path="/report" element={<ReportData />} />

              <Route path="/user-modules" element={<SampleScreen2 />} />
              <Route path="/users" element={<UsersList />} />
              <Route path="/role-menu" element={<RoleMenu />} />

              {/* EDM */}
              <Route path="/edm/dashboard" element={<EDMDashboard />} />
              <Route path="/edm/documents" element={<DocumentList />} />
              <Route path="/edm/doc-version/:docId" element={<DocVersion />} />
              <Route path="/edm/user-access" element={<UserAccessDoc />} />
              <Route path="/edm/inactive-docs" element={<InActiveDocsList />} />

              {/* Flow Builder */}
              <Route path="/flowchart" element={<FlowBuilderC />} />

              {/* KPI Module */}
              <Route path="/kpi/dashboard" element={<KPIDashboard />} />
              <Route path="/kpi/master" element={<KPIMaster />} />
              <Route path="/kpi/employees" element={<EmployeeKpi />} />
              <Route path="/kpi/my-kpis" element={<MyKPIs />} />
              <Route path="/kpi/manager-review" element={<ManagerReviewCycle />} />
              <Route path="/kpi/employee-review" element={<EmployeeReviewCycle />} />
              <Route path="/kpi/allocate-kpi" element={<AllocateKPI />} />
              <Route path="/kpi/review-cycles" element={<ReviewCycles />} />
              <Route path="/kpi/hr-publish" element={<KPIHRPublish />} />

              {/* FAQs */}
              <Route path="/faq" element={<Help1 />} />
              <Route path="/tech-faqs" element={<TechHelp1 />} />
              <Route path="/organization-chart" element={<FullOrgChartstatic />} />
              <Route path="/remi" element={<ReminderScreen />} />
              {/* <Route path="/org" element={<OrganizationFlowChart />} /> */}

              {/* Repository Management */}
              <Route path="/rm-list" element={<SampleRM />} />
              <Route path="/item-master/:id" element={<ItemMasterDetails />} />
              <Route path="/rm/upload-documents" element={<SampleRM1 />} />

              {/* Assetless Ticket Request */}
              <Route path="/service-requests/assetless" element={<AssetlessTicketRequest />} />
              <Route path="/service-requests/my-tickets" element={<AssetlessMyTickets />} />
              <Route path="/service-requests/tech-tickets" element={<AssetlessTechMyTickets />} />

              {/* Organization charts */}
              {/* <Route path="/org-chart" element={<OrgChart />} /> */}
              {/* <Route path="/kpi" element={<KpiModule />} /> */}
            </Routes>
          }
        />
      </Routes>
    </Router>

  );
}

export default App;
