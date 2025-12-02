"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Globe, Sparkles, Eye, EyeOff } from "lucide-react"

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onLogin: (email: string) => void
}

export function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    // Simulate login
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsLoading(false)
    onLogin(email)
  }

  return (
    <div className="fixed inset-0 z-[100] flex">
      {/* Close button - absolute top right */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
      >
        <X className="h-6 w-6 text-white" />
      </button>

      {/* Left side - Gradient background with branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Gradient background */}
        <div 
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, #14b8a6 0%, #06b6d4 30%, #22d3d3 60%, #a7f3d0 100%)",
          }}
        />
        
        {/* Decorative wave pattern */}
        <div className="absolute bottom-0 left-0 right-0 h-64 opacity-30">
          <svg viewBox="0 0 1200 200" className="w-full h-full">
            <path
              d="M0,100 C300,180 400,20 600,100 C800,180 900,20 1200,100 L1200,200 L0,200 Z"
              fill="rgba(255,255,255,0.3)"
            />
            <path
              d="M0,120 C250,180 450,40 650,120 C850,200 950,40 1200,120 L1200,200 L0,200 Z"
              fill="rgba(255,255,255,0.2)"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 lg:px-16">
          {/* Top badge */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-white/90 font-medium">AI 실시간 통역 서비스</p>
              <p className="text-white/60 text-sm">AI Interpreter Service</p>
            </div>
          </div>

          {/* Small label */}
          <p className="text-white/70 text-sm mb-2">AI 서비스 도입을 위한</p>

          {/* Main title */}
          <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
            AI 실시간 통역<br />서비스
          </h1>

          {/* Description */}
          <p className="text-white/80 text-lg max-w-md">
            누구나 쉽게 사용할 수 있는 AI 통역 서비스입니다.
          </p>
        </div>

        {/* Register button - top right of left panel */}
        <div className="absolute top-6 right-6">
          <Button 
            variant="outline" 
            className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur"
          >
            회원가입
          </Button>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-slate-100 p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo - only visible on small screens */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 shadow-lg shadow-teal-500/30 mb-4">
              <Globe className="h-8 w-8 text-white" />
              <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">UniLang</h2>
          </div>

          {/* Login card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 lg:p-10">
            <h2 className="text-2xl font-bold text-slate-800 text-center mb-8">로그인</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700">
                  이메일 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:ring-teal-500/20 h-12"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700">
                  비밀번호 <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:ring-teal-500/20 pr-10 h-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Remember me checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-teal-500 focus:ring-teal-500"
                />
                <Label htmlFor="remember" className="text-slate-600 text-sm cursor-pointer">
                  로그인 정보 기억하기
                </Label>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/25 transition-all hover:shadow-teal-500/40 text-base font-medium"
              >
                {isLoading ? "로그인 중..." : "로그인"}
              </Button>
            </form>

            {/* Footer links */}
            <div className="mt-6 flex items-center justify-between text-sm">
              <a href="#" className="text-teal-600 hover:text-teal-700 transition-colors font-medium">
                첫 로그인이신가요?
              </a>
              <a href="#" className="text-slate-500 hover:text-slate-700 transition-colors">
                비밀번호를 잊으셨나요?
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
