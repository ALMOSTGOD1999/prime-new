"use client";

import { Link } from "@tanstack/react-router";

interface MobileBottomNavProps {
  isAdmin?: boolean;
  unreadCount?: number;
}

export function MobileBottomNav({ isAdmin = false, unreadCount = 0 }: MobileBottomNavProps) {
  if (isAdmin) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gold/20 bg-cream/95 backdrop-blur-sm sm:hidden">
        <div className="flex items-center justify-around py-2">
          <NavLink href="/admin" icon="📊" label="Home" />
          <NavLink href="/admin/users" icon="👥" label="Users" />
          <NavLink href="/admin/payout" icon="💸" label="Payouts" />
          <NavLink href="/admin/announcements" icon="📢" label="Alerts" />
          <NavLink href="/admin/revenue" icon="💰" label="Revenue" />
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gold/20 bg-cream/95 backdrop-blur-sm sm:hidden">
      <div className="flex items-center justify-around py-2">
        <NavLink href="/dashboard" icon="🏠" label="Home" />
        <NavLink href="/dashboard/add-user" icon="➕" label="Add" />
        <NavLink href="/dashboard/tree" icon="🌳" label="Tree" />
        <NavLink
          href="/dashboard/notifications"
          icon="🔔"
          label="Alerts"
          badge={unreadCount}
        />
        <NavLink href="/dashboard/profile" icon="👤" label="Profile" />
      </div>
    </nav>
  );
}

function NavLink({
  href,
  icon,
  label,
  badge,
}: {
  href: string;
  icon: string;
  label: string;
  badge?: number;
}) {
  return (
    <Link
      to={href}
      className="relative flex flex-col items-center gap-0.5 px-3 py-1 text-emerald/60 transition-colors hover:text-emerald"
      activeProps={{ className: "!text-emerald" }}
    >
      <span className="text-lg">{icon}</span>
      <span className="text-[8px] uppercase tracking-wider">{label}</span>
      {badge && badge > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[7px] font-bold text-cream">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </Link>
  );
}
