import { cn } from "@/lib/utils";

interface HealthStatusSelectorProps {
  value: 'green' | 'yellow' | 'red';
  onChange: (status: 'green' | 'yellow' | 'red') => void;
  disabled?: boolean;
}

export function HealthStatusSelector({ value, onChange, disabled }: HealthStatusSelectorProps) {
  const statuses = [
    { key: 'green' as const, label: 'Healthy', color: 'bg-emerald-500', ring: 'ring-emerald-500/30' },
    { key: 'yellow' as const, label: 'At Risk', color: 'bg-amber-500', ring: 'ring-amber-500/30' },
    { key: 'red' as const, label: 'Critical', color: 'bg-red-500', ring: 'ring-red-500/30' },
  ];

  return (
    <div className="flex items-center gap-2">
      {statuses.map((status) => (
        <button
          key={status.key}
          onClick={() => !disabled && onChange(status.key)}
          disabled={disabled}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
            "border border-border hover:border-primary/50",
            value === status.key && "ring-2 ring-offset-2 ring-offset-background",
            value === status.key && status.ring,
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <span className={cn("w-2.5 h-2.5 rounded-full", status.color)} />
          <span className="text-foreground">{status.label}</span>
        </button>
      ))}
    </div>
  );
}
