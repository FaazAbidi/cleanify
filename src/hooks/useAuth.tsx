import { useState, useEffect, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { useToast } from '@/components/ui/use-toast';
import { generateUniqueUsername, updateUserProfile } from '@/lib/username-utils';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: any;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log("Auth state changed:", event);
        
        // Update session and user state
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        // Use setTimeout to prevent auth deadlocks
        if (currentSession?.user) {
          setTimeout(async () => {
            try {
              const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', currentSession.user.id)
                .maybeSingle();
              
              setProfile(data);
              console.log("Profile loaded:", data);
            } catch (error) {
              console.error("Error fetching profile:", error);
            }
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', currentSession.user.id)
          .maybeSingle()
          .then(({ data }) => {
            setProfile(data);
            console.log("Initial profile loaded:", data);
          })
          .catch(error => {
            console.error("Error fetching initial profile:", error);
          })
          .finally(() => {
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign in with email and password
  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      console.log("Sign in successful:", data);
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
      
      navigate('/dashboard');
    } catch (error: any) {
      console.error("Sign-in error:", error);
      toast({
        title: "Sign-in failed",
        description: error.message || "There was an error signing in.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string, fullName: string): Promise<void> => {
    try {
      // First generate a unique username
      const username = await generateUniqueUsername(fullName);
      
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            username: username,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) throw error;

      console.log("Sign up successful:", data);
      
      // If user is created, create profile record
      if (data.user) {
        try {
          await updateUserProfile(data.user.id, fullName, username);
        } catch (profileError) {
          console.error('Error updating profile:', profileError);
          // Don't throw here as the user account was created successfully
          // The profile can be updated later
        }
      }
      
      if (data.session) {
        // User is automatically signed in (email confirmation is disabled)
        toast({
          title: "Registration successful!",
          description: "Your account has been created.",
        });
        navigate('/dashboard');
      } else {
        // Email confirmation is required
        toast({
          title: "Registration successful!",
          description: "Please check your email to confirm your account.",
        });
        navigate('/verify-email');
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error.message || "There was an error during registration.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Sign out
  const signOut = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      // Clear state
      setUser(null);
      setSession(null);
      setProfile(null);
      
      // Navigate to login page
      navigate('/login');
      
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    } catch (error: any) {
      console.error("Sign-out error:", error);
      toast({
        title: "Sign-out failed",
        description: error.message || "There was an error signing out.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Reset password
  const resetPassword = async (email: string): Promise<void> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      toast({
        title: "Password reset email sent",
        description: "Please check your email for password reset instructions.",
      });
      
      navigate('/login');
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast({
        title: "Password reset failed",
        description: error.message || "There was an error sending the password reset email.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Update password
  const updatePassword = async (newPassword: string): Promise<void> => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) throw error;
      
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully.",
      });
      
      navigate('/login');
    } catch (error: any) {
      console.error("Password update error:", error);
      toast({
        title: "Password update failed",
        description: error.message || "There was an error updating your password.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
