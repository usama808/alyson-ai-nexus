import { useEffect, useRef } from "react";
import { apiLogin, getAccessToken, isApiEnabled } from "@/lib/api";

const DEV_EMAIL = "admin@alyson.news";
const DEV_PASSWORD = "AlysonAI2026!";

/** Signs in with seed admin when API is enabled and no token is stored (local dev). */
export function AuthBootstrap() {
  const started = useRef(false);

  useEffect(() => {
    if (!isApiEnabled()) return;
    if (getAccessToken()) return;
    if (started.current) return;
    started.current = true;

    apiLogin(DEV_EMAIL, DEV_PASSWORD).catch((err) => {
      console.warn("Dev auto-login failed:", err);
      started.current = false;
    });
  }, []);

  return null;
}
