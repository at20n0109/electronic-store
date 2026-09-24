export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="font-heading text-2xl font-bold text-zinc-900 dark:text-zinc-50 md:text-3xl">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      )}
    </div>
  );
}
