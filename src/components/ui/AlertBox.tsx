import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertType = "info" | "warning" | "danger" | "success";

interface AlertBoxProps {
  type?: AlertType;
  title: string;
  children: React.ReactNode;
  className?: string;
}

const styles: Record<AlertType, { wrap: string; icon: string; title: string }> = {
  info: {
    wrap: "bg-blue-500/[0.08] border-blue-500/30",
    icon: "text-blue-400",
    title: "text-blue-400",
  },
  warning: {
    wrap: "bg-yellow-500/[0.08] border-yellow-500/30",
    icon: "text-yellow-500",
    title: "text-yellow-500",
  },
  danger: {
    wrap: "bg-red-500/[0.08] border-red-500/30",
    icon: "text-red-500",
    title: "text-red-500",
  },
  success: {
    wrap: "bg-green-500/[0.08] border-green-500/30",
    icon: "text-green-500",
    title: "text-green-500",
  },
};

const icons: Record<AlertType, typeof Info> = {
  info: Info,
  warning: TriangleAlert,
  danger: AlertCircle,
  success: CheckCircle2,
};

export function AlertBox({ type = "info", title, children, className }: AlertBoxProps) {
  const Icon = icons[type];
  const s = styles[type];

  return (
    <div className={cn("rounded-xl border p-5 my-6 flex gap-4 items-start", s.wrap, className)}>
      <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", s.icon)} />
      <div className="flex-1 min-w-0">
        <h5 className={cn("font-semibold mb-1 mt-0 border-0 text-base", s.title)}>{title}</h5>
        <div className="text-sm leading-relaxed text-foreground/85">{children}</div>
      </div>
    </div>
  );
}
