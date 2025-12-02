"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Eye, EyeOff, Globe, Sparkles } from "lucide-react"

const admins = [
  { id: 1, name: "관리자", email: "admin@unilang.com", role: "슈퍼관리자", lastLogin: "2024-01-15 14:30" },
  { id: 2, name: "홍길동", email: "hong@unilang.com", role: "관리자", lastLogin: "2024-01-14 09:15" },
]

export function AdminAccountManagement() {
  const [showRegisterForm, setShowRegisterForm] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({ name: "", email: "", password: "" })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">관리자 계정</h1>
          <p className="text-slate-500">관리자 계정을 관리하세요</p>
        </div>
        <Button onClick={() => setShowRegisterForm(true)} className="bg-gradient-to-r from-blue-500 to-cyan-500 gap-2">
          <Plus className="h-4 w-4" />
          관리자 추가
        </Button>
      </div>

      {/* Admin List */}
      <Card className="border-none shadow-lg">
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-slate-600">이름</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">이메일</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">권한</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">최근 접속</th>
                <th className="text-right p-4 text-sm font-medium text-slate-600">작업</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="p-4 text-sm text-slate-900 font-medium">{admin.name}</td>
                  <td className="p-4 text-sm text-slate-600">{admin.email}</td>
                  <td className="p-4">
                    <Badge
                      className={
                        admin.role === "슈퍼관리자"
                          ? "bg-purple-100 text-purple-700 hover:bg-purple-100"
                          : "bg-blue-100 text-blue-700 hover:bg-blue-100"
                      }
                    >
                      {admin.role}
                    </Badge>
                  </td>
                  <td className="p-4 text-sm text-slate-600">{admin.lastLogin}</td>
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

      {/* Register Form Modal - Similar to image 2 */}
      {showRegisterForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRegisterForm(false)} />
          <div className="relative w-full max-w-md mx-4">
            <Card className="border-none shadow-2xl">
              <CardContent className="p-8">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/30 mb-4">
                    <Globe className="h-8 w-8 text-white" />
                    <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">관리자 계정 생성</h2>
                  <p className="text-slate-500 mt-1">UniLang 관리자 계정을 생성합니다</p>
                </div>

                {/* Form */}
                <form className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name">이름</Label>
                    <Input
                      id="name"
                      placeholder="관리자 이름"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="bg-slate-50 border-slate-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-email">이메일</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="admin@unilang.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="bg-slate-50 border-slate-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-password">비밀번호</Label>
                    <div className="relative">
                      <Input
                        id="reg-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="bg-slate-50 border-slate-200 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
                  >
                    계정 생성
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => setShowRegisterForm(false)}
                    className="text-sm text-blue-500 hover:text-blue-600"
                  >
                    취소
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
