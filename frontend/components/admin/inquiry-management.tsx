"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, MessageSquare, Trash2 } from "lucide-react"

const inquiries = [
  { id: 1, title: "결제 오류 문의", user: "kim@example.com", date: "2024-01-15", status: "pending" },
  { id: 2, title: "번역 품질 관련", user: "lee@example.com", date: "2024-01-14", status: "answered" },
  { id: 3, title: "계정 삭제 요청", user: "park@example.com", date: "2024-01-14", status: "pending" },
  { id: 4, title: "Pro 플랜 환불", user: "choi@example.com", date: "2024-01-13", status: "answered" },
]

export function InquiryManagement() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">문의 관리</h1>
          <p className="text-slate-500">고객 문의를 확인하고 답변하세요</p>
        </div>
      </div>

      <Card className="border-none shadow-lg">
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-slate-600">제목</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">작성자</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">날짜</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">상태</th>
                <th className="text-right p-4 text-sm font-medium text-slate-600">작업</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inquiry) => (
                <tr key={inquiry.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="p-4 text-sm text-slate-900">{inquiry.title}</td>
                  <td className="p-4 text-sm text-slate-600">{inquiry.user}</td>
                  <td className="p-4 text-sm text-slate-600">{inquiry.date}</td>
                  <td className="p-4">
                    <Badge
                      variant={inquiry.status === "answered" ? "default" : "secondary"}
                      className={
                        inquiry.status === "answered"
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                      }
                    >
                      {inquiry.status === "answered" ? "답변완료" : "대기중"}
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MessageSquare className="h-4 w-4" />
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
