import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, AlertCircle } from "lucide-react";

// Validation functions
const validateName = (name: string): string | null => {
  if (!name.trim()) {
    return "Name is required";
  }
  if (name.trim().length < 2) {
    return "Name must be at least 2 characters long";
  }
  if (name.trim().length > 50) {
    return "Name must be less than 50 characters";
  }
  if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
    return "Name can only contain letters and spaces";
  }
  return null;
};

const validateEmail = (email: string): string | null => {
  if (!email.trim()) {
    return "Email is required";
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Please enter a valid email address";
  }
  if (email.length > 254) {
    return "Email address is too long";
  }
  return null;
};

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
  name?: string;
  email?: string;
  password?: string;
}

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const { signUp, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Real-time validation
  useEffect(() => {
    const newErrors: FormErrors = {};
    
    if (touched.name) {
      const nameError = validateName(name);
      if (nameError) newErrors.name = nameError;
    }
    
    if (touched.email) {
      const emailError = validateEmail(email);
      if (emailError) newErrors.email = emailError;
    }
    
    if (touched.password) {
      const passwordError = validatePassword(password);
      if (passwordError) newErrors.password = passwordError;
    }
    
    setErrors(newErrors);
  }, [name, email, password, touched]);

  const handleFieldBlur = (fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
  };

  const validateForm = (): boolean => {
    const nameError = validateName(name);
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    
    const formErrors: FormErrors = {};
    if (nameError) formErrors.name = nameError;
    if (emailError) formErrors.email = emailError;
    if (passwordError) formErrors.password = passwordError;
    
    setErrors(formErrors);
    setTouched({ name: true, email: true, password: true });
    
    return Object.keys(formErrors).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      await signUp(email, password, name.trim());
      // Navigation is handled in signUp function
    } catch (error) {
      console.error("Registration error:", error);
      // Error is handled in signUp function
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
            <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
            <CardDescription>
              Enter your information to create your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  type="text" 
                  placeholder="John Doe" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => handleFieldBlur('name')}
                  disabled={isLoading}
                  className={errors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {errors.name && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.name}</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => handleFieldBlur('email')}
                  disabled={isLoading}
                  className={errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {errors.email && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.email}</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => handleFieldBlur('password')}
                  disabled={isLoading}
                  className={errors.password ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                
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
                
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Password must contain:</p>
                  <ul className="list-disc list-inside space-y-0.5 ml-2">
                    <li className={password.length >= 8 ? "text-green-600" : ""}>At least 8 characters</li>
                    <li className={/(?=.*[a-z])/.test(password) ? "text-green-600" : ""}>One lowercase letter</li>
                    <li className={/(?=.*[A-Z])/.test(password) ? "text-green-600" : ""}>One uppercase letter</li>
                    <li className={/(?=.*\d)/.test(password) ? "text-green-600" : ""}>One number</li>
                    <li className={/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(password) ? "text-green-600" : ""}>One special character</li>
                  </ul>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || Object.keys(errors).length > 0}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : "Create account"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Login
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Register;
