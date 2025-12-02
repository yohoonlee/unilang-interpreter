"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Bell,
  ImageIcon,
  Gift,
  Youtube,
  Mail,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Globe,
  Sparkles,
} from "lucide-react"

interface AdminSidebarProps {
  activeMenu: string
  onMenuChange: (menu: string) => void
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
}

const menuItems = [
  { id: "dashboard", label: "대시보드", icon: LayoutDashboard },
  { id: "inquiries", label: "문의 관리", icon: MessageSquare },
  { id: "blog", label: "블로그 관리", icon: FileText },
  { id: "notices", label: "공지사항 관리", icon: Bell },
  { id: "main-banner", label: "메인 배너", icon: ImageIcon },
  { id: "event-banner", label: "이벤트 배너", icon: Gift },
  { id: "youtube", label: "유튜브 영상", icon: Youtube },
  { id: "newsletter", label: "뉴스레터", icon: Mail },
  { id: "admin-accounts", label: "관리자 계정", icon: Users },
]

export function AdminSidebar({ activeMenu, onMenuChange, collapsed, onCollapsedChange }: AdminSidebarProps) {
  const router = useRouter()

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-white border-r border-slate-200 shadow-lg transition-all duration-300 z-50 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/30">
            <Globe className="h-5 w-5 text-white" />
            <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-yellow-400" />
          </div>
          {!collapsed && (
            <div>
              <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                UniLang
              </span>
              <p className="text-xs text-slate-500">관리자 페이지</p>
            </div>
          )}
        </Link>
        <button
          onClick={() => onCollapsedChange(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-slate-500" />
          )}
        </button>
      </div>

      {/* Menu Items */}
      <nav className="p-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeMenu === item.id
          return (
            <button
              key={item.id}
              onClick={() => onMenuChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                isActive
                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-slate-500"}`} />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-200">
        <div className={`flex items-center gap-3 px-3 py-2 ${collapsed ? "justify-center" : ""}`}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-medium">
            A
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">admin@unilang.com</p>
              <p className="text-xs text-slate-500">관리자</p>
            </div>
          )}
        </div>
        <button
          onClick={() => router.push("/admin")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-colors mt-2 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span className="text-sm font-medium">로그아웃</span>}
        </button>
      </div>
    </aside>
  )
}
