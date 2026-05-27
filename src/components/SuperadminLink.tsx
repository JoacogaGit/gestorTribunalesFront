import { Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEsSuperadmin } from "@/hooks/useEsSuperadmin";

interface Props {
  variant?: "button" | "compact";
  className?: string;
}

/**
 * Link al Panel Superadmin. Solo se renderiza si el usuario tiene rol_global = 'superadmin'.
 */
export default function SuperadminLink({ variant = "button", className = "" }: Props) {
  const { esSuperadmin, loading } = useEsSuperadmin();
  const navigate = useNavigate();

  if (loading || !esSuperadmin) return null;

  if (variant === "compact") {
    return (
      <button
        onClick={() => navigate("/superadmin")}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/10 transition-colors ${className}`}
        title="Panel Superadmin"
      >
        <Shield className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Panel Superadmin</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => navigate("/superadmin")}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border border-indigo-500/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/20 transition-colors ${className}`}
    >
      <Shield className="w-4 h-4" />
      Panel Superadmin
    </button>
  );
}
