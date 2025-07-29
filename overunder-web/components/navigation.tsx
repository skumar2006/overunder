"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, UserPlus, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/",
    label: "Home",
    icon: Home,
  },
  {
    href: "/communities",
    label: "Communities",
    icon: Users,
  },
  {
    href: "/friends",
    label: "Friends",
    icon: UserPlus,
  },
  {
    href: "/profile",
    label: "Profile",
    icon: User,
  },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
      <div className="max-w-screen-xl mx-auto">
        <div className="flex justify-around">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-3 px-6 transition-colors",
                  isActive ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <item.icon className="w-6 h-6" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
} 