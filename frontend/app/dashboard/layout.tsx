"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

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
          router.replace("/login");
          return;
        }

        const profile = await res.json();
        if (!profile.onboarding_complete) {
          router.replace("/onboarding");
          return;
        }

        setIsCheckingAccess(false);
      } catch {
        router.replace("/login");
      }
    };

    verifyAccess();
  }, [router]);

  if (isCheckingAccess) {
    return null;
  }

  return <>{children}</>;
}
