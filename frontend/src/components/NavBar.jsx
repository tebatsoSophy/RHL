import { Link } from "react-router-dom";

export default function NavBar() {
  return (
    <div className="navbar">
      <Link to="/" className="wordmark">
        RehabLedger
      </Link>
      <Link to="/login" className="signin">
        Sign in
      </Link>
    </div>
  );
}
