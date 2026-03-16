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
    Menu,
    X,
    LogOut,
    UserCircle,
    UserCog,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { logoutAction } from "@/app/logout-action";

interface SidebarProps {
    role: string;
    userName: string;
}

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
    {
        label: "ユーザー管理",
        href: "/settings/users",
        icon: UserCog,
        description: "スタッフの追加・変更",
    },
];

type NavItem = {
    label: string;
    href: string;
    icon: React.ElementType;
    description: string;
};

export function Sidebar({ role, userName }: SidebarProps) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    // ページ遷移時にモバイルメニューを閉じる
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    const isAdmin = role === "ADMIN";

    function NavLink({ item }: { item: NavItem }) {
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
                {(!collapsed || mobileOpen) && <span className="truncate">{item.label}</span>}
            </Link>
        );

        if (collapsed && !mobileOpen) {
            return (
                <Tooltip delayDuration={0}>
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

        return <div>{linkContent}</div>;
    }

    return (
        <>
            {/* モバイルヘッダー */}
            <div className="md:hidden flex items-center gap-3 px-4 h-14 border-b bg-sidebar fixed top-0 left-0 right-0 z-50">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setMobileOpen(!mobileOpen)}
                >
                    {mobileOpen ? (
                        <X className="w-5 h-5" />
                    ) : (
                        <Menu className="w-5 h-5" />
                    )}
                </Button>
                <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary text-primary-foreground">
                        <ShieldCheck className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold">期限管理システム</span>
                </div>
            </div>

            {/* モバイルオーバーレイ */}
            {mobileOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/40 z-40 pt-14"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* サイドバー本体 */}
            <aside
                className={cn(
                    "flex flex-col h-screen border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out z-50",
                    // デスクトップ
                    "hidden md:flex",
                    collapsed ? "w-[68px]" : "w-[260px]",
                    // モバイル
                    mobileOpen &&
                        "!flex fixed top-14 left-0 bottom-0 w-[260px] !h-[calc(100vh-3.5rem)] shadow-xl"
                )}
            >
                {/* ロゴ / アプリ名（デスクトップのみ） */}
                <div className="hidden md:flex items-center gap-3 px-4 h-16 shrink-0">
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

                <Separator className="hidden md:block" />

                {/* ナビゲーション */}
                <nav className="flex-1 flex flex-col gap-1 px-2 py-3 overflow-y-auto">
                    <span
                        className={cn(
                            "text-[10px] font-semibold uppercase text-muted-foreground px-2 mb-1 tracking-widest",
                            collapsed && "md:sr-only"
                        )}
                    >
                        メニュー
                    </span>

                    {navItems.map((item) => (
                        <NavLink key={item.href} item={item} />
                    ))}

                    {/* 管理者メニュー（ADMINのみ表示） */}
                    {isAdmin && (
                        <>
                            <Separator className="my-2" />
                            <span
                                className={cn(
                                    "text-[10px] font-semibold uppercase text-muted-foreground px-2 mb-1 tracking-widest",
                                    collapsed && "md:sr-only"
                                )}
                            >
                                管理者
                            </span>
                            {adminItems.map((item) => (
                                <NavLink key={item.href} item={item} />
                            ))}
                        </>
                    )}
                </nav>

                {/* ユーザー情報 + ログアウト */}
                <Separator />
                <div className="p-2 space-y-1">
                    {/* ユーザー情報 */}
                    {(!collapsed || mobileOpen) && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent/40">
                            <UserCircle className="w-5 h-5 shrink-0 text-muted-foreground" />
                            <div className="flex flex-col overflow-hidden min-w-0">
                                <span className="text-xs font-medium truncate">{userName}</span>
                                <span className="text-[10px] text-muted-foreground">
                                    {isAdmin ? "管理者" : "スタッフ"}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* ログアウトボタン */}
                    <form action={logoutAction}>
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Button
                                    type="submit"
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        "w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10",
                                        collapsed && !mobileOpen ? "justify-center px-0" : "justify-start"
                                    )}
                                >
                                    <LogOut className="w-4 h-4 shrink-0" />
                                    {(!collapsed || mobileOpen) && (
                                        <span className="ml-2 text-xs">ログアウト</span>
                                    )}
                                </Button>
                            </TooltipTrigger>
                            {collapsed && !mobileOpen && (
                                <TooltipContent side="right">ログアウト</TooltipContent>
                            )}
                        </Tooltip>
                    </form>

                    {/* 折りたたみボタン（デスクトップのみ） */}
                    <div className="hidden md:block">
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
                </div>
            </aside>
        </>
    );
}
