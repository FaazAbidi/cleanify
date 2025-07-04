import * as React from "react";
import { Badge, BadgeProps } from "./badge";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export type StatusType =
  | "PROCESSED"
  | "COMPLETED"
  | "RUNNING"
  | "PENDING"
  | "FAILED"
  | "ERROR"
  | "RAW"
  | string;

export interface StatusBadgeProps extends Omit<BadgeProps, "children"> {
  status: StatusType;
  customLabel?: string;
  variant?: "default" | "outline";
  size?: "default" | "sm";
}

const statusConfig: Record<
  string,
  { color: string; label: string; outlineColor: string }
> = {
  PROCESSED: {
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
    outlineColor: "border-green-500 text-green-700 bg-green-50 dark:border-green-600 dark:text-green-200 dark:bg-green-900/30",
    label: "Completed",
  },
  COMPLETED: {
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
    outlineColor: "border-green-500 text-green-700 bg-green-50 dark:border-green-600 dark:text-green-200 dark:bg-green-900/30",
    label: "Completed",
  },
  RUNNING: {
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
    outlineColor: "border-blue-500 text-blue-700 bg-blue-50 dark:border-blue-600 dark:text-blue-200 dark:bg-blue-900/30",
    label: "Processing",
  },
  PENDING: {
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-200",
    outlineColor: "border-gray-500 text-gray-700 bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:bg-gray-800/50",
    label: "Pending",
  },
  FAILED: {
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
    outlineColor: "border-red-500 text-red-700 bg-red-50 dark:border-red-600 dark:text-red-200 dark:bg-red-900/30",
    label: "Failed",
  },
  ERROR: {
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
    outlineColor: "border-red-500 text-red-700 bg-red-50 dark:border-red-600 dark:text-red-200 dark:bg-red-900/30",
    label: "Error",
  },
  RAW: {
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200",
    outlineColor: "border-yellow-500 text-yellow-700 bg-yellow-50 dark:border-yellow-600 dark:text-yellow-200 dark:bg-yellow-900/30",
    label: "Raw",
  },
};

export function StatusBadge({
  status,
  customLabel,
  variant = "default",
  size = "default",
  className,
  ...props
}: StatusBadgeProps) {
  const config = statusConfig[status] || {
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-200",
    outlineColor: "border-gray-500 text-gray-700 bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:bg-gray-800/50",
    label: status,
  };

  const displayLabel = customLabel || config.label;
  const colorClass = variant === "outline" ? config.outlineColor : config.color;
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-0.5 text-sm";

  return (
    <Badge
      variant={variant === "outline" ? "outline" : "secondary"}
      className={cn(colorClass, sizeClass, "items-center gap-1", className)}
      {...props}
    >
      {status === "RUNNING" && <Loader2 className="h-3 w-3 animate-spin" />}
      {displayLabel}
    </Badge>
  );
} 