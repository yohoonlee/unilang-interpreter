"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Globe, Menu, X, Sparkles, User, Settings, LogOut } from "lucide-react"
import { AuthModal } from "./auth/auth-modal"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"

const navItems = [
  { href: "#features", label: "주요기능" },
  { href: "#how-it-works", label: "사용방법" },
  { href: "#demo", label: "데모" },
  { href: "#pricing", label: "요금제" },
]

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // 세션 확인
  useEffect(() => {
    // Supabase가 설정되지 않았으면 스킵
    if (!isSupabaseConfigured()) return

    const supabase = createClient()

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setIsLoggedIn(true)
          setUserEmail(session.user.email || null)
        }
      } catch (error) {
        console.log('[Header] Session check error:', error)
      }
    }
    
    checkSession()

    // 인증 상태 변화 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setIsLoggedIn(true)
        setUserEmail(session.user.email || null)
      } else {
        setIsLoggedIn(false)
        setUserEmail(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleLogout = async () => {
    if (isSupabaseConfigured()) {
      const supabase = createClient()
      await supabase.auth.signOut()
    }
    setIsLoggedIn(false)
    setUserEmail(null)
  }

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          scrolled ? "glass-effect border-b border-white/10 shadow-lg shadow-blue-500/5" : "bg-transparent"
        }`}
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/30 transition-transform group-hover:scale-105">
              <Globe className="h-5 w-5 text-white" />
              <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-yellow-400" />
            </div>
            <span className="text-xl font-bold gradient-text">UniLang</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground relative group"
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 transition-all group-hover:w-full" />
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <span className="text-sm text-muted-foreground">{userEmail}</span>
                <Button
                  size="sm"
                  onClick={() => window.open("/service", "UniLang_Service", "width=1400,height=900,menubar=no,toolbar=no,location=no,status=no")}
                  className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white border-0 gap-2 shadow-md shadow-teal-500/25"
                >
                  <User className="h-4 w-4" />
                  서비스
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleLogout}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  로그아웃
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => setShowAuthModal(true)}
                className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white border-0 gap-2 shadow-md shadow-teal-500/25"
              >
                <User className="h-4 w-4" />
                서비스로그인
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => window.open("/admin", "UniLang_Admin", "width=1400,height=900,menubar=no,toolbar=no,location=no,status=no")}
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white border-0 gap-2 shadow-md shadow-teal-500/25"
            >
              <Settings className="h-4 w-4" />
              관리자
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-blue-500/10 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden glass-effect border-t border-white/10">
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                {isLoggedIn ? (
                  <>
                    <p className="text-sm text-muted-foreground text-center">{userEmail}</p>
                    <Button
                      size="sm"
                      onClick={() => {
                        setMobileMenuOpen(false)
                        window.open("/service", "UniLang_Service", "width=1400,height=900,menubar=no,toolbar=no,location=no,status=no")
                      }}
                      className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white border-0 gap-2"
                    >
                      <User className="h-4 w-4" />
                      서비스
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setMobileMenuOpen(false)
                        handleLogout()
                      }}
                      className="gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      로그아웃
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      setShowAuthModal(true)
                    }}
                    className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white border-0 gap-2"
                  >
                    <User className="h-4 w-4" />
                    서비스로그인
                  </Button>
                )}
                <Button 
                  size="sm" 
                  onClick={() => {
                    setMobileMenuOpen(false)
                    window.open("/admin", "UniLang_Admin", "width=1400,height=900,menubar=no,toolbar=no,location=no,status=no")
                  }}
                  className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white border-0 gap-2"
                >
                  <Settings className="h-4 w-4" />
                  관리자
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        defaultView="login"
      />
    </>
  )
}
