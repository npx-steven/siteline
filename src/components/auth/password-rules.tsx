import { IconCircle, IconCircleCheckFilled } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

// Live checklist for a new password. Mirrors passwordSchema in
// lib/validators/auth.ts — change both together.
function PasswordRules({ password }: { password: string }) {
  if (password.length === 0) return null;

  const rules = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "At least 1 uppercase letter (A–Z)", met: /[A-Z]/.test(password) },
    { label: "At least 1 number (0–9)", met: /[0-9]/.test(password) },
    {
      label: "At least 1 special character (!@#$…)",
      met: /[^\w\s]/.test(password),
    },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <ul className="space-y-2 text-xs">
        {rules.map((r) => (
          <li
            key={r.label}
            className={cn(
              "flex items-center gap-2 transition-colors",
              r.met ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {r.met ? (
              <IconCircleCheckFilled size={18} className="text-foreground" />
            ) : (
              <IconCircle size={18} className="text-muted-foreground/40" />
            )}
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PasswordRules;
