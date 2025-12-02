"use client"

import Link from "next/link"
import { Globe, ArrowLeft } from "lucide-react"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500">
                <Globe className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-gray-900">UniLang</span>
            </div>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">이용약관</h1>
        
        <div className="bg-white rounded-xl shadow-sm p-8 space-y-8">
          <p className="text-gray-600">
            본 약관은 UniLang(이하 &quot;회사&quot;)이 제공하는 실시간 통역 서비스(이하 &quot;서비스&quot;)의 
            이용조건 및 절차, 회사와 회원의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
          </p>
          <p className="text-sm text-gray-500">최종 수정일: 2025년 12월 1일</p>

          {/* 제1조 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">제1조 (목적)</h2>
            <p className="text-gray-700">
              본 약관은 회사가 운영하는 UniLang 서비스의 이용과 관련하여 회사와 이용자 간의 권리, 
              의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          {/* 제2조 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">제2조 (정의)</h2>
            <ul className="list-decimal list-inside space-y-2 text-gray-700">
              <li><strong>&quot;서비스&quot;</strong>란 회사가 제공하는 AI 기반 실시간 통역 서비스를 말합니다.</li>
              <li><strong>&quot;회원&quot;</strong>이란 회사와 서비스 이용계약을 체결하고 회원 아이디를 부여받은 자를 말합니다.</li>
              <li><strong>&quot;아이디(ID)&quot;</strong>란 회원의 식별과 서비스 이용을 위하여 회원이 설정하고 회사가 승인한 이메일 주소를 말합니다.</li>
              <li><strong>&quot;비밀번호&quot;</strong>란 회원이 부여받은 아이디와 일치된 회원임을 확인하고 회원의 개인정보를 보호하기 위해 회원 자신이 설정한 문자와 숫자의 조합을 말합니다.</li>
            </ul>
          </section>

          {/* 제3조 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">제3조 (약관의 효력 및 변경)</h2>
            <ul className="list-decimal list-inside space-y-2 text-gray-700">
              <li>본 약관은 서비스를 이용하고자 하는 모든 회원에게 그 효력이 발생합니다.</li>
              <li>본 약관의 내용은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.</li>
              <li>회사는 필요한 경우 관련 법령을 위배하지 않는 범위 내에서 본 약관을 변경할 수 있으며, 변경된 약관은 제2항과 같은 방법으로 공지함으로써 효력이 발생합니다.</li>
            </ul>
          </section>

          {/* 제4조 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">제4조 (서비스의 제공)</h2>
            <p className="text-gray-700 mb-4">회사는 다음과 같은 서비스를 제공합니다.</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>실시간 음성 인식 및 텍스트 변환 서비스</li>
              <li>다국어 실시간 번역 서비스</li>
              <li>화상회의 통역 지원 서비스</li>
              <li>YouTube 및 영상 콘텐츠 번역 서비스</li>
              <li>회의 기록 저장 및 요약 서비스</li>
              <li>기타 회사가 정하는 서비스</li>
            </ul>
          </section>

          {/* 제5조 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">제5조 (회원가입)</h2>
            <ul className="list-decimal list-inside space-y-2 text-gray-700">
              <li>회원이 되고자 하는 자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 이 약관에 동의한다는 의사표시를 함으로써 회원가입을 신청합니다.</li>
              <li>회사는 제1항과 같이 회원으로 가입할 것을 신청한 자 중 다음 각 호에 해당하지 않는 한 회원으로 등록합니다.
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>등록 내용에 허위, 기재누락, 오기가 있는 경우</li>
                  <li>기타 회원으로 등록하는 것이 회사의 기술상 현저히 지장이 있다고 판단되는 경우</li>
                </ul>
              </li>
            </ul>
          </section>

          {/* 제6조 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">제6조 (회원 탈퇴 및 자격 상실)</h2>
            <ul className="list-decimal list-inside space-y-2 text-gray-700">
              <li>회원은 회사에 언제든지 탈퇴를 요청할 수 있으며, 회사는 즉시 회원 탈퇴를 처리합니다.</li>
              <li>회원이 다음 각 호의 사유에 해당하는 경우, 회사는 회원자격을 제한 및 정지시킬 수 있습니다.
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>가입 신청 시에 허위 내용을 등록한 경우</li>
                  <li>다른 사람의 서비스 이용을 방해하거나 그 정보를 도용하는 등 전자상거래 질서를 위협하는 경우</li>
                  <li>서비스를 이용하여 법령 또는 이 약관이 금지하거나 공서양속에 반하는 행위를 하는 경우</li>
                </ul>
              </li>
            </ul>
          </section>

          {/* 제7조 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">제7조 (요금 및 결제)</h2>
            <ul className="list-decimal list-inside space-y-2 text-gray-700">
              <li>서비스의 이용요금 및 결제방법은 서비스 내 요금제 페이지에 게시된 내용에 따릅니다.</li>
              <li>회사는 이용요금을 변경할 수 있으며, 변경 시 최소 30일 전에 회원에게 통지합니다.</li>
              <li>유료 서비스 이용 시 회원은 정해진 요금을 납부해야 하며, 요금 미납 시 서비스 이용이 제한될 수 있습니다.</li>
            </ul>
          </section>

          {/* 제8조 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">제8조 (회사의 의무)</h2>
            <ul className="list-decimal list-inside space-y-2 text-gray-700">
              <li>회사는 법령과 이 약관이 금지하거나 공서양속에 반하는 행위를 하지 않으며, 이 약관이 정하는 바에 따라 지속적이고 안정적으로 서비스를 제공하기 위해 노력합니다.</li>
              <li>회사는 회원이 안전하게 인터넷 서비스를 이용할 수 있도록 회원의 개인정보 보호를 위한 보안 시스템을 갖추어야 합니다.</li>
              <li>회사는 서비스 이용과 관련하여 회원으로부터 제기된 의견이나 불만이 정당하다고 인정할 경우에는 이를 처리하여야 합니다.</li>
            </ul>
          </section>

          {/* 제9조 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">제9조 (회원의 의무)</h2>
            <p className="text-gray-700 mb-4">회원은 다음 행위를 하여서는 안 됩니다.</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>신청 또는 변경 시 허위 내용의 등록</li>
              <li>타인의 정보 도용</li>
              <li>회사에 게시된 정보의 변경</li>
              <li>회사가 정한 정보 이외의 정보(컴퓨터 프로그램 등) 등의 송신 또는 게시</li>
              <li>회사와 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
              <li>회사 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
              <li>외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 서비스에 공개 또는 게시하는 행위</li>
            </ul>
          </section>

          {/* 제10조 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">제10조 (면책조항)</h2>
            <ul className="list-decimal list-inside space-y-2 text-gray-700">
              <li>회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</li>
              <li>회사는 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여는 책임을 지지 않습니다.</li>
              <li>회사는 AI 기반 번역 서비스의 특성상 번역의 정확성을 100% 보장하지 않으며, 번역 오류로 인한 손해에 대해 책임을 지지 않습니다.</li>
            </ul>
          </section>

          {/* 제11조 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">제11조 (분쟁 해결)</h2>
            <ul className="list-decimal list-inside space-y-2 text-gray-700">
              <li>회사와 회원 간 발생한 분쟁에 관한 소송은 대한민국 법률에 따릅니다.</li>
              <li>회사와 회원 간 발생한 분쟁에 관한 소송은 서울중앙지방법원을 관할법원으로 합니다.</li>
            </ul>
          </section>

          {/* 부칙 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">부칙</h2>
            <p className="text-gray-700">
              본 약관은 2025년 12월 1일부터 시행됩니다.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link 
            href="/" 
            className="text-teal-600 hover:text-teal-700 font-medium"
          >
            ← 홈으로 돌아가기
          </Link>
        </div>
      </main>
    </div>
  )
}

