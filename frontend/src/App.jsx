import { Routes, Route, useLocation } from "react-router-dom";
import NavBar from "./components/NavBar";
import PublicDashboard from "./pages/PublicDashboard";
import ZoneDetail from "./pages/ZoneDetail";
import Login from "./pages/Login";

export default function App() {
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";

  return (
    <>
      {!isLoginPage && <NavBar />}
      <Routes>
        <Route path="/" element={<PublicDashboard />} />
        <Route path="/zones/:id" element={<ZoneDetail />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </>
  );
}
