import { cn } from "@/lib/utils";

export function LightCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.03)] md:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
