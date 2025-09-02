import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Twitter } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  const handleTwitterLogin = () => {
    // This will be implemented with Firebase Auth
    window.location.href = '/api/auth/twitter/login'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <Link href="/" className="flex justify-center">
            <div className="flex items-center">
              <Twitter className="h-8 w-8 text-primary mr-2" />
              <span className="text-2xl font-bold">Followlytics</span>
            </div>
          </Link>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Connect your X (Twitter) account to start tracking unfollows
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Connect with X</CardTitle>
            <CardDescription>
              We'll securely connect to your X account to track follower changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleTwitterLogin}
              className="w-full flex items-center justify-center"
              size="lg"
            >
              <Twitter className="h-5 w-5 mr-2" />
              Continue with X (Twitter)
            </Button>
            
            <div className="mt-6 text-xs text-gray-500 text-center">
              <p>By continuing, you agree to our Terms of Service and Privacy Policy.</p>
              <p className="mt-2">We only access public follower information and never post on your behalf.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
