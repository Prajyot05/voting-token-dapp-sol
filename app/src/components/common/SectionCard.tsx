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
    <article className={cn("rounded-2xl border border-cyan-300/20 bg-[#0b1233]/65 p-6 backdrop-blur", className)}>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {description ? <p className="mt-2 text-sm text-cyan-100/70">{description}</p> : null}
      {children ? <div className="mt-5">{children}</div> : null}
    </article>
  );
}
