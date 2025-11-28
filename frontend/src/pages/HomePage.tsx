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
} from 'lucide-react'

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
]

const platforms = [
  { name: 'Zoom', logo: '🎥', color: 'bg-blue-100 text-blue-600' },
  { name: 'MS Teams', logo: '💬', color: 'bg-indigo-100 text-indigo-600' },
  { name: 'Google Meet', logo: '📹', color: 'bg-green-100 text-green-600' },
  { name: 'Webex', logo: '🖥️', color: 'bg-red-100 text-red-600' },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function HomePage() {
  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative pt-10 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            AI 기반 실시간 통역
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl font-display font-bold text-slate-900 mb-6 leading-tight">
            언어의 장벽을 넘어
            <br />
            <span className="bg-gradient-to-r from-primary-600 via-accent-500 to-primary-600 bg-clip-text text-transparent">
              세계와 소통하세요
            </span>
          </h1>

          {/* Description */}
          <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
            Zoom, Teams, Meet, Webex 화상회의에서
            <br className="hidden md:block" />
            실시간 다국어 통역 자막을 경험하세요
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/meetings">
              <Button size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>
                회의 시작하기
              </Button>
            </Link>
            <Link to="/settings">
              <Button variant="outline" size="lg">
                플랫폼 연동하기
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Floating Elements */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="absolute top-20 left-10 hidden lg:block"
        >
          <div className="glass-card p-3 rounded-xl">
            <span className="text-2xl">🇰🇷</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="absolute top-32 right-16 hidden lg:block"
        >
          <div className="glass-card p-3 rounded-xl">
            <span className="text-2xl">🇺🇸</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="absolute bottom-10 left-20 hidden lg:block"
        >
          <div className="glass-card p-3 rounded-xl">
            <span className="text-2xl">🇯🇵</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="absolute bottom-20 right-10 hidden lg:block"
        >
          <div className="glass-card p-3 rounded-xl">
            <span className="text-2xl">🇨🇳</span>
          </div>
        </motion.div>
      </section>

      {/* Supported Platforms */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">
            지원 플랫폼
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            {platforms.map((platform) => (
              <div
                key={platform.name}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl ${platform.color}`}
              >
                <span className="text-xl">{platform.logo}</span>
                <span className="font-medium">{platform.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
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
          className="grid md:grid-cols-2 gap-6"
        >
          {features.map((feature) => (
            <motion.div key={feature.title} variants={item}>
              <Card className="h-full hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-6">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}
                  >
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600">{feature.description}</p>
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
          ].map((stepItem) => (
            <motion.div
              key={stepItem.step}
              variants={item}
              className="text-center"
            >
              <div className="relative inline-block mb-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center">
                  <stepItem.icon className="w-10 h-10 text-primary-600" />
                </div>
                <span className="absolute -top-2 -left-2 w-8 h-8 bg-primary-600 text-white text-sm font-bold rounded-lg flex items-center justify-center">
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

      {/* CTA Section */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Card className="bg-gradient-to-r from-primary-600 to-accent-600 text-white overflow-hidden">
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
                <Link to="/meetings">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="bg-white text-primary-600 hover:bg-white/90"
                    rightIcon={<ArrowRight className="w-5 h-5" />}
                  >
                    무료로 시작하기
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>
    </div>
  )
}

