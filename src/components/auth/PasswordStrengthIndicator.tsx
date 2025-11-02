import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
}

export const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const checks = [
    { label: "At least 8 characters", test: password.length >= 8 },
    { label: "Contains uppercase letter", test: /[A-Z]/.test(password) },
    { label: "Contains lowercase letter", test: /[a-z]/.test(password) },
    { label: "Contains number", test: /[0-9]/.test(password) },
  ];

  const passedChecks = checks.filter(c => c.test).length;
  const strength = passedChecks === 0 ? 0 : passedChecks <= 2 ? 1 : passedChecks === 3 ? 2 : 3;
  
  const strengthColors = [
    "bg-gray-200", // None
    "bg-red-500",  // Weak
    "bg-yellow-500", // Medium
    "bg-green-500" // Strong
  ];

  const strengthLabels = ["", "Weak", "Medium", "Strong"];

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      {/* Strength Bar */}
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              level <= strength ? strengthColors[strength] : "bg-gray-200"
            )}
          />
        ))}
      </div>
      
      {strength > 0 && (
        <p className="text-xs font-medium" style={{ color: `hsl(var(--${strength === 1 ? 'destructive' : strength === 2 ? 'warning' : 'success'}))` }}>
          {strengthLabels[strength]}
        </p>
      )}

      {/* Requirements Checklist */}
      <div className="space-y-1">
        {checks.map((check, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            {check.test ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <X className="h-3 w-3 text-gray-400" />
            )}
            <span className={check.test ? "text-green-600" : "text-muted-foreground"}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
