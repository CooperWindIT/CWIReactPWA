import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import VisitingList from './Components/Visitings/List';
import SignIn from './Components/Auth/Signin';
import ContactorsList from './Components/Contarctors/List';
import UsersList from './Components/Users/List';
import RoleMenu from './Components/RoleMenu/RoleMenu';
import ReportData from './Components/Reports/ReportData';
import Dashboard from './Components/Dashboard/Dashboard';
import Sample from './Components/Dashboard/sample';

function App() {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="visitors" element={<VisitingList />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="contractors" element={<ContactorsList />} />
          <Route path="users" element={<UsersList />} />
          <Route path="/" element={<SignIn />} />
          <Route path="/sample" element={<Sample />} />
          <Route path="role-menu" element={<RoleMenu />} />
          <Route path="report" element={<ReportData />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
