"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/",         icon: "✏️", label: "대본 생성" },
  { href: "/library",  icon: "📚", label: "라이브러리" },
  { href: "/models",   icon: "🖥️", label: "모델"      },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-52 shrink-0 flex-col border-r border-gray-200 bg-white px-3 py-6">
      {/* 로고 */}
      <div className="mb-8 px-2">
        <span className="text-lg font-bold text-gray-900">🎬 AI Shorts</span>
      </div>

      {/* 네비게이션 */}
      <nav className="flex flex-col gap-1">
        {NAV.map(({ href, icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
