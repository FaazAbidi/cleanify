
import { ChartBar } from "lucide-react";

export const Navbar = () => {
  return (
    <nav className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <img src="/logo/logo.png" alt="Cleanify Logo" className="h-6 w-6 mr-2" />
          <span className="font-semibold text-lg">Cleanify</span>
        </div>
      </div>
    </nav>
  );
};
