import { Link } from 'react-router-dom'
import { Globe } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl">UniLang</span>
            </Link>
            <p className="text-gray-400 text-sm">
              언어의 장벽을 넘어 세계와 소통하세요
            </p>
          </div>

          {/* 제품 */}
          <div>
            <h4 className="font-semibold text-white mb-4">제품</h4>
            <ul className="space-y-2">
              <li><Link to="/#features" className="text-gray-400 hover:text-white text-sm transition-colors">기능</Link></li>
              <li><Link to="/pricing" className="text-gray-400 hover:text-white text-sm transition-colors">요금제</Link></li>
              <li><Link to="/settings" className="text-gray-400 hover:text-white text-sm transition-colors">API</Link></li>
            </ul>
          </div>

          {/* 회사 */}
          <div>
            <h4 className="font-semibold text-white mb-4">회사</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">소개</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">블로그</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">채용</a></li>
            </ul>
          </div>

          {/* 지원 */}
          <div>
            <h4 className="font-semibold text-white mb-4">지원</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">고객센터</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">개인정보처리방침</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">이용약관</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-800 mt-12 pt-8 text-center">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} UniLang. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
