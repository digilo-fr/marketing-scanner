import { cn } from "@/lib/utils";
import type { Grade } from "@/types";

export function gradeFor(score: number): Grade {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 45) return "D";
  return "F";
}

function colorFor(score: number): string {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 60) return "bg-violet-500";
  if (score >= 45) return "bg-amber-500";
  return "bg-red-500";
}

interface ScoreBarProps {
  score: number;
  label?: string;
  showGrade?: boolean;
  className?: string;
}

export function ScoreBar({
  score,
  label,
  showGrade = false,
  className,
}: ScoreBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const grade = gradeFor(clamped);
  return (
    <div className={cn("w-full", className)}>
      {(label || showGrade) && (
        <div className="mb-1.5 flex items-center justify-between text-sm">
          {label && <span className="font-medium">{label}</span>}
          <span className="flex items-center gap-2 tabular-nums text-neutral-600 dark:text-neutral-400">
            {showGrade && (
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                {grade}
              </span>
            )}
            {clamped}/100
          </span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? `Score ${clamped}`}
        className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
      >
        <div
          className={cn("h-full rounded-full transition-all", colorFor(clamped))}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
