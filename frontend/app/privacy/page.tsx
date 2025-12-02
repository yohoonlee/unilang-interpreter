"use client"

import Link from "next/link"
import { Globe, ArrowLeft } from "lucide-react"

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">개인정보처리방침</h1>
        
        <div className="bg-white rounded-xl shadow-sm p-8 space-y-8">
          <p className="text-gray-600">
            UniLang(이하 &quot;회사&quot;)은 이용자의 개인정보를 중요시하며, 「개인정보보호법」을 준수하고 있습니다.
            회사는 개인정보처리방침을 통하여 이용자가 제공하는 개인정보가 어떠한 용도와 방식으로 이용되고 있으며, 
            개인정보보호를 위해 어떠한 조치가 취해지고 있는지 알려드립니다.
          </p>
          <p className="text-sm text-gray-500">최종 수정일: 2025년 12월 1일</p>

          {/* 1. 수집하는 개인정보 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. 수집하는 개인정보 항목</h2>
            <div className="space-y-4 text-gray-700">
              <p>회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다.</p>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">필수 수집 항목</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>이메일 주소</li>
                  <li>이름 (소셜 로그인 시)</li>
                  <li>프로필 사진 (소셜 로그인 시)</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">선택 수집 항목</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>휴대폰 번호 (휴대폰 인증 시)</li>
                  <li>결제 정보 (유료 서비스 이용 시)</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">자동 수집 항목</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>IP 주소</li>
                  <li>쿠키</li>
                  <li>서비스 이용 기록</li>
                  <li>기기 정보 (브라우저 유형, OS 등)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 2. 개인정보 수집 방법 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. 개인정보 수집 방법</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>회원가입 및 서비스 이용 과정에서 이용자가 직접 입력</li>
              <li>소셜 로그인 (Google, Kakao, Naver, LinkedIn) 연동 시 제공받음</li>
              <li>서비스 이용 과정에서 자동 생성되어 수집</li>
            </ul>
          </section>

          {/* 3. 개인정보 이용 목적 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. 개인정보 이용 목적</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li><strong>서비스 제공:</strong> 실시간 통역 서비스 제공, 회의 기록 저장</li>
              <li><strong>회원 관리:</strong> 회원제 서비스 이용에 따른 본인확인, 개인식별</li>
              <li><strong>요금 결제:</strong> 유료 서비스 요금 청구 및 결제</li>
              <li><strong>서비스 개선:</strong> 서비스 이용 통계 분석, 신규 서비스 개발</li>
              <li><strong>고객 지원:</strong> 문의사항 및 불만 처리, 공지사항 전달</li>
            </ul>
          </section>

          {/* 4. 개인정보 보유 기간 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. 개인정보 보유 및 이용 기간</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                회사는 원칙적으로 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다.
                단, 관계 법령의 규정에 의하여 보존할 필요가 있는 경우 아래와 같이 관계 법령에서 정한 일정한 기간 동안 개인정보를 보관합니다.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <ul className="space-y-2 text-sm">
                  <li><strong>계약 또는 청약철회 등에 관한 기록:</strong> 5년 (전자상거래법)</li>
                  <li><strong>대금결제 및 재화 등의 공급에 관한 기록:</strong> 5년 (전자상거래법)</li>
                  <li><strong>소비자의 불만 또는 분쟁처리에 관한 기록:</strong> 3년 (전자상거래법)</li>
                  <li><strong>로그인 기록:</strong> 3개월 (통신비밀보호법)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 5. 개인정보 제3자 제공 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. 개인정보의 제3자 제공</h2>
            <p className="text-gray-700">
              회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 
              다만, 아래의 경우에는 예외로 합니다.
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mt-4">
              <li>이용자가 사전에 동의한 경우</li>
              <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
            </ul>
          </section>

          {/* 6. 개인정보 처리 위탁 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. 개인정보 처리 위탁</h2>
            <p className="text-gray-700 mb-4">
              회사는 서비스 향상을 위해 다음과 같이 개인정보를 위탁하고 있습니다.
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-900">수탁업체</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-900">위탁 업무</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-2 text-gray-700">Google Cloud</td>
                    <td className="px-4 py-2 text-gray-700">음성 인식 및 번역 서비스 제공</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-gray-700">Supabase</td>
                    <td className="px-4 py-2 text-gray-700">데이터 저장 및 인증 서비스</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-gray-700">Vercel</td>
                    <td className="px-4 py-2 text-gray-700">웹 서비스 호스팅</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-gray-700">Twilio</td>
                    <td className="px-4 py-2 text-gray-700">SMS 인증 서비스</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 7. 이용자의 권리 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. 이용자의 권리와 행사 방법</h2>
            <div className="space-y-4 text-gray-700">
              <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
              <ul className="list-disc list-inside space-y-2">
                <li>개인정보 열람 요구</li>
                <li>오류 등이 있을 경우 정정 요구</li>
                <li>삭제 요구</li>
                <li>처리정지 요구</li>
              </ul>
              <p>
                위 권리 행사는 회사에 대해 서면, 전자우편, 고객센터 등을 통하여 하실 수 있으며,
                회사는 이에 대해 지체 없이 조치하겠습니다.
              </p>
            </div>
          </section>

          {/* 8. 개인정보 보호책임자 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. 개인정보 보호책임자</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700">
                회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 
                개인정보 처리와 관련한 이용자의 불만처리 및 피해구제 등을 위하여 
                아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
              </p>
              <div className="mt-4 space-y-1 text-sm text-gray-600">
                <p><strong>개인정보 보호책임자:</strong> UniLang 운영팀</p>
                <p><strong>이메일:</strong> privacy@unilang.io</p>
              </div>
            </div>
          </section>

          {/* 9. 개인정보 처리방침 변경 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">9. 개인정보처리방침 변경</h2>
            <p className="text-gray-700">
              이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 
              변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
            </p>
          </section>

          {/* 10. 쿠키 정책 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">10. 쿠키(Cookie) 사용</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                회사는 이용자에게 개별적인 맞춤서비스를 제공하기 위해 &apos;쿠키(cookie)&apos;를 사용합니다.
                쿠키는 웹사이트를 운영하는데 이용되는 서버가 이용자의 브라우저에게 보내는 아주 작은 텍스트 파일로 
                이용자의 컴퓨터에 저장됩니다.
              </p>
              <p>
                이용자는 쿠키 설치에 대한 선택권을 가지고 있습니다. 
                웹브라우저에서 옵션을 설정함으로써 모든 쿠키를 허용하거나, 쿠키가 저장될 때마다 확인을 거치거나, 
                모든 쿠키의 저장을 거부할 수 있습니다.
              </p>
            </div>
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





