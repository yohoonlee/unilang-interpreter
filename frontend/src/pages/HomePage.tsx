import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { 
  Globe, 
  Video, 
  Mic, 
  FileText, 
  Sparkles,
  ArrowRight,
  Languages,
  Zap,
  Shield,
  Users,
  Play,
  CheckCircle,
  Clock,
  BarChart3,
} from 'lucide-react'

// 지원 플랫폼
const platforms = [
  { name: 'Zoom', logo: '🎥', color: 'bg-blue-100 text-blue-600 border-blue-200' },
  { name: 'MS Teams', logo: '💬', color: 'bg-indigo-100 text-indigo-600 border-indigo-200' },
  { name: 'Google Meet', logo: '📹', color: 'bg-green-100 text-green-600 border-green-200' },
  { name: 'Webex', logo: '🖥️', color: 'bg-red-100 text-red-600 border-red-200' },
]

// 확장 미디어 소스
const mediaSources = [
  { name: 'YouTube', logo: '📺', color: 'bg-red-100 text-red-600', desc: '영상 자막 번역' },
  { name: '영상 파일', logo: '🎬', color: 'bg-purple-100 text-purple-600', desc: '로컬 파일 업로드' },
  { name: '화면 캡처', logo: '🖥️', color: 'bg-cyan-100 text-cyan-600', desc: '시스템 오디오 포함' },
  { name: '영상통화', logo: '📱', color: 'bg-amber-100 text-amber-600', desc: 'Discord, 카카오톡 등' },
]

// 주요 기능
const features = [
  {
    icon: Mic,
    title: '실시간 음성 인식',
    description: 'Google Speech-to-Text 기반의 정확한 음성 인식으로 모든 발언을 텍스트로 변환합니다.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Languages,
    title: '다국어 실시간 번역',
    description: '14개 이상의 언어를 지원하며, 화자별로 자국어 자막을 실시간으로 제공합니다.',
    color: 'from-violet-500 to-purple-500',
  },
  {
    icon: FileText,
    title: '회의 기록 & 요약',
    description: '모든 회의 내용이 자동 저장되고, AI가 핵심 내용을 요약해 드립니다.',
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: Shield,
    title: '보안 연결',
    description: '종단간 암호화를 통해 회의 내용을 안전하게 보호합니다.',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Zap,
    title: '즉시 시작',
    description: '복잡한 설정 없이 브라우저에서 바로 실시간 통역을 시작할 수 있습니다.',
    color: 'from-pink-500 to-rose-500',
  },
  {
    icon: Users,
    title: '다중 참가자 지원',
    description: '여러 참가자가 동시에 각자의 언어로 자막을 볼 수 있습니다.',
    color: 'from-indigo-500 to-blue-500',
  },
]

// 통계
const stats = [
  { icon: CheckCircle, label: '실시간 고정확도 통역', value: '99.9%', desc: '정확도' },
  { icon: Zap, label: '즉각적인 자막 생성', value: '24/7', desc: '실시간 지원' },
  { icon: Globe, label: '14개국 언어 지원', value: '80%', desc: '비용 절감' },
]

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

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

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
    <div className="space-y-24 pb-20">
      {/* Hero Section */}
      <section className="relative pt-8 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-100 to-accent-100 text-primary-700 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              AI 기반 실시간 통역 플랫폼
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-slate-900 mb-6 leading-tight">
              AI 실시간 통역으로
              <br />
              <span className="bg-gradient-to-r from-primary-600 via-accent-500 to-primary-600 bg-clip-text text-transparent">
                글로벌 소통을 혁신하세요
              </span>
            </h1>

            {/* Description */}
            <p className="text-lg text-slate-600 mb-8 max-w-xl">
              화상회의, YouTube, 영상통화에서 실시간 다국어 통역을 경험하세요.
              최소 비용으로 최대 효과를 경험하세요
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-3 mb-8">
              {['실시간 고정확도 통역', '즉각적인 자막 생성', '14개국 언어 지원', '기업별 맞춤 솔루션'].map((text) => (
                <span key={text} className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  {text}
                </span>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/media-source">
                <Button size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>
                  무료로 시작하기
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => {
                  document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                <Play className="w-4 h-4 mr-2" />
                데모 보기
              </Button>
            </div>
          </motion.div>

          {/* Right Content - Demo Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="overflow-hidden shadow-2xl">
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-white/80 text-sm font-medium">실시간 통역</span>
                <span className="text-xs text-white/60">AI 통역 데모</span>
              </div>
              <CardContent className="p-6 bg-slate-50 space-y-4">
                {demoMessages.slice(0, 2).map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.3 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-2xl">{msg.flag}</span>
                      <div className="flex-1">
                        <span className="text-xs text-slate-500">{msg.lang}</span>
                        <p className="text-slate-800">{msg.original}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 ml-4">
                      <span className="px-2 py-0.5 bg-primary-100 text-primary-600 text-xs rounded font-medium">AI</span>
                      <div className="p-3 bg-primary-50 rounded-xl border border-primary-100 flex-1">
                        <span className="text-xs text-primary-600">🇰🇷 한국어</span>
                        <p className="text-slate-800">{msg.translation}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
              {/* Stats Bar */}
              <div className="bg-gradient-to-r from-primary-600 to-accent-600 p-4 grid grid-cols-3 gap-4 text-white text-center">
                <div>
                  <div className="text-2xl font-bold">99.9%</div>
                  <div className="text-xs text-white/80">정확도</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">24/7</div>
                  <div className="text-xs text-white/80">실시간 지원</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">80%</div>
                  <div className="text-xs text-white/80">비용 절감</div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Supported Platforms */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-4">
            지원 플랫폼
          </h2>
          <p className="text-lg text-slate-600">
            다양한 화상회의 플랫폼과 미디어 소스를 지원합니다
          </p>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {platforms.map((platform) => (
            <motion.div
              key={platform.name}
              whileHover={{ scale: 1.05 }}
              className={`flex items-center gap-3 px-6 py-4 rounded-2xl border-2 ${platform.color} font-medium shadow-sm`}
            >
              <span className="text-2xl">{platform.logo}</span>
              <span>{platform.name}</span>
            </motion.div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {mediaSources.map((source) => (
            <Link to="/media-source" key={source.name}>
              <motion.div
                whileHover={{ scale: 1.03, y: -2 }}
                className={`flex flex-col items-center gap-2 px-5 py-5 rounded-2xl ${source.color} border border-transparent hover:border-current/20 cursor-pointer transition-all shadow-sm`}
              >
                <span className="text-3xl">{source.logo}</span>
                <span className="font-semibold">{source.name}</span>
                <span className="text-xs opacity-75">{source.desc}</span>
              </motion.div>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-4">
            주요 기능
          </h2>
          <p className="text-lg text-slate-600">
            화상회의의 언어 장벽을 완전히 해소합니다
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <motion.div key={feature.title} variants={item}>
              <Card className="h-full hover:shadow-xl transition-all duration-300 group">
                <CardContent className="p-6">
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}
                  >
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* How It Works */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-4">
            사용 방법
          </h2>
          <p className="text-lg text-slate-600">
            3단계로 간단하게 시작하세요
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-8"
        >
          {[
            {
              step: '01',
              icon: Video,
              title: '플랫폼 연동',
              description: '사용하는 화상회의 플랫폼을 연동하세요',
            },
            {
              step: '02',
              icon: Globe,
              title: '언어 선택',
              description: '원하는 자막 언어를 선택하세요',
            },
            {
              step: '03',
              icon: Zap,
              title: '실시간 통역',
              description: '회의 중 실시간으로 번역된 자막을 확인하세요',
            },
          ].map((stepItem, index) => (
            <motion.div
              key={stepItem.step}
              variants={item}
              className="relative text-center"
            >
              {/* Connector Line */}
              {index < 2 && (
                <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary-200 to-transparent" />
              )}
              <div className="relative inline-block mb-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center shadow-lg">
                  <stepItem.icon className="w-10 h-10 text-primary-600" />
                </div>
                <span className="absolute -top-3 -left-3 w-10 h-10 bg-gradient-to-br from-primary-600 to-accent-600 text-white text-sm font-bold rounded-xl flex items-center justify-center shadow-lg">
                  {stepItem.step}
                </span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                {stepItem.title}
              </h3>
              <p className="text-slate-600">{stepItem.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Live Demo Section */}
      <section id="demo-section">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-4">
            실시간 데모
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-4">
            실시간 통역 체험
          </h2>
          <p className="text-lg text-slate-600">
            다국어 회의가 어떻게 실시간으로 번역되는지 확인해보세요
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <Card className="overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 flex items-center justify-between">
              <span className="text-white font-semibold">UniLang 실시간 통역</span>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                <span className="text-white/70 text-sm">{isPlaying ? '통역 중' : '대기 중'}</span>
              </div>
            </div>
            <CardContent className="p-6 bg-gradient-to-b from-slate-50 to-white min-h-[300px] space-y-4">
              {demoMessages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ 
                    opacity: isPlaying || idx <= currentDemoIndex ? 1 : 0.3, 
                    x: 0,
                    scale: isPlaying && idx === currentDemoIndex ? 1.02 : 1
                  }}
                  transition={{ delay: idx * 0.1 }}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    isPlaying && idx === currentDemoIndex 
                      ? 'border-primary-300 bg-primary-50/50' 
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{msg.flag}</span>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-slate-500">{msg.lang}</span>
                      <p className="text-slate-800 font-medium">{msg.original}</p>
                      <div className="mt-2 flex items-start gap-2">
                        <span className="text-lg">🇰🇷</span>
                        <span className="text-primary-700 bg-primary-50 px-2 py-1 rounded text-sm">
                          {msg.translation}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </CardContent>
            <div className="p-4 bg-slate-100 flex justify-center">
              <Button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="gap-2"
              >
                {isPlaying ? (
                  <>
                    <Clock className="w-4 h-4" />
                    통역 중지
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    통역 시작
                  </>
                )}
              </Button>
            </div>
          </Card>
        </motion.div>
      </section>

      {/* Pricing Section */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-4">
            요금제
          </h2>
          <p className="text-lg text-slate-600">
            비즈니스 규모에 맞는 플랜을 선택하세요
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Free */}
          <Card className="relative">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-2">무료</h3>
              <p className="text-slate-600 text-sm mb-4">개인 사용자를 위한 기본 플랜</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-slate-900">₩0</span>
                <span className="text-slate-500">/월</span>
              </div>
              <ul className="space-y-3 mb-6">
                {['월 60분 실시간 통역', '2개 언어 지원', '기본 음성 인식', '회의 기록 저장 (7일)'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/media-source" className="block">
                <Button variant="outline" className="w-full">무료로 시작</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Pro */}
          <Card className="relative border-2 border-primary-500 shadow-xl">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="px-3 py-1 bg-gradient-to-r from-primary-500 to-accent-500 text-white text-xs font-bold rounded-full">
                인기
              </span>
            </div>
            <CardContent className="p-6 pt-8">
              <h3 className="text-xl font-bold text-slate-900 mb-2">프로</h3>
              <p className="text-slate-600 text-sm mb-4">전문가와 팀을 위한 고급 기능</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-primary-600">₩29,000</span>
                <span className="text-slate-500">/월</span>
              </div>
              <ul className="space-y-3 mb-6">
                {['무제한 실시간 통역', '14개 언어 지원', '고급 AI 음성 인식', '회의 기록 저장 (무제한)', 'AI 회의 요약', '우선 지원'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-primary-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/pricing" className="block">
                <Button className="w-full">프로 시작하기</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Enterprise */}
          <Card className="relative bg-gradient-to-br from-slate-50 to-slate-100">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-2">엔터프라이즈</h3>
              <p className="text-slate-600 text-sm mb-4">대기업을 위한 맞춤 솔루션</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-slate-900">문의</span>
              </div>
              <ul className="space-y-3 mb-6">
                {['프로 플랜의 모든 기능', '맞춤형 언어 모델', '온프레미스 배포 옵션', '전담 계정 관리자', 'SLA 보장', 'API 액세스'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-slate-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full">문의하기</Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Card className="bg-gradient-to-r from-primary-600 via-accent-600 to-primary-600 text-white overflow-hidden">
            <CardContent className="p-10 md:p-16 text-center relative">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full translate-x-1/2 translate-y-1/2" />
              </div>
              
              <div className="relative">
                <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
                  지금 바로 시작하세요
                </h2>
                <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
                  언어의 장벽 없이 전 세계와 자유롭게 소통하세요.
                  UniLang이 실시간 통역을 도와드립니다.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/media-source">
                    <Button
                      variant="secondary"
                      size="lg"
                      className="bg-white text-primary-600 hover:bg-white/90"
                      rightIcon={<ArrowRight className="w-5 h-5" />}
                    >
                      무료로 시작하기
                    </Button>
                  </Link>
                  <Link to="/pricing">
                    <Button
                      variant="outline"
                      size="lg"
                      className="border-white/30 text-white hover:bg-white/10"
                    >
                      요금제 보기
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>
    </div>
  )
}
