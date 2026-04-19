"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { signupSchema, SignupFormValues } from "@/lib/validation/signupSchema";
import { PasswordStrengthMeter } from "@/components/ui/password-strength-meter";
import { API_BASE_URL } from "@/lib/config";
import { getToken, setToken, setRefreshToken } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const token = getToken();
    if (token) router.replace("/dashboard");
  }, [router]);

  const { register, handleSubmit, watch, formState: { errors, isValid } } =
    useForm<SignupFormValues>({ resolver: zodResolver(signupSchema), mode: "onChange" });

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch(`${API_BASE_URL}/v1/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });
      const responseData = await res.json();
      if (!res.ok) throw new Error(responseData.detail?.detail || responseData.detail?.message || responseData.message || "Failed to create account");

      const loginRes = await fetch(`${API_BASE_URL}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) throw new Error(loginData.detail?.detail || loginData.detail?.message || loginData.message || "Failed to log in after signup");

      setToken(loginData.access_token);
      if (loginData.refresh_token) setRefreshToken(loginData.refresh_token);
      router.replace("/onboarding");
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const passwordValue = watch("password");

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

      <div className="min-h-screen flex items-center justify-center auth-grid overflow-hidden py-8"
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
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 18,
                           color: "white", letterSpacing: "-0.02em" }}>
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
                Create an account
              </h1>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,.4)", fontFamily: "'Inter', sans-serif" }}>
                Join us to start your financial journey
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
                <input type="email" placeholder="you@example.com" {...register("email")} className="auth-field" />
                {errors.email && (
                  <p style={{ fontSize: 11, color: "#FCA5A5", marginTop: 5, fontFamily: "'Inter', sans-serif" }}>
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="auth-label">Password</label>
                <div style={{ position: "relative" }}>
                  <input type={showPassword ? "text" : "password"}
                    {...register("password")} className="auth-field" style={{ paddingRight: 40 }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                             background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.3)" }}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.password && passwordValue && (
                  <p style={{ fontSize: 11, color: "#FCA5A5", marginTop: 5, fontFamily: "'Inter', sans-serif" }}>
                    {errors.password.message}
                  </p>
                )}
                <div style={{ marginTop: 8 }}>
                  <PasswordStrengthMeter password={passwordValue} />
                </div>
              </div>

              <div>
                <label className="auth-label">Confirm Password</label>
                <div style={{ position: "relative" }}>
                  <input type={showConfirmPassword ? "text" : "password"}
                    {...register("confirmPassword")} className="auth-field" style={{ paddingRight: 40 }} />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                             background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.3)" }}>
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p style={{ fontSize: 11, color: "#FCA5A5", marginTop: 5, fontFamily: "'Inter', sans-serif" }}>
                    {errors.confirmPassword.message}
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
                Create account
              </button>
            </form>

            <p style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,.35)",
                        marginTop: 24, fontFamily: "'Inter', sans-serif" }}>
              Already have an account?{" "}
              <button type="button" onClick={() => router.push("/login")}
                style={{ color: "#E8357A", background: "none", border: "none",
                         cursor: "pointer", fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>
                Log in
              </button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
