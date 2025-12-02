"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Users,
  Save,
  X,
  Check,
  Edit3,
  Mail,
  User,
} from "lucide-react"

// 화자 색상 팔레트
const SPEAKER_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#F97316", // Orange
]

interface SpeakerMapping {
  speakerId: string
  participantName: string
  participantEmail?: string
  participantId?: string
  color: string
}

interface SpeakerMatcherProps {
  sessionId: string
  speakers: string[] // A, B, C 등 화자 ID 목록
  initialMappings?: SpeakerMapping[]
  participants?: { id: string; name: string; email: string }[]
  onSave?: (mappings: SpeakerMapping[]) => void
  onCancel?: () => void
  className?: string
}

export function SpeakerMatcher({
  sessionId,
  speakers,
  initialMappings = [],
  participants = [],
  onSave,
  onCancel,
  className = "",
}: SpeakerMatcherProps) {
  const [mappings, setMappings] = useState<SpeakerMapping[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 초기 매핑 설정
  useEffect(() => {
    if (initialMappings.length > 0) {
      setMappings(initialMappings)
    } else {
      // 기본 매핑 생성
      const defaultMappings = speakers.map((speaker, index) => ({
        speakerId: speaker,
        participantName: `화자 ${speaker}`,
        participantEmail: "",
        color: SPEAKER_COLORS[index % SPEAKER_COLORS.length],
      }))
      setMappings(defaultMappings)
    }
  }, [speakers, initialMappings])

  // 매핑 업데이트
  const updateMapping = (speakerId: string, field: keyof SpeakerMapping, value: string) => {
    setMappings(prev => 
      prev.map(m => 
        m.speakerId === speakerId ? { ...m, [field]: value } : m
      )
    )
  }

  // 참석자 선택
  const selectParticipant = (speakerId: string, participant: { id: string; name: string; email: string }) => {
    setMappings(prev =>
      prev.map(m =>
        m.speakerId === speakerId
          ? {
              ...m,
              participantId: participant.id,
              participantName: participant.name,
              participantEmail: participant.email,
            }
          : m
      )
    )
  }

  // 저장
  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)

      // API 호출
      const response = await fetch("/api/assemblyai/speakers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          mappings: mappings.map(m => ({
            speakerId: m.speakerId,
            participantName: m.participantName,
            participantEmail: m.participantEmail,
            participantId: m.participantId,
          })),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save mappings")
      }

      onSave?.(mappings)

    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className={`border-teal-200 dark:border-teal-800 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-teal-500" />
          화자 매칭
          <span className="text-xs font-normal text-slate-500 ml-2">
            음성에서 구분된 화자를 실제 참석자와 매칭하세요
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 화자 목록 */}
        <div className="space-y-3">
          {mappings.map((mapping, index) => (
            <div
              key={mapping.speakerId}
              className="p-4 rounded-lg border border-slate-200 dark:border-slate-700"
              style={{ borderLeftColor: mapping.color, borderLeftWidth: 4 }}
            >
              <div className="flex items-start gap-4">
                {/* 화자 ID */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: mapping.color }}
                >
                  {mapping.speakerId}
                </div>

                {/* 입력 필드 */}
                <div className="flex-1 space-y-3">
                  {/* 이름 */}
                  <div>
                    <label className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                      <User className="h-3 w-3" />
                      이름
                    </label>
                    <input
                      type="text"
                      value={mapping.participantName}
                      onChange={(e) => updateMapping(mapping.speakerId, "participantName", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                      placeholder="화자 이름 입력..."
                    />
                  </div>

                  {/* 이메일 */}
                  <div>
                    <label className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                      <Mail className="h-3 w-3" />
                      이메일 (선택)
                    </label>
                    <input
                      type="email"
                      value={mapping.participantEmail || ""}
                      onChange={(e) => updateMapping(mapping.speakerId, "participantEmail", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                      placeholder="이메일 입력..."
                    />
                  </div>

                  {/* 참석자 선택 (참석자 목록이 있는 경우) */}
                  {participants.length > 0 && (
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">
                        또는 참석자에서 선택
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {participants.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => selectParticipant(mapping.speakerId, p)}
                            className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                              mapping.participantId === p.id
                                ? "bg-teal-500 text-white border-teal-500"
                                : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-teal-400"
                            }`}
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 색상 선택 */}
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">색상</label>
                  <div className="flex flex-wrap gap-1 w-20">
                    {SPEAKER_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => updateMapping(mapping.speakerId, "color", color)}
                        className={`w-6 h-6 rounded-full transition-transform ${
                          mapping.color === color ? "ring-2 ring-offset-2 ring-slate-400 scale-110" : ""
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* 버튼 */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
          >
            {isSaving ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                저장 중...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                저장
              </>
            )}
          </Button>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              취소
            </Button>
          )}
        </div>

        {/* 안내 */}
        <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
          💡 <strong>Tip:</strong> 화자를 매칭하면 통역 기록에 실제 이름이 표시됩니다.
          이메일을 입력하면 회의 참석자와 자동 연결됩니다.
        </div>
      </CardContent>
    </Card>
  )
}





