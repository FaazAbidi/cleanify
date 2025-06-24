import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";

// Password validation function
const validatePassword = (password: string): string | null => {
  if (!password) {
    return "Password is required";
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters long";
  }
  if (password.length > 128) {
    return "Password must be less than 128 characters";
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return "Password must contain at least one lowercase letter";
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }
  if (!/(?=.*\d)/.test(password)) {
    return "Password must contain at least one number";
  }
  if (!/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(password)) {
    return "Password must contain at least one special character";
  }
  return null;
};

interface FormErrors {
  password?: string;
  confirmPassword?: string;
}

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const { updatePassword } = useAuth();

  // Real-time validation
  useEffect(() => {
    const newErrors: FormErrors = {};
    
    if (touched.password) {
      const passwordError = validatePassword(password);
      if (passwordError) newErrors.password = passwordError;
    }
    
    if (touched.confirmPassword) {
      if (!confirmPassword) {
        newErrors.confirmPassword = "Please confirm your password";
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }
    
    setErrors(newErrors);
  }, [password, confirmPassword, touched]);

  const handleFieldBlur = (fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
  };

  const validateForm = (): boolean => {
    const passwordError = validatePassword(password);
    const confirmPasswordError = !confirmPassword ? "Please confirm your password" : 
                                password !== confirmPassword ? "Passwords do not match" : null;
    
    const formErrors: FormErrors = {};
    if (passwordError) formErrors.password = passwordError;
    if (confirmPasswordError) formErrors.confirmPassword = confirmPasswordError;
    
    setErrors(formErrors);
    setTouched({ password: true, confirmPassword: true });
    
    return Object.keys(formErrors).length === 0;
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      await updatePassword(password);
    } catch (error) {
      console.error("Update password error:", error);
      // Error is handled in updatePassword function
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/(?=.*[a-z])/.test(password)) score++;
    if (/(?=.*[A-Z])/.test(password)) score++;
    if (/(?=.*\d)/.test(password)) score++;
    if (/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(password)) score++;
    
    if (score === 0 || password.length === 0) return { score: 0, label: "", color: "" };
    if (score <= 2) return { score: score * 20, label: "Weak", color: "bg-red-500" };
    if (score <= 3) return { score: score * 20, label: "Fair", color: "bg-yellow-500" };
    if (score <= 4) return { score: score * 20, label: "Good", color: "bg-blue-500" };
    return { score: 100, label: "Strong", color: "bg-green-500" };
  };

  const passwordStrength = getPasswordStrength(password);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[calc(100vh-64px)]">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
            <CardDescription>
              Enter your new password below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => handleFieldBlur('password')}
                    disabled={isLoading}
                    className={errors.password ? "border-red-500 focus-visible:ring-red-500 pr-10" : "pr-10"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {/* Password strength indicator */}
                {password && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Password strength:</span>
                      <span className={`font-medium ${
                        passwordStrength.label === 'Weak' ? 'text-red-600' :
                        passwordStrength.label === 'Fair' ? 'text-yellow-600' :
                        passwordStrength.label === 'Good' ? 'text-blue-600' :
                        'text-green-600'
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${passwordStrength.score}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {errors.password && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.password}</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input 
                    id="confirmPassword" 
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => handleFieldBlur('confirmPassword')}
                    disabled={isLoading}
                    className={errors.confirmPassword ? "border-red-500 focus-visible:ring-red-500 pr-10" : "pr-10"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {errors.confirmPassword && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.confirmPassword}</span>
                  </div>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || Object.keys(errors).length > 0}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : "Update Password"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              Remember your password?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Return to login
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
