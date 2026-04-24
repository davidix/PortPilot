import { Sparkle } from "./Icon.js";

interface Props {
  title: string;
  description: string;
  hint?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, hint, action }: Props) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/5 bg-ink-900/50 p-10 text-center shadow-bezel">
      <div className="pointer-events-none absolute inset-0 -z-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(56,189,248,0.10),transparent_60%)]" />
      <div className="relative z-10 mx-auto flex max-w-sm flex-col items-center gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-ink-800/80 text-sky-200 shadow-bezel">
          <Sparkle size={18} />
        </span>
        <h3 className="text-lg font-semibold tracking-tight text-white">{title}</h3>
        <p className="text-sm leading-relaxed text-zinc-400">{description}</p>
        {hint ? <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{hint}</p> : null}
        {action}
      </div>
    </section>
  );
}
