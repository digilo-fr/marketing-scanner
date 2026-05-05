import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default:
          "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
        violet: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
        success:
          "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
        warning:
          "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
        danger:
          "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
        outline:
          "border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
