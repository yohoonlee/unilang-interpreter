import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { 
  Globe, 
  Video, 
  Mic, 
  FileText, 
  Zap,
  Shield,
  Users,
  Play,
  CheckCircle,
  Clock,
  Pause,
} from 'lucide-react'

// 데모 메시지
const demoMessages = [
  { 
    flag: '🇺🇸', 
    lang: '영어', 
    original: 'Good morning everyone, thank you for joining today\'s meeting.',
    translation: '안녕하세요 여러분, 오늘 회의에 참석해 주셔서 감사합니다.'
  },
  { 
    flag: '🇯🇵', 
    lang: '일본어', 
    original: '本日の議題について説明させていただきます。',
    translation: '오늘의 안건에 대해 설명드리겠습니다.'
  },
  { 
    flag: '🇨🇳', 
    lang: '중국어', 
    original: '我们需要讨论一下下个季度的计划。',
    translation: '다음 분기 계획에 대해 논의해야 합니다.'
  },
]

export default function HomePage() {
  const [currentDemoIndex, setCurrentDemoIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setCurrentDemoIndex((prev) => (prev + 1) % demoMessages.length)
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [isPlaying])

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm font-medium mb-6">
                <Zap className="w-4 h-4" />
                AI 기반 실시간 통역 플랫폼
              </div>

              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                AI 실시간 통역으로
                <br />
                <span className="text-blue-600">
                  글로벌 소통을 혁신하세요
                </span>
              </h1>

              <p className="text-lg text-gray-600 mb-8">
                화상회의, YouTube, 영상통화에서 실시간 다국어 통역을 경험하세요.
                <br />
                최소 비용으로 최대 효과를 경험하세요
              </p>

              {/* Feature Tags */}
              <div className="flex flex-wrap gap-3 mb-8">
                <span className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  실시간 고정확도 통역
                </span>
                <span className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  즉각적인 자막 생성
                </span>
                <span className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  14개국 언어 지원
                </span>
                <span className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  기업별 맞춤 솔루션
                </span>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4">
                <Link to="/media-source">
                  <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                    무료로 시작하기
                  </button>
                </Link>
                <button 
                  onClick={() => document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  데모 보기
                </button>
              </div>
            </motion.div>

            {/* Right Content - Demo Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="bg-gray-900 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <span className="text-white text-sm">실시간 통역</span>
                  <span className="text-gray-400 text-xs">AI 통역 데모</span>
                </div>
                
                {/* Content */}
                <div className="p-6 space-y-4 bg-gray-50">
                  {/* English Message */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-3 bg-white p-4 rounded-xl border border-gray-200">
                      <span className="text-2xl">🇺🇸</span>
                      <div>
                        <span className="text-xs text-gray-500 block">영어</span>
                        <p className="text-gray-800">Hello, let's start the meeting about Q4 results.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 ml-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded font-medium">AI</span>
                      <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex-1">
                        <span className="text-xs text-blue-600 block">🇰🇷 한국어</span>
                        <p className="text-gray-800">안녕하세요, 4분기 실적에 대한 회의를 시작하겠습니다.</p>
                      </div>
                      <span className="text-xs text-gray-400 self-center">99.9% 정확도</span>
                    </div>
                  </div>

                  {/* Second Message */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-3 bg-white p-4 rounded-xl border border-gray-200">
                      <span className="text-2xl">🇺🇸</span>
                      <div>
                        <span className="text-xs text-gray-500 block">영어</span>
                        <p className="text-gray-800">Can you share the revenue growth data?</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 ml-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded font-medium">AI</span>
                      <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex-1">
                        <span className="text-xs text-blue-600 block">🇰🇷 한국어</span>
                        <p className="text-gray-800">매출 성장 데이터를 공유해 주시겠어요?</p>
                      </div>
                      <span className="text-xs text-gray-400 self-center">AI 기반 통역</span>
                    </div>
                  </div>
                </div>

                {/* Stats Bar */}
                <div className="bg-blue-600 px-6 py-4 grid grid-cols-3 gap-4 text-white text-center">
                  <div>
                    <div className="text-2xl font-bold">99.9%</div>
                    <div className="text-xs text-blue-100">정확도</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">24/7</div>
                    <div className="text-xs text-blue-100">실시간 지원</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">80%</div>
                    <div className="text-xs text-blue-100">비용 절감</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Supported Platforms */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">지원 플랫폼</h2>
            <p className="text-gray-600">다양한 화상회의 플랫폼과 미디어 소스를 지원합니다</p>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {[
              { name: 'Zoom', icon: '🎥' },
              { name: 'MS Teams', icon: '💬' },
              { name: 'Google Meet', icon: '📹' },
              { name: 'Webex', icon: '🖥️' },
            ].map((platform) => (
              <div
                key={platform.name}
                className="flex items-center gap-3 px-6 py-4 bg-white rounded-xl border border-gray-200 shadow-sm"
              >
                <span className="text-2xl">{platform.icon}</span>
                <span className="font-medium text-gray-700">{platform.name}</span>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { name: 'YouTube', icon: '📺', desc: '영상 자막 번역', color: 'bg-red-50 border-red-100' },
              { name: '영상 파일', icon: '🎬', desc: '로컬 파일 업로드', color: 'bg-purple-50 border-purple-100' },
              { name: '화면 캡처', icon: '🖥️', desc: '시스템 오디오 포함', color: 'bg-cyan-50 border-cyan-100' },
              { name: '영상통화', icon: '📱', desc: 'Discord, 카카오톡 등', color: 'bg-amber-50 border-amber-100' },
            ].map((source) => (
              <Link to="/media-source" key={source.name}>
                <div className={`flex flex-col items-center gap-2 px-5 py-6 rounded-xl border ${source.color} hover:shadow-md transition-shadow cursor-pointer`}>
                  <span className="text-3xl">{source.icon}</span>
                  <span className="font-semibold text-gray-800">{source.name}</span>
                  <span className="text-xs text-gray-500">{source.desc}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">주요 기능</h2>
            <p className="text-gray-600">화상회의의 언어 장벽을 완전히 해소합니다</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Mic, title: '실시간 음성 인식', desc: 'Google Speech-to-Text 기반의 정확한 음성 인식으로 모든 발언을 텍스트로 변환합니다.', color: 'bg-blue-500' },
              { icon: Globe, title: '다국어 실시간 번역', desc: '14개 이상의 언어를 지원하며, 화자별로 자국어 자막을 실시간으로 제공합니다.', color: 'bg-purple-500' },
              { icon: FileText, title: '회의 기록 & 요약', desc: '모든 회의 내용이 자동 저장되고, AI가 핵심 내용을 요약해 드립니다.', color: 'bg-orange-500' },
              { icon: Shield, title: '보안 연결', desc: '종단간 암호화를 통해 회의 내용을 안전하게 보호합니다.', color: 'bg-green-500' },
              { icon: Zap, title: '즉시 시작', desc: '복잡한 설정 없이 브라우저에서 바로 실시간 통역을 시작할 수 있습니다.', color: 'bg-pink-500' },
              { icon: Users, title: '다중 참가자 지원', desc: '여러 참가자가 동시에 각자의 언어로 자막을 볼 수 있습니다.', color: 'bg-indigo-500' },
            ].map((feature) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow"
              >
                <div className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">사용 방법</h2>
            <p className="text-gray-600">3단계로 간단하게 시작하세요</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: Video, title: '플랫폼 연동', desc: '사용하는 화상회의 플랫폼을 연동하세요' },
              { step: '02', icon: Globe, title: '언어 선택', desc: '원하는 자막 언어를 선택하세요' },
              { step: '03', icon: Zap, title: '실시간 통역', desc: '회의 중 실시간으로 번역된 자막을 확인하세요' },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="relative inline-block mb-6">
                  <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center">
                    <item.icon className="w-10 h-10 text-blue-600" />
                  </div>
                  <span className="absolute -top-2 -left-2 w-8 h-8 bg-blue-600 text-white text-sm font-bold rounded-lg flex items-center justify-center">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Demo Section */}
      <section id="demo-section" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="inline-block px-4 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium mb-4">
              실시간 데모
            </span>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">실시간 통역 체험</h2>
            <p className="text-gray-600">다국어 회의가 어떻게 실시간으로 번역되는지 확인해보세요</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="bg-gray-900 px-6 py-4 flex items-center justify-between">
                <span className="text-white font-semibold">UniLang 실시간 통역</span>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                  <span className="text-gray-400 text-sm">{isPlaying ? '통역 중' : '대기 중'}</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 bg-gradient-to-b from-gray-50 to-white min-h-[350px] space-y-4">
                {demoMessages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0.3 }}
                    animate={{ 
                      opacity: !isPlaying ? 1 : idx === currentDemoIndex ? 1 : 0.4,
                      scale: isPlaying && idx === currentDemoIndex ? 1.02 : 1
                    }}
                    transition={{ duration: 0.3 }}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      isPlaying && idx === currentDemoIndex 
                        ? 'border-blue-300 bg-blue-50' 
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{msg.flag}</span>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-500">{msg.lang}</span>
                        <p className="text-gray-800 font-medium mt-1">{msg.original}</p>
                        <div className="mt-3 flex items-start gap-2">
                          <span className="text-lg">🇰🇷</span>
                          <span className="text-sm text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg">
                            {msg.translation}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-100 flex justify-center">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                    isPlaying 
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4" />
                      통역 중지
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      통역 시작
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">요금제</h2>
            <p className="text-gray-600">비즈니스 규모에 맞는 플랜을 선택하세요</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Free */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl border border-gray-200 p-6"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-1">무료</h3>
              <p className="text-gray-500 text-sm mb-4">개인 사용자를 위한 기본 플랜</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">₩0</span>
                <span className="text-gray-500">/월</span>
              </div>
              <ul className="space-y-3 mb-6">
                {['월 60분 실시간 통역', '2개 언어 지원', '기본 음성 인식', '회의 기록 저장 (7일)'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/media-source" className="block">
                <button className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                  무료로 시작
                </button>
              </Link>
            </motion.div>

            {/* Pro */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border-2 border-blue-500 p-6 relative shadow-lg"
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                  인기
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">프로</h3>
              <p className="text-gray-500 text-sm mb-4">전문가와 팀을 위한 고급 기능</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-blue-600">₩29,000</span>
                <span className="text-gray-500">/월</span>
              </div>
              <ul className="space-y-3 mb-6">
                {['무제한 실시간 통역', '14개 언어 지원', '고급 AI 음성 인식', '회의 기록 저장 (무제한)', 'AI 회의 요약', '우선 지원'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/pricing" className="block">
                <button className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                  프로 시작하기
                </button>
              </Link>
            </motion.div>

            {/* Enterprise */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-gray-100 rounded-2xl border border-gray-200 p-6"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-1">엔터프라이즈</h3>
              <p className="text-gray-500 text-sm mb-4">대기업을 위한 맞춤 솔루션</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">문의</span>
              </div>
              <ul className="space-y-3 mb-6">
                {['프로 플랜의 모든 기능', '맞춤형 언어 모델', '온프레미스 배포 옵션', '전담 계정 관리자', 'SLA 보장', 'API 액세스'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <button className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-white transition-colors">
                문의하기
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-blue-600 rounded-2xl p-12 text-center text-white"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">지금 바로 시작하세요</h2>
            <p className="text-lg text-blue-100 mb-8 max-w-xl mx-auto">
              언어의 장벽 없이 전 세계와 자유롭게 소통하세요.
              UniLang이 실시간 통역을 도와드립니다.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/media-source">
                <button className="px-8 py-3 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors">
                  무료로 시작하기
                </button>
              </Link>
              <Link to="/pricing">
                <button className="px-8 py-3 border border-white/30 text-white rounded-lg font-medium hover:bg-white/10 transition-colors">
                  요금제 보기
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
