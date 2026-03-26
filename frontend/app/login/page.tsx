"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { loginSchema, LoginFormValues } from "@/lib/validation/loginSchema";
import { API_BASE_URL } from "@/lib/config";
import { getToken, setToken, logout } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const verifySession = async () => {
      const token = getToken();
      if (!token) {
        setIsCheckingSession(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/v1/profile/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          logout();
          setIsCheckingSession(false);
          return;
        }

        const profile = await res.json();
        if (profile.onboarding_complete) {
          router.replace("/dashboard");
          return;
        }

        router.replace("/onboarding");
      } catch {
        logout();
        setIsCheckingSession(false);
      }
    };

    verifySession();
  }, [router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    getValues,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setErrorMessage("");
    
    try {
      const res = await fetch(`${API_BASE_URL}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.detail?.detail || responseData.detail?.message || responseData.message || "Failed to log in");
      }

      setToken(responseData.access_token);

      if (responseData.status === "ONBOARDING_REQUIRED") {
        router.replace("/onboarding");
      } else {
        router.replace("/dashboard");
      }
    } catch (error: any) {
      console.error("Login Error:", error);
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = getValues("email");
    if (!email || errors.email) {
      setErrorMessage("Please enter a valid email to reset password.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      
      if (!res.ok) {
         throw new Error(data.detail?.message || data.message || "Failed to reset password");
      }
      
      alert("Password reset email sent (if email exists). Please check your inbox.");
    } catch (error: any) {
      setErrorMessage(error.message);
    }
  };

  if (isCheckingSession) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8 p-6 space-y-8 border border-gray-100">
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Welcome back
          </h1>
          <p className="text-sm text-gray-500">
            Log in to continue your financial journey
          </p>
        </div>

        {errorMessage && (
          <div className="bg-red-50 text-red-500 text-sm p-3 rounded-lg border border-red-100">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              type="text"
              placeholder="you@example.com"
              {...register("email")}
              className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            {errors.email && (
              <p className="text-xs text-red-500 font-medium pt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs font-medium text-blue-600 hover:text-blue-500 transition-all focus:outline-none"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                {...register("password")}
                placeholder="••••••••"
                className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-500 font-medium pt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!isValid || isLoading}
            className="w-full inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-blue-600 text-white hover:bg-blue-700 h-11 px-4 py-2 mt-2 shadow-sm"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Login
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 pt-2">
          Don't have an account?{" "}
          <button 
            type="button" 
            onClick={() => router.push("/signup")}
            className="font-medium text-blue-600 hover:text-blue-500 hover:underline transition-all"
          >
            Sign up
          </button>
        </p>

      </div>
    </div>
  );
}
