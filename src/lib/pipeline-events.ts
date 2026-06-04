import { CheckCircle2, AlertCircle, Zap } from "lucide-react";

export const eventIcon = {
  success: CheckCircle2,
  warning: AlertCircle,
  error: AlertCircle,
  info: Zap,
} as const;

export const eventClass = {
  success: "text-success",
  warning: "text-warning",
  error: "text-destructive",
  info: "text-primary",
} as const;
