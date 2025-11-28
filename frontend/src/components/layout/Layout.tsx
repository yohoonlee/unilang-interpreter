import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { 
  Home, 
  Video, 
  Settings, 
  Globe,
  Menu,
  X,
  Tv,
  CreditCard,
  LogIn,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import Footer from './Footer'

interface LayoutProps {
  children: ReactNode
}

const navigation = [
  { name: '기능', href: '/#features' },
  { name: '사용방법', href: '/#how-it-works' },
  { name: '데모', href: '/#demo-section' },
  { name: '요금제', href: '/pricing' },
]

const mobileNavigation = [
  { name: '홈', href: '/', icon: Home },
  { name: '번역', href: '/media-source', icon: Tv },
  { name: '회의', href: '/meetings', icon: Video },
  { name: '요금제', href: '/pricing', icon: CreditCard },
  { name: '설정', href: '/settings', icon: Settings },
]

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleNavClick = (href: string) => {
    setMobileMenuOpen(false)
    
    // 해시 링크인 경우
    if (href.includes('#')) {
      const [path, hash] = href.split('#')
      if (location.pathname === path || path === '/') {
        const element = document.getElementById(hash)
        element?.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex flex-col">
      {/* 배경 장식 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-200/20 rounded-full blur-3xl" />
      </div>

      {/* 네비게이션 */}
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="glass-card mx-4 mt-4 px-6 py-3 flex items-center justify-between">
          {/* 로고 */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <span className="font-display font-bold text-xl bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
              UniLang
            </span>
          </Link>

          {/* 데스크톱 네비게이션 */}
          <div className="hidden md:flex items-center gap-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || 
                (item.href !== '/' && location.pathname.startsWith(item.href.split('#')[0]))
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'text-primary-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  )}
                >
                  {item.name}
                </Link>
              )
            })}
          </div>

          {/* 우측 버튼들 */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/media-source">
              <Button size="sm">서비스</Button>
            </Link>
            <Button variant="outline" size="sm" className="gap-2">
              <LogIn className="w-4 h-4" />
              로그인
            </Button>
          </div>

          {/* 모바일 메뉴 버튼 */}
          <button
            type="button"
            className="md:hidden p-2 rounded-lg hover:bg-slate-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* 모바일 네비게이션 */}
        {mobileMenuOpen && (
          <div className="md:hidden glass-card mx-4 mt-2 p-4">
            {mobileNavigation.map((item) => {
              const isActive = location.pathname === item.href
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all',
                    isActive
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              )
            })}
            <div className="mt-4 pt-4 border-t border-slate-200 flex gap-2">
              <Link to="/media-source" className="flex-1">
                <Button className="w-full" size="sm">서비스</Button>
              </Link>
              <Button variant="outline" className="flex-1" size="sm">
                로그인
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* 메인 콘텐츠 */}
      <main className="relative pt-24 pb-8 px-4 flex-1">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* 푸터 */}
      <Footer />
    </div>
  )
}
