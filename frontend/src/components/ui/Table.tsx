import clsx from "clsx";
import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="card overflow-x-auto p-0">
      <table className={clsx("w-full text-left text-sm", className)} {...props} />
    </div>
  );
}

export function THead(props: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500"
      {...props}
    />
  );
}

export function TBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={clsx("divide-y divide-slate-800", className)} {...props} />;
}

export function TR({
  className,
  onClick,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  const clickable = Boolean(onClick);
  return (
    <tr
      className={clsx(
        "transition hover:bg-slate-800/50",
        clickable &&
          "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500",
        className,
      )}
      onClick={onClick}
      tabIndex={clickable ? 0 : undefined}
      role={clickable ? "button" : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                (onClick as unknown as () => void)();
              }
            }
          : undefined
      }
      {...props}
    />
  );
}

export function TH({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={clsx("px-4 py-3 font-medium", className)} {...props} />;
}

export function TD({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={clsx("px-4 py-3 text-slate-300", className)} {...props} />;
}
