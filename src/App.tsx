import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import TaskPage from "./pages/TaskPage";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import { AuthProvider } from "./hooks/useAuth";
import { DarkModeProvider } from "./hooks/useDarkMode";
import { Analytics } from '@vercel/analytics/react';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <DarkModeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Analytics />
        
        {/* Warning Banner */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-0 relative z-50">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Notice:</strong> This project is paused. For a working demonstration, please contact the owner at{' '}
                <a href="mailto:hasanfaaz10@gmail.com" className="underline hover:text-yellow-800">
                  hasanfaaz10@gmail.com
                </a>
              </p>
            </div>
          </div>
        </div>
        
        <BrowserRouter>
          <AuthProvider>
            <Routes>
            {/* Public routes */}
            <Route
              path="/"
              element={<PublicRoute><HomePage /></PublicRoute>}
            />
            <Route
              path="/login"
              element={<PublicRoute><Login /></PublicRoute>}
            />
            <Route
              path="/register"
              element={<PublicRoute><Register /></PublicRoute>}
            />
            <Route
              path="/forgot-password"
              element={<PublicRoute><ForgotPassword /></PublicRoute>}
            />
            <Route
              path="/reset-password"
              element={<PublicRoute><ResetPassword /></PublicRoute>}
            />
            <Route
              path="/verify-email"
              element={<PublicRoute><VerifyEmail /></PublicRoute>}
            />
            <Route 
              path="/auth/callback" 
              element={<PublicRoute><AuthCallback /></PublicRoute>} 
            />
            
            {/* Protected routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/tasks" 
              element={
                <ProtectedRoute>
                  <Tasks />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/tasks/:taskId" 
              element={
                <ProtectedRoute>
                  <TaskPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </DarkModeProvider>
  </QueryClientProvider>
);

export default App;
