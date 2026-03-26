"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Animation } from "@/components/landing/lottie-animation"

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-background text-foreground flex items-center justify-center font-sans">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/30 via-background to-green-500/20 animate-gradient-slow opacity-60 dark:opacity-40 bg-[length:200%_200%]" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-3xl animate-blob animation-delay-2000" />
      </div>

      {/* Glassmorphism Container */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-12 h-screen max-h-[900px] flex flex-col justify-center animate-in fade-in duration-1000">
        <div className="w-full max-w-6xl mx-auto backdrop-blur-md bg-background/60 dark:bg-background/40 rounded-3xl border border-border/50 shadow-2xl overflow-hidden">
          
          {/* Layout Grid */}
          <div className="grid lg:grid-cols-2 min-h-[600px] md:min-h-[700px]">
            {/* Left Col: Text */}
            <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16 space-y-8 relative">
              <div className="space-y-4 relative z-10">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-green-500 pb-2">
                    Your path 
                  </span>
                  <br />
                  to financial freedom
                </h1>
                <p className="text-xl md:text-2xl text-muted-foreground font-medium max-w-md mt-4">
                  Personalised AI Financial consultant
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-6 relative z-10">
                <Button 
                  size="lg" 
                  onClick={() => router.push("/signup")}
                  className="rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 w-full sm:w-auto text-base px-8 h-14 bg-gradient-to-r from-blue-600 to-green-500 text-white border-0" 
                >
                  Sign Up
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={() => router.push("/login")}
                  className="rounded-full shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-300 w-full sm:w-auto text-base px-8 h-14 backdrop-blur-md bg-background/50 border-border/50" 
                >
                  Login
                </Button>
              </div>
            </div>

            {/* Right Col: Lottie Animation */}
            <div className="relative flex items-center justify-center p-10 lg:p-16 bg-gradient-to-br from-primary/5 to-transparent">
              {/* Decorative background behind animation */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-blue-500/5 to-green-500/5" />
              <div className="relative w-full max-w-md aspect-square drop-shadow-2xl">
                <Animation />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
