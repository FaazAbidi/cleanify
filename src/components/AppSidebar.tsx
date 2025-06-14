import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  ListTodo,
  UserRound,
  HelpCircle,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeft,
  X,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useRef } from "react";

export function AppSidebar({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const [isExpanded, setIsExpanded] = useState(() => {
    const storedValue = localStorage.getItem("sidebarExpanded");
    return storedValue !== null ? JSON.parse(storedValue) : true;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu when changing routes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Persist isExpanded state to localStorage
  useEffect(() => {
    localStorage.setItem("sidebarExpanded", JSON.stringify(isExpanded));
  }, [isExpanded]);

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Navigation items for the sidebar
  const navigationItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Tasks",
      href: "/tasks",
      icon: ListTodo,
    },
    {
      name: "Profile",
      href: "/profile",
      icon: UserRound,
    },
  ];

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleProfileMenu = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen);
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-slate-100">
      {/* Collapsed sidebar with icons only - shown when sidebar is collapsed on desktop */}
      <div
        className={cn(
          "fixed top-0 bottom-0 left-0 w-14 flex-shrink-0 bg-white border-r border-gray-200 flex-col items-center z-30",
          "md:flex transform transition-transform duration-300 ease-in-out", 
          isExpanded ? "md:opacity-0 md:-translate-x-full" : "md:opacity-100 md:translate-x-0",
          "hidden" // Always hidden on mobile
        )}
      >
        <div className="w-full py-4 flex justify-center">
          <img src="/logo/logo.png" alt="Logo" className="h-6 w-6" />
        </div>

        {/* Main navigation */}
        <div className="w-full mt-4 flex flex-col items-center gap-1 pt-4">
          {navigationItems.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-md",
                location.pathname === item.href
                  ? "bg-primary/10 text-primary"
                  : "text-gray-500 hover:bg-gray-100"
              )}
            >
              <item.icon className="h-5 w-5" />
            </Link>
          ))}
        </div>

        {/* Space in between */}
        <div className="flex-1"></div>

        {/* Profile avatar */}
        <div className="mb-4 flex items-center relative">
          <button
            className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center"
            onClick={toggleProfileMenu}
          >
            {profile?.avatar ? (
              <img
                src={profile.avatar}
                alt="User avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <UserRound className="h-5 w-5 text-primary" />
            )}
          </button>
          {/* Profile dropdown menu for COLLAPSED sidebar */}
          {isProfileMenuOpen && !isExpanded && (
            <div
              ref={profileMenuRef}
              className="absolute bottom-2 left-full ml-2 px-2 py-2 bg-white shadow-lg rounded-md border border-gray-200 z-30 min-w-[8rem]"
            >
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 rounded-md text-red-500 hover:bg-gray-100 w-full text-left"
              >
                <LogOut className="h-5 w-5 mr-2" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expanded sidebar - shown when sidebar is expanded on desktop */}
      <div
        className={cn(
          "fixed top-0 bottom-0 left-0 w-64 bg-white border-r border-gray-200 flex-col z-30",
          "md:flex transform transition-transform duration-300 ease-in-out",
          isExpanded ? "md:opacity-100 md:translate-x-0" : "md:opacity-0 md:-translate-x-full",
          "hidden" // Hidden on mobile
        )}
      >
        <div className="h-14 lg:h-[60px] p-4 flex items-center justify-between border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <img src="/logo/logo.png" alt="Logo" className="h-6 w-6" />
            <span className="font-semibold text-lg">Cleanify</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="md:flex hidden"
          >
            <PanelLeftClose className="h-5 w-5" />
          </Button>
        </div>

        {/* Middle scrollable section */}
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Main navigation */}
          <div className="px-4 py-4">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center space-x-2 px-3 py-2 rounded-md my-1",
                  location.pathname === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            ))}
          </div>

          {/* Spacer - pushes remaining content to bottom */}
          <div className="flex-1"></div>

          {/* Help/Contact Card */}
          <div className="mx-4 mb-2 p-4 rounded-md bg-primary/5">
            <div className="flex items-center mb-2">
              <HelpCircle className="h-5 w-5 text-primary mr-2" />
              <span className="font-medium text-gray-800">Need help?</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Contact our support team for assistance with any issues.
            </p>
            <p className="text-sm font-medium text-primary">
              support@cleanify.com
            </p>
          </div>

          {/* Profile with dropdown menu - fixed at bottom */}
          <div className="p-4 border-t border-gray-200 relative flex-shrink-0">
            <button
              className="w-full flex items-center space-x-3"
              onClick={toggleProfileMenu}
            >
              <div className="h-10 w-10 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
                {profile?.avatar ? (
                  <img
                    src={profile.avatar}
                    alt="User avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRound className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <div className="font-medium text-gray-800">
                  {profile ? profile.username : user?.email?.split("@")[0]}
                </div>
              </div>
              <ChevronDown className="ml-auto h-4 w-4 text-gray-500" />
            </button>

            {/* Profile dropdown menu */}
            {isProfileMenuOpen && isExpanded && (
              <div
                ref={profileMenuRef}
                className="absolute bottom-14 left-20 px-2 py-2 bg-white shadow-lg rounded-md border border-gray-200 z-10 min-w-[8rem]"
              >
                <button
                  onClick={handleLogout}
                  className="flex items-center px-3 py-2 rounded-md text-red-500 hover:bg-gray-100 w-full text-left"
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={toggleMobileMenu}
        ></div>
      )}

      {/* Mobile sidebar */}
      <div
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-200 ease-in-out",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-4 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <img src="/logo/logo.png" alt="Logo" className="h-6 w-6" />
            <span className="font-semibold text-lg">Cleanify</span>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleMobileMenu}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Mobile navigation - with flex to allow for spacing */}
        <div className="flex flex-col h-full">
          {/* Navigation items */}
          <div className="px-4 py-4">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center space-x-2 px-3 py-2 rounded-md my-1",
                  location.pathname === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            ))}
          </div>

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Help/Contact Card for mobile */}
          <div className="mx-4 mb-2 p-4 rounded-md bg-primary/5">
            <div className="flex items-center mb-2">
              <HelpCircle className="h-5 w-5 text-primary mr-2" />
              <span className="font-medium text-gray-800">Need help?</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Contact our support team for assistance with any issues.
            </p>
            <p className="text-sm font-medium text-primary">
              support@cleanify.com
            </p>
          </div>

          {/* Logout on mobile */}
          <div className="px-4 py-2 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div
        className={cn(
          "flex flex-1 flex-col min-w-0",
          "transition-all duration-300 ease-in-out", // Add transition to main content
          isExpanded ? "md:ml-64" : "md:ml-14", // Adjust margin based on sidebar state
          "ml-0" // No margin on mobile
        )}
      >
        <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b bg-white px-4 lg:h-[60px] lg:px-6">
          {/* Toggle button - shown when sidebar is collapsed on desktop */}
          {!isExpanded && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="md:flex hidden"
            >
              <PanelLeft className="h-5 w-5" />
            </Button>
          )}

          {/* Mobile menu button - only visible on mobile */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMobileMenu}
            className="md:hidden flex"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="w-full flex-1 flex flex-row gap-2 items-center">
            {/* <h1 className="text-lg font-semibold">
              {navigationItems.find((item) => item.href === location.pathname)
                ?.name || "Cleanify"}
            </h1> */}

            <div className="flex flex-row gap-1 items-center">
              <h4 className="text-sm text-gray-500">Hello,</h4>
              <h4 className="text-sm font-semibold">{profile?.username}</h4>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 w-[100%]">{children}</main>
      </div>
    </div>
  );
}
