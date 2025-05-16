
import { Link, useLocation } from "react-router-dom";
import { ChartBar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export const Navbar = () => {
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const user = localStorage.getItem("user");
    setIsLoggedIn(!!user);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    navigate("/login");
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="flex items-center">
            <img src="/logo/logo.png" alt="Cleanify Logo" className="h-6 w-6 mr-2" />
            <span className="font-semibold text-lg">Cleanify</span>
          </Link>
        </div>
        
        <div className="flex items-center space-x-4">
          {isLoggedIn ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/dashboard">
                  <ChartBar className="h-5 w-5 mr-1" />
                  Dashboard
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">
                  Login
                </Link>
              </Button>
              <Button variant="default" size="sm" asChild>
                <Link to="/register">
                  Register
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
