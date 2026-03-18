import { cn } from "@/lib/utils";

type SectionCardProps = {
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
};

export function SectionCard({
  title,
  description,
  className,
  children,
}: SectionCardProps) {
  return (
    <article className={cn("rounded-2xl border border-white/10 bg-[#0a0a0a] p-6", className)}>
      <h2 className="text-lg font-medium text-white">{title}</h2>
      {description ? <p className="mt-1 text-sm text-neutral-400">{description}</p> : null}
      {children ? <div className="mt-6">{children}</div> : null}
    </article>
  );
}
