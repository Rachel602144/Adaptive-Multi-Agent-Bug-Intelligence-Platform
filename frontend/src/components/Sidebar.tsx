import clsx from "clsx";
import { Bug, LayoutDashboard, History as HistoryIcon } from "lucide-react";
import { NavLink } from "react-router-dom";

const LINKS = [
  { to: "/", label: "Submit Bug", icon: Bug, end: true },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/history", label: "History", icon: HistoryIcon },
];

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

export function Sidebar() {
  return (
    <aside className="flex w-16 shrink-0 flex-col border-r border-slate-800 bg-slate-950 px-2 py-6 md:w-60 md:px-4">
      <div className="mb-8 flex items-center justify-center gap-2 px-2 md:justify-start">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500 text-sm font-bold text-white">
          B
        </div>
        <span className="hidden font-semibold text-white md:inline">Bug Intelligence</span>
      </div>

      <nav className="flex flex-col gap-1">
        {LINKS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={label}
            className={({ isActive }) =>
              clsx(
                "flex items-center justify-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition md:justify-start",
                focusRing,
                isActive
                  ? "bg-indigo-500 text-white"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-100",
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
            <span className="hidden md:inline">{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
