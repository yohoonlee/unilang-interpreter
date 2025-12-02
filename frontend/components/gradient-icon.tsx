import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface GradientIconProps {
  icon: LucideIcon
  gradient: "blue" | "cyan" | "purple" | "pink" | "orange" | "green"
  size?: "sm" | "md" | "lg"
  className?: string
}

const gradientClasses = {
  blue: "from-blue-500 to-blue-700",
  cyan: "from-cyan-400 to-cyan-600",
  purple: "from-purple-500 to-purple-700",
  pink: "from-pink-500 to-pink-700",
  orange: "from-orange-400 to-orange-600",
  green: "from-emerald-400 to-emerald-600",
}

const sizeClasses = {
  sm: "h-10 w-10",
  md: "h-12 w-12",
  lg: "h-14 w-14",
}

const iconSizeClasses = {
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-7 w-7",
}

export function GradientIcon({ icon: Icon, gradient, size = "md", className }: GradientIconProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg",
        gradientClasses[gradient],
        sizeClasses[size],
        className,
      )}
    >
      {/* Glow effect */}
      <div
        className={cn(
          "absolute inset-0 rounded-xl bg-gradient-to-br opacity-50 blur-lg -z-10",
          gradientClasses[gradient],
        )}
      />
      <Icon className={cn("text-white", iconSizeClasses[size])} />
    </div>
  )
}
