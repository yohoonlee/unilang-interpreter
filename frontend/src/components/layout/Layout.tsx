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
} from 'lucide-react'
import { useState } from 'react'
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
    
    if (href.includes('#')) {
      const [path, hash] = href.split('#')
      if (location.pathname === path || path === '/') {
        const element = document.getElementById(hash)
        element?.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 네비게이션 */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* 로고 */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900">
                UniLang
              </span>
            </Link>

            {/* 데스크톱 네비게이션 */}
            <div className="hidden md:flex items-center gap-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* 우측 버튼들 */}
            <div className="hidden md:flex items-center gap-3">
              <Link to="/media-source">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                  서비스
                </button>
              </Link>
              <button className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
                로그인
              </button>
              <button className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
                관리자
              </button>
            </div>

            {/* 모바일 메뉴 버튼 */}
            <button
              type="button"
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-600" />
              ) : (
                <Menu className="w-6 h-6 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* 모바일 네비게이션 */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-4 space-y-1">
              {mobileNavigation.map((item) => {
                const isActive = location.pathname === item.href
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors',
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                )
              })}
              <div className="pt-4 mt-4 border-t border-gray-200 flex gap-2">
                <Link to="/media-source" className="flex-1">
                  <button className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium">
                    서비스
                  </button>
                </Link>
                <button className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium">
                  로그인
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* 메인 콘텐츠 */}
      <main className="flex-1">
        {children}
      </main>

      {/* 푸터 */}
      <Footer />
    </div>
  )
}
