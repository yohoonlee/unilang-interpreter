"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react"

const banners = [
  { id: 1, title: "메인 히어로 배너", image: "/abstract-hero-banner.png", active: true },
  { id: 2, title: "신규 기능 안내", image: "/feature-banner.jpg", active: true },
  { id: 3, title: "프로모션 배너", image: "/promo-banner.jpg", active: false },
]

export function BannerManagement() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">메인 배너</h1>
          <p className="text-slate-500">메인 페이지 배너를 관리하세요</p>
        </div>
        <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 gap-2">
          <Plus className="h-4 w-4" />
          배너 추가
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {banners.map((banner) => (
          <Card key={banner.id} className="border-none shadow-lg overflow-hidden">
            <div className="aspect-video bg-slate-100 relative">
              <img src={banner.image || "/placeholder.svg"} alt={banner.title} className="w-full h-full object-cover" />
              <Badge
                className={`absolute top-2 right-2 ${
                  banner.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"
                }`}
              >
                {banner.active ? "활성" : "비활성"}
              </Badge>
            </div>
            <CardContent className="p-4">
              <h3 className="font-medium text-slate-900 mb-3">{banner.title}</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-1 bg-transparent">
                  <Edit className="h-3 w-3" />
                  수정
                </Button>
                <Button variant="ghost" size="sm">
                  {banner.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
