"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2 } from "lucide-react"

const events = [
  { id: 1, title: "신년 할인 이벤트", period: "2024.01.01 ~ 2024.01.31", active: true },
  { id: 2, title: "Pro 플랜 50% 할인", period: "2024.02.01 ~ 2024.02.14", active: false },
]

export function EventBannerManagement() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">이벤트 배너</h1>
          <p className="text-slate-500">이벤트 배너를 관리하세요</p>
        </div>
        <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 gap-2">
          <Plus className="h-4 w-4" />
          이벤트 추가
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {events.map((event) => (
          <Card key={event.id} className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-medium text-slate-900">{event.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{event.period}</p>
                </div>
                <Badge className={event.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"}>
                  {event.active ? "진행중" : "종료"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-1 bg-transparent">
                  <Edit className="h-3 w-3" />
                  수정
                </Button>
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
