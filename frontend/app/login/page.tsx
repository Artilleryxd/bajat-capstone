"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { loginSchema, LoginFormValues } from "@/lib/validation/loginSchema";
import { API_BASE_URL } from "@/lib/config";
import { getToken, setToken, setRefreshToken, logout } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const verifySession = async () => {
      const token = getToken();
      if (!token) { setIsCheckingSession(false); return; }
      try {
        const res = await fetch(`${API_BASE_URL}/v1/profile/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) { logout(); setIsCheckingSession(false); return; }
        const profile = await res.json();
        router.replace(profile.onboarding_complete ? "/dashboard" : "/onboarding");
      } catch {
        logout();
        setIsCheckingSession(false);
      }
    };
    verifySession();
  }, [router]);

  const { register, handleSubmit, formState: { errors, isValid }, getValues } =
    useForm<LoginFormValues>({ resolver: zodResolver(loginSchema), mode: "onChange" });

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
      if (!res.ok) throw new Error(responseData.detail?.detail || responseData.detail?.message || responseData.message || "Failed to log in");
      setToken(responseData.access_token);
      if (responseData.refresh_token) setRefreshToken(responseData.refresh_token);
      router.replace(responseData.status === "ONBOARDING_REQUIRED" ? "/onboarding" : "/dashboard");
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = getValues("email");
    if (!email || errors.email) { setErrorMessage("Please enter a valid email to reset password."); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail?.message || data.message || "Failed to reset password");
      alert("Password reset email sent (if email exists). Please check your inbox.");
    } catch (error: any) {
      setErrorMessage(error.message);
    }
  };

  if (isCheckingSession) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Plus+Jakarta+Sans:wght@700;800&display=swap');
        .auth-grid {
          background-image:
            linear-gradient(rgba(255,255,255,.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.018) 1px, transparent 1px);
          background-size: 44px 44px;
        }
        .auth-field {
          width: 100%;
          height: 44px;
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 10px;
          padding: 0 12px;
          font-size: 14px;
          color: white;
          outline: none;
          transition: border-color .15s ease, background .15s ease;
          font-family: 'Inter', sans-serif;
        }
        .auth-field::placeholder { color: rgba(255,255,255,.25); }
        .auth-field:focus {
          border-color: #E8357A;
          background: rgba(232,53,122,.06);
        }
        .auth-label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: rgba(255,255,255,.5);
          margin-bottom: 6px;
          letter-spacing: .04em;
          font-family: 'Inter', sans-serif;
        }
      `}</style>

      <div className="min-h-screen flex items-center justify-center auth-grid overflow-hidden"
           style={{ background: "#07090C", colorScheme: "dark" }}>

        {/* Ambient glows */}
        <div className="fixed pointer-events-none"
             style={{ top: "-10%", right: "10%", width: 480, height: 480,
               background: "radial-gradient(circle, rgba(232,53,122,.07) 0%, transparent 70%)" }} />
        <div className="fixed pointer-events-none"
             style={{ bottom: "-10%", left: "5%", width: 360, height: 360,
               background: "radial-gradient(circle, rgba(59,130,246,.05) 0%, transparent 70%)" }} />

        <div className="relative z-10 w-full max-w-md px-4">

          {/* Logo */}
          <div className="flex items-center justify-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #E8357A, #7B5EA7)" }}>
              <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
                <path d="M2 12 L5.5 7.5 L8.5 9.5 L13 3" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 18, color: "white", letterSpacing: "-0.02em" }}>
              FinSight AI
            </span>
          </div>

          {/* Card */}
          <div style={{
            background: "rgba(255,255,255,.03)",
            border: "1px solid rgba(255,255,255,.09)",
            borderRadius: 20,
            padding: "36px 32px",
            boxShadow: "0 32px 80px rgba(0,0,0,.5)",
          }}>
            <div style={{ marginBottom: 28, textAlign: "center" }}>
              <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 26,
                           color: "white", letterSpacing: "-0.02em", marginBottom: 6 }}>
                Welcome back
              </h1>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,.4)", fontFamily: "'Inter', sans-serif" }}>
                Log in to continue your financial journey
              </p>
            </div>

            {errorMessage && (
              <div style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)",
                            borderRadius: 10, padding: "10px 14px", fontSize: 13,
                            color: "#FCA5A5", marginBottom: 20, fontFamily: "'Inter', sans-serif" }}>
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="auth-label">Email</label>
                <input type="text" placeholder="you@example.com" {...register("email")} className="auth-field" />
                {errors.email && (
                  <p style={{ fontSize: 11, color: "#FCA5A5", marginTop: 5, fontFamily: "'Inter', sans-serif" }}>
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label className="auth-label" style={{ margin: 0 }}>Password</label>
                  <button type="button" onClick={handleForgotPassword}
                    style={{ fontSize: 11, color: "#E8357A", background: "none", border: "none",
                             cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                    Forgot password?
                  </button>
                </div>
                <div style={{ position: "relative" }}>
                  <input type={showPassword ? "text" : "password"} placeholder="••••••••"
                    {...register("password")} className="auth-field" style={{ paddingRight: 40 }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                             background: "none", border: "none", cursor: "pointer",
                             color: "rgba(255,255,255,.3)" }}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.password && (
                  <p style={{ fontSize: 11, color: "#FCA5A5", marginTop: 5, fontFamily: "'Inter', sans-serif" }}>
                    {errors.password.message}
                  </p>
                )}
              </div>

              <button type="submit" disabled={!isValid || isLoading}
                style={{
                  marginTop: 8,
                  height: 44,
                  borderRadius: 10,
                  background: isValid && !isLoading ? "#E8357A" : "rgba(232,53,122,.3)",
                  border: "none",
                  color: isValid && !isLoading ? "#000" : "rgba(0,0,0,.4)",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: isValid && !isLoading ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "background .15s ease",
                  width: "100%",
                }}>
                {isLoading && <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />}
                Log in
              </button>
            </form>

            <p style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,.35)",
                        marginTop: 24, fontFamily: "'Inter', sans-serif" }}>
              Don&apos;t have an account?{" "}
              <button type="button" onClick={() => router.push("/signup")}
                style={{ color: "#E8357A", background: "none", border: "none",
                         cursor: "pointer", fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
