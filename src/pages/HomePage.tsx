
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { ChartPie, Database, Sparkles } from "lucide-react";

const HomePage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <div className="flex-1 container mx-auto px-4 py-12 md:py-24">
        <div className="grid gap-12 md:grid-cols-2 items-center">
          {/* Left side - Information and branding */}
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Transform your data with
                <span className="text-primary block mt-2">Cleanify</span>
              </h1>
              <p className="mt-6 text-xl text-gray-600">
                The intelligent data preprocessing platform that helps you clean,
                transform, and visualize your data with ease.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Database className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Effortless Data Cleaning</h3>
                  <p className="text-gray-600">Automatically detect and fix data quality issues</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <ChartPie className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Intuitive Visualization</h3>
                  <p className="text-gray-600">Gain insights with powerful analytics dashboards</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">AI-Powered Analysis</h3>
                  <p className="text-gray-600">Get smart recommendations for data preprocessing</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild className="w-full sm:w-auto">
                <Link to="/register">Get Started</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
                <Link to="/login">Sign In</Link>
              </Button>
            </div>
          </div>
          
          {/* Right side - Graphics */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute -z-10 h-full w-full bg-gradient-to-br from-primary/20 to-primary-foreground/5 rounded-full blur-3xl"></div>
              <img 
                src="/logo/logo.png" 
                alt="Cleanify Platform" 
                className="w-40 h-40 md:w-64 md:h-64 object-contain mx-auto"
              />
              <div className="mt-4 bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-gray-100 max-w-md mx-auto">
                <div className="h-4 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-primary rounded-full"></div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-primary/40 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
                <div className="mt-2 flex justify-between">
                  <div className="h-3 w-20 bg-gray-200 rounded"></div>
                  <div className="h-3 w-20 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center">
              <img src="/logo/logo.png" alt="Cleanify Logo" className="h-6 w-6 mr-2" />
              <span className="font-semibold">Cleanify</span>
            </div>
            <div className="mt-4 md:mt-0 text-sm text-gray-500">
              © 2025 Cleanify. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
