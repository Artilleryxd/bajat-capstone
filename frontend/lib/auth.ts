"use client";

export function getToken() {
  if (typeof window !== "undefined") {
    return localStorage.getItem("access_token");
  }
  return null;
}

export function setToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("access_token", token);
  }
}

export function logout() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("access_token");
  }
}
