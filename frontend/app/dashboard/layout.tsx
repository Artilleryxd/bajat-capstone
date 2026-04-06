"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, logout } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { CurrencyProvider } from "@/lib/hooks/useCurrency";
import { getCurrencyCode } from "@/lib/utils/countryToCurrency";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [currencyCode, setCurrencyCode] = useState<string>("USD");

  useEffect(() => {
    const verifyAccess = async () => {
      const token = getToken();
      if (!token) {
        router.replace("/login");
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
          router.replace("/login");
          return;
        }

        const profile = await res.json();
        if (!profile.onboarding_complete) {
          router.replace("/onboarding");
          return;
        }

        if (profile.currency) {
          setCurrencyCode(profile.currency);
        } else if (profile.country) {
          setCurrencyCode(getCurrencyCode(profile.country));
        }

        setIsCheckingAccess(false);
      } catch {
        logout();
        router.replace("/login");
      }
    };

    verifyAccess();
  }, [router]);

  if (isCheckingAccess) {
    return null;
  }

  return (
    <CurrencyProvider currencyCode={currencyCode}>
      {children}
    </CurrencyProvider>
  );
}
