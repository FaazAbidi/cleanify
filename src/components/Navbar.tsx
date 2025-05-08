
import { ChartBar } from "lucide-react";

export const Navbar = () => {
  return (
    <nav className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <ChartBar className="h-6 w-6 text-data-blue mr-2" />
          <span className="font-semibold text-lg">Data Canvas</span>
        </div>
        <div>
          <a 
            href="https://github.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Documentation
          </a>
        </div>
      </div>
    </nav>
  );
};
