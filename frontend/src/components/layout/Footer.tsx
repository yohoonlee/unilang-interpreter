import { Link } from 'react-router-dom'
import { Globe } from 'lucide-react'

const footerLinks = {
  product: [
    { name: '기능', href: '/#features' },
    { name: '요금제', href: '/pricing' },
    { name: 'API', href: '/settings' },
  ],
  company: [
    { name: '소개', href: '/about' },
    { name: '블로그', href: '/blog' },
    { name: '채용', href: '/careers' },
  ],
  support: [
    { name: '고객센터', href: '/support' },
    { name: '개인정보처리방침', href: '/privacy' },
    { name: '이용약관', href: '/terms' },
  ],
}

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <span className="font-display font-bold text-xl">
                UniLang
              </span>
            </Link>
            <p className="text-slate-400 text-sm">
              언어의 장벽을 넘어 세계와 소통하세요
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-white mb-4">제품</h4>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <Link 
                    to={link.href} 
                    className="text-slate-400 hover:text-white text-sm transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-white mb-4">회사</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link 
                    to={link.href} 
                    className="text-slate-400 hover:text-white text-sm transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-white mb-4">지원</h4>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link 
                    to={link.href} 
                    className="text-slate-400 hover:text-white text-sm transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-slate-800 mt-12 pt-8 text-center">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} UniLang. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

