import { Routes, Route, useLocation } from "react-router-dom";
import NavBar from "./components/NavBar";
import PublicDashboard from "./pages/PublicDashboard";
import ZoneDetail from "./pages/ZoneDetail";
import Login from "./pages/Login";
import AcceptInvitation from "./pages/AcceptInvitation";
import WorkerDashboard from "./pages/WorkerDashboard";
import WorkerZoneActivities from "./pages/WorkerZoneActivities";
import AdminDashboard from "./pages/AdminDashboard";
import ReviewerDashboard from "./pages/ReviewerDashboard";

export default function App() {
  const location = useLocation();
  const fullScreenPages = ["/login", "/accept-invitation"];
  const isFullScreen = fullScreenPages.includes(location.pathname);

  return (
    <>
      {!isFullScreen && <NavBar />}
      <Routes>
        <Route path="/" element={<PublicDashboard />} />
        <Route path="/zones/:id" element={<ZoneDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/accept-invitation" element={<AcceptInvitation />} />
        <Route path="/worker/dashboard" element={<WorkerDashboard />} />
        <Route path="/worker/zones/:zoneId" element={<WorkerZoneActivities />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/reviewer/dashboard" element={<ReviewerDashboard />} />
      </Routes>
    </>
  );
}
