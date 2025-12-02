"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash2, Play } from "lucide-react"

const videos = [
  { id: 1, title: "UniLang 소개 영상", thumbnail: "/youtube-thumbnail-intro.jpg", views: 12345 },
  { id: 2, title: "실시간 통역 사용법", thumbnail: "/youtube-thumbnail-tutorial.jpg", views: 8923 },
]

export function YoutubeManagement() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">유튜브 영상</h1>
          <p className="text-slate-500">유튜브 영상을 관리하세요</p>
        </div>
        <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 gap-2">
          <Plus className="h-4 w-4" />
          영상 추가
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => (
          <Card key={video.id} className="border-none shadow-lg overflow-hidden">
            <div className="aspect-video bg-slate-100 relative group">
              <img
                src={video.thumbnail || "/placeholder.svg"}
                alt={video.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Play className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
            <CardContent className="p-4">
              <h3 className="font-medium text-slate-900 mb-1">{video.title}</h3>
              <p className="text-sm text-slate-500 mb-3">조회수 {video.views.toLocaleString()}</p>
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
