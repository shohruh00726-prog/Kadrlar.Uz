export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5 text-2xl text-white/25">
        ◇
      </div>
      <p className="text-sm font-medium text-white/60">{title}</p>
      {description ? (
        <p className="mt-1 max-w-xs text-xs text-white/40">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
