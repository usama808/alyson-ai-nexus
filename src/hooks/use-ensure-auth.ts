import { useEffect, useState } from "react";
import { apiLogin, getAccessToken, isApiEnabled } from "@/lib/api";

const DEV_EMAIL = "admin@alyson.news";
const DEV_PASSWORD = "AlysonAI2026!";

/** Ensures a JWT exists when the API is enabled (dev seed login). */
export function useEnsureAuth() {
  const [ready, setReady] = useState(() => !isApiEnabled() || Boolean(getAccessToken()));

  useEffect(() => {
    if (!isApiEnabled()) {
      setReady(true);
      return;
    }
    if (getAccessToken()) {
      setReady(true);
      return;
    }

    let cancelled = false;
    apiLogin(DEV_EMAIL, DEV_PASSWORD)
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((err) => {
        console.warn("Dev auto-login failed:", err);
        if (!cancelled) setReady(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { authReady: ready, isAuthenticated: Boolean(getAccessToken()) };
}
