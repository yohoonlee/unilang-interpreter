"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Users, Mail, TrendingUp } from "lucide-react"

const stats = [
  { label: "총 구독자", value: "4,521", icon: Users },
  { label: "발송된 뉴스레터", value: "48", icon: Mail },
  { label: "평균 열람율", value: "34.2%", icon: TrendingUp },
]

const recentNewsletters = [
  { id: 1, title: "1월 뉴스레터", sentDate: "2024-01-15", openRate: "32.5%", sent: 4200 },
  { id: 2, title: "신년 인사", sentDate: "2024-01-01", openRate: "45.2%", sent: 4100 },
]

export function NewsletterManagement() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">뉴스레터</h1>
          <p className="text-slate-500">뉴스레터를 관리하세요</p>
        </div>
        <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 gap-2">
          <Plus className="h-4 w-4" />새 뉴스레터
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="border-none shadow-lg">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Newsletters */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>발송 내역</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-slate-600">제목</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">발송일</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">발송수</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">열람율</th>
              </tr>
            </thead>
            <tbody>
              {recentNewsletters.map((newsletter) => (
                <tr key={newsletter.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="p-4 text-sm text-slate-900 font-medium">{newsletter.title}</td>
                  <td className="p-4 text-sm text-slate-600">{newsletter.sentDate}</td>
                  <td className="p-4 text-sm text-slate-600">{newsletter.sent.toLocaleString()}</td>
                  <td className="p-4 text-sm text-slate-600">{newsletter.openRate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
