"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Settings,
    Archive,
    ChevronLeft,
    ChevronRight,
    ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
    {
        label: "ダッシュボード",
        href: "/dashboard",
        icon: LayoutDashboard,
        description: "タスク一覧・アラート",
    },
    {
        label: "利用者一覧",
        href: "/clients",
        icon: Users,
        description: "利用者の登録・管理",
    },
    {
        label: "退所者アーカイブ",
        href: "/archive",
        icon: Archive,
        description: "退所者の履歴閲覧",
    },
];

const adminItems = [
    {
        label: "マスタ設定",
        href: "/settings",
        icon: Settings,
        description: "期限ルール・項目管理",
    },
];

export function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <aside
            className={cn(
                "flex flex-col h-screen border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out",
                collapsed ? "w-[68px]" : "w-[260px]"
            )}
        >
            {/* ロゴ / アプリ名 */}
            <div className="flex items-center gap-3 px-4 h-16 shrink-0">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                </div>
                {!collapsed && (
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-bold tracking-tight truncate">
                            期限管理システム
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate">
                            A型事業所向け
                        </span>
                    </div>
                )}
            </div>

            <Separator />

            {/* ナビゲーション */}
            <nav className="flex-1 flex flex-col gap-1 px-2 py-3 overflow-y-auto">
                <span
                    className={cn(
                        "text-[10px] font-semibold uppercase text-muted-foreground px-2 mb-1 tracking-widest",
                        collapsed && "sr-only"
                    )}
                >
                    メニュー
                </span>

                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");

                    const linkContent = (
                        <Link
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                            )}
                        >
                            <item.icon className="w-5 h-5 shrink-0" />
                            {!collapsed && <span className="truncate">{item.label}</span>}
                        </Link>
                    );

                    if (collapsed) {
                        return (
                            <Tooltip key={item.href} delayDuration={0}>
                                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                                <TooltipContent side="right" className="flex flex-col">
                                    <span className="font-medium">{item.label}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {item.description}
                                    </span>
                                </TooltipContent>
                            </Tooltip>
                        );
                    }

                    return <div key={item.href}>{linkContent}</div>;
                })}

                {/* 管理者メニュー */}
                <Separator className="my-2" />
                <span
                    className={cn(
                        "text-[10px] font-semibold uppercase text-muted-foreground px-2 mb-1 tracking-widest",
                        collapsed && "sr-only"
                    )}
                >
                    管理者
                </span>

                {adminItems.map((item) => {
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");

                    const linkContent = (
                        <Link
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                            )}
                        >
                            <item.icon className="w-5 h-5 shrink-0" />
                            {!collapsed && <span className="truncate">{item.label}</span>}
                        </Link>
                    );

                    if (collapsed) {
                        return (
                            <Tooltip key={item.href} delayDuration={0}>
                                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                                <TooltipContent side="right" className="flex flex-col">
                                    <span className="font-medium">{item.label}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {item.description}
                                    </span>
                                </TooltipContent>
                            </Tooltip>
                        );
                    }

                    return <div key={item.href}>{linkContent}</div>;
                })}
            </nav>

            {/* 折りたたみボタン */}
            <Separator />
            <div className="p-2">
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-center"
                    onClick={() => setCollapsed(!collapsed)}
                >
                    {collapsed ? (
                        <ChevronRight className="w-4 h-4" />
                    ) : (
                        <>
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            <span className="text-xs">折りたたむ</span>
                        </>
                    )}
                </Button>
            </div>
        </aside>
    );
}
