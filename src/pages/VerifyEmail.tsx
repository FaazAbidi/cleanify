
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { MailCheck } from "lucide-react";

const VerifyEmail = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[calc(100vh-64px)]">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <MailCheck className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center">Check your email</CardTitle>
            <CardDescription className="text-center">
              We've sent you a verification link. Please check your email and follow the instructions to verify your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              If you don't see the email, check your spam folder or try signing in to resend the verification email.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button variant="outline" asChild className="w-full">
              <Link to="/login">
                Return to login
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmail;
