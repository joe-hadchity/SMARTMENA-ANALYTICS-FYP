import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: React.ReactNode;
  className?: string;
};

export function MetricCard({
  label,
  value,
  change,
  changeType = "neutral",
  icon,
  className,
}: MetricCardProps) {
  const getChangeColor = () => {
    if (!change) return "";
    if (changeType === "positive") return "text-green-600 dark:text-green-400";
    if (changeType === "negative") return "text-red-600 dark:text-red-400";
    return "text-fg-muted";
  };

  const getChangeIcon = () => {
    if (!change) return null;
    if (changeType === "positive") return <ArrowUp className="h-3 w-3" />;
    if (changeType === "negative") return <ArrowDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const primaryColor = "oklch(46% 0.108 320)";

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
        className
      )}
      style={{ borderColor: "oklch(var(--border))" }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-fg-muted uppercase tracking-wider mb-1">
            {label}
          </p>
          <p className="text-2xl font-semibold text-fg">{value}</p>
          {change && (
            <div className={cn("flex items-center gap-1 mt-2 text-xs font-medium", getChangeColor())}>
              {getChangeIcon()}
              <span>{change}</span>
            </div>
          )}
        </div>
        {icon && (
          <div
            className="h-10 w-10 rounded-lg grid place-items-center flex-shrink-0"
            style={{ background: `${primaryColor}15`, color: primaryColor }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
