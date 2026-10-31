import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { logout } from "../login/actions";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/questions", label: "Questions" },
  { href: "/admin/quizzes", label: "Quizzes" },
  { href: "/admin/account", label: "Account" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-1 border-b border-line pb-3 text-sm">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="rounded-md px-3 py-1.5 font-medium hover:bg-surface-2">
            {n.label}
          </Link>
        ))}
        <form action={logout} className="ml-auto">
          <button className="rounded-md px-3 py-1.5 text-muted hover:bg-surface-2">Sign out</button>
        </form>
      </nav>
      {children}
    </div>
  );
}
