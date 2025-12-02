"use client"

import { Users, MessageSquare, Eye, TrendingUp, ArrowUp, ArrowDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const stats = [
  {
    title: "총 사용자",
    value: "12,543",
    change: "+12%",
    trend: "up",
    icon: Users,
    color: "blue",
  },
  {
    title: "신규 문의",
    value: "48",
    change: "+5%",
    trend: "up",
    icon: MessageSquare,
    color: "green",
  },
  {
    title: "오늘 방문자",
    value: "2,341",
    change: "-3%",
    trend: "down",
    icon: Eye,
    color: "purple",
  },
  {
    title: "번역 사용량",
    value: "89,234분",
    change: "+18%",
    trend: "up",
    icon: TrendingUp,
    color: "cyan",
  },
]

const recentActivities = [
  { action: "새 사용자 가입", user: "kim@example.com", time: "5분 전" },
  { action: "문의 접수", user: "lee@example.com", time: "12분 전" },
  { action: "Pro 플랜 결제", user: "park@example.com", time: "28분 전" },
  { action: "블로그 글 작성", user: "admin", time: "1시간 전" },
  { action: "배너 이미지 변경", user: "admin", time: "2시간 전" },
]

export function DashboardContent() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">대시보드</h1>
        <p className="text-slate-500">서비스 현황을 한눈에 확인하세요</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{stat.title}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
                    <div className="flex items-center gap-1 mt-2">
                      {stat.trend === "up" ? (
                        <ArrowUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowDown className="h-4 w-4 text-red-500" />
                      )}
                      <span
                        className={`text-sm font-medium ${stat.trend === "up" ? "text-green-500" : "text-red-500"}`}
                      >
                        {stat.change}
                      </span>
                      <span className="text-xs text-slate-400">vs 지난주</span>
                    </div>
                  </div>
                  <div
                    className={`p-3 rounded-xl ${
                      stat.color === "blue"
                        ? "bg-blue-100 text-blue-600"
                        : stat.color === "green"
                          ? "bg-green-100 text-green-600"
                          : stat.color === "purple"
                            ? "bg-purple-100 text-purple-600"
                            : "bg-cyan-100 text-cyan-600"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Activity */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>최근 활동</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{activity.action}</p>
                  <p className="text-xs text-slate-500">{activity.user}</p>
                </div>
                <span className="text-xs text-slate-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
