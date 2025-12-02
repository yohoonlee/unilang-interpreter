"use client"

import { useState } from "react"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminHeader } from "@/components/admin/admin-header"
import { DashboardContent } from "@/components/admin/dashboard-content"
import { InquiryManagement } from "@/components/admin/inquiry-management"
import { BlogManagement } from "@/components/admin/blog-management"
import { NoticeManagement } from "@/components/admin/notice-management"
import { BannerManagement } from "@/components/admin/banner-management"
import { EventBannerManagement } from "@/components/admin/event-banner-management"
import { YoutubeManagement } from "@/components/admin/youtube-management"
import { NewsletterManagement } from "@/components/admin/newsletter-management"
import { AdminAccountManagement } from "@/components/admin/admin-account-management"

export default function AdminDashboardPage() {
  const [activeMenu, setActiveMenu] = useState("dashboard")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const renderContent = () => {
    switch (activeMenu) {
      case "dashboard":
        return <DashboardContent />
      case "inquiries":
        return <InquiryManagement />
      case "blog":
        return <BlogManagement />
      case "notices":
        return <NoticeManagement />
      case "main-banner":
        return <BannerManagement />
      case "event-banner":
        return <EventBannerManagement />
      case "youtube":
        return <YoutubeManagement />
      case "newsletter":
        return <NewsletterManagement />
      case "admin-accounts":
        return <AdminAccountManagement />
      default:
        return <DashboardContent />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <AdminSidebar
        activeMenu={activeMenu}
        onMenuChange={setActiveMenu}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <div className={`transition-all duration-300 ${sidebarCollapsed ? "ml-20" : "ml-64"}`}>
        <AdminHeader />
        <main className="p-6">{renderContent()}</main>
      </div>
    </div>
  )
}
