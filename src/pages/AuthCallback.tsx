
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const AuthCallback = () => {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Get the code from the URL
    const code = searchParams.get('code');

    if (!code) {
      setError("No auth code found in URL");
      return;
    }

    // Handle the OAuth or email confirmation redirect
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (error) throw error;
        
        if (data.session) {
          // Redirect to the dashboard on successful authentication
          navigate('/dashboard');
        } else {
          setError("Failed to get session from code");
        }
      } catch (err: any) {
        console.error("Auth callback error:", err);
        setError(err.message || "An error occurred during authentication");
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="mx-auto max-w-md p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-xl font-semibold text-red-600 mb-2">Authentication Error</h1>
          <p className="text-gray-700">{error}</p>
          <div className="mt-6">
            <button 
              onClick={() => navigate('/login')}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while processing
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <h1 className="mt-4 text-xl font-semibold">Processing authentication...</h1>
        <p className="mt-2 text-gray-600">Please wait while we complete the authentication process.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
