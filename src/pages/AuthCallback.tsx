
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const AuthCallback = () => {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle the auth callback
        const { error } = await supabase.auth.getSession();

        if (error) {
          setError(error.message);
          return;
        }

        // Redirect to the dashboard after successful auth
        navigate("/dashboard", { replace: true });
      } catch (err) {
        console.error("Auth callback error:", err);
        setError("An unexpected error occurred.");
      }
    };

    handleAuthCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
          <p className="text-destructive mb-4">{error}</p>
          <button
            onClick={() => navigate("/login")}
            className="text-primary hover:underline"
          >
            Return to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Processing authentication...</h1>
        <p>Please wait while we complete the authentication process.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
