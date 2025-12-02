"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Eye } from "lucide-react"

const posts = [
  { id: 1, title: "AI 통역 기술의 미래", author: "admin", date: "2024-01-15", status: "published", views: 1234 },
  { id: 2, title: "다국어 회의 가이드", author: "admin", date: "2024-01-12", status: "published", views: 892 },
  { id: 3, title: "번역 정확도 향상 팁", author: "admin", date: "2024-01-10", status: "draft", views: 0 },
]

export function BlogManagement() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">블로그 관리</h1>
          <p className="text-slate-500">블로그 게시글을 관리하세요</p>
        </div>
        <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 gap-2">
          <Plus className="h-4 w-4" />새 글 작성
        </Button>
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
                <th className="text-left p-4 text-sm font-medium text-slate-600">조회수</th>
                <th className="text-right p-4 text-sm font-medium text-slate-600">작업</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="p-4 text-sm text-slate-900 font-medium">{post.title}</td>
                  <td className="p-4 text-sm text-slate-600">{post.author}</td>
                  <td className="p-4 text-sm text-slate-600">{post.date}</td>
                  <td className="p-4">
                    <Badge
                      className={
                        post.status === "published"
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-100"
                      }
                    >
                      {post.status === "published" ? "게시됨" : "임시저장"}
                    </Badge>
                  </td>
                  <td className="p-4 text-sm text-slate-600">{post.views.toLocaleString()}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
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
