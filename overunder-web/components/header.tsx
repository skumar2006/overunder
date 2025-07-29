"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/",
    label: "Markets",
  },
  {
    href: "/live",
    label: "Live",
  },
  {
    href: "/ideas",
    label: "Ideas",
  },
  {
    href: "/profile",
    label: "Portfolio",
  },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-green-600">
              OverUnder
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-gray-900",
                    isActive ? "text-gray-900" : "text-gray-600"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Search and Auth */}
          <div className="flex items-center space-x-4">
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search markets or profiles"
                className="pl-10 w-64 bg-gray-50 border-gray-200"
              />
            </div>
            <Button variant="ghost" size="sm">
              Log in
            </Button>
            <Button size="sm" className="bg-green-600 hover:bg-green-700">
              Sign up
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
} 