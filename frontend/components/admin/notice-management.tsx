"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Pin } from "lucide-react"

const notices = [
  { id: 1, title: "서비스 점검 안내 (1/20)", date: "2024-01-15", pinned: true, views: 2341 },
  { id: 2, title: "새로운 언어 추가 안내", date: "2024-01-10", pinned: false, views: 1892 },
  { id: 3, title: "요금제 개편 안내", date: "2024-01-05", pinned: false, views: 3421 },
]

export function NoticeManagement() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">공지사항 관리</h1>
          <p className="text-slate-500">공지사항을 관리하세요</p>
        </div>
        <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 gap-2">
          <Plus className="h-4 w-4" />
          공지 작성
        </Button>
      </div>

      <Card className="border-none shadow-lg">
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-slate-600">제목</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">날짜</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">고정</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">조회수</th>
                <th className="text-right p-4 text-sm font-medium text-slate-600">작업</th>
              </tr>
            </thead>
            <tbody>
              {notices.map((notice) => (
                <tr key={notice.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="p-4 text-sm text-slate-900 font-medium flex items-center gap-2">
                    {notice.pinned && <Pin className="h-4 w-4 text-blue-500" />}
                    {notice.title}
                  </td>
                  <td className="p-4 text-sm text-slate-600">{notice.date}</td>
                  <td className="p-4">
                    {notice.pinned && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">고정됨</Badge>}
                  </td>
                  <td className="p-4 text-sm text-slate-600">{notice.views.toLocaleString()}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
