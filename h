[1mdiff --git a/frontend/app/service/translate/record/page.tsx b/frontend/app/service/translate/record/page.tsx[m
[1mindex 2da89a4..8752eda 100644[m
[1m--- a/frontend/app/service/translate/record/page.tsx[m
[1m+++ b/frontend/app/service/translate/record/page.tsx[m
[36m@@ -483,8 +483,8 @@[m [mfunction RecordTranslatePageContent() {[m
   [m
   // ========== 오디오 재생 기능 ==========[m
   [m
[31m-  // 특정 시점부터 오디오 재생[m
[31m-  const playAudioFromTime = (itemId: string, startTimeMs?: number) => {[m
[32m+[m[32m  // 특정 시점부터 오디오 재생 (endTimeMs가 있으면 해당 구간만 재생)[m
[32m+[m[32m  const playAudioFromTime = (itemId: string, startTimeMs?: number, endTimeMs?: number) => {[m
     if (!sessionAudioUrl) {[m
       console.log("🔊 오디오 URL이 없습니다")[m
       return[m
[36m@@ -502,7 +502,19 @@[m [mfunction RecordTranslatePageContent() {[m
     // 시작 시간이 있으면 해당 시점으로 이동[m
     if (startTimeMs !== undefined && startTimeMs > 0) {[m
       audio.currentTime = startTimeMs / 1000 // ms → seconds[m
[31m-      console.log("🔊 오디오 재생:", startTimeMs / 1000, "초부터")[m
[32m+[m[32m      console.log("🔊 오디오 재생:", startTimeMs / 1000, "초부터", endTimeMs ? `${endTimeMs / 1000}초까지` : "끝까지")[m
[32m+[m[32m    }[m
[32m+[m[41m    [m
[32m+[m[32m    // endTimeMs가 있으면 해당 시점에서 멈추기[m
[32m+[m[32m    if (endTimeMs !== undefined && endTimeMs > 0) {[m
[32m+[m[32m      const endTimeSeconds = endTimeMs / 1000[m
[32m+[m[32m      audio.ontimeupdate = () => {[m
[32m+[m[32m        if (audio.currentTime >= endTimeSeconds) {[m
[32m+[m[32m          audio.pause()[m
[32m+[m[32m          setIsPlayingAudio(false)[m
[32m+[m[32m          setCurrentPlayingItemId(null)[m
[32m+[m[32m        }[m
[32m+[m[32m      }[m
     }[m
     [m
     audio.onplay = () => {[m
[36m@@ -2530,6 +2542,27 @@[m [mPlease write the transcript following this exact format.`[m
                             <Button[m
                               onClick={async () => {[m
                                 setIsSavingDocument(true)[m
[32m+[m[41m                                [m
[32m+[m[32m                                // 텍스트에서 직접 변경된 화자명을 추출하여 transcripts에 반영[m
[32m+[m[32m                                // **[화자명]** 또는 [화자명] 형태로 표시된 것을 찾아 매핑[m
[32m+[m[32m                                const speakerMatches = editDocumentText.match(/\*\*\[([^\]]+)\]\*\*|\[([^\]]+)\]/g)[m
[32m+[m[32m                                if (speakerMatches) {[m
[32m+[m[32m                                  // 각 발화의 순서대로 화자명 매핑[m
[32m+[m[32m                                  const extractedSpeakers: string[] = [][m
[32m+[m[32m                                  speakerMatches.forEach(match => {[m
[32m+[m[32m                                    // **[화자명]** -> 화자명[m
[32m+[m[32m                                    // [화자명] -> 화자명[m
[32m+[m[32m                                    const name = match.replace(/\*\*/g, "").replace(/\[|\]/g, "").trim()[m
[32m+[m[32m                                    extractedSpeakers.push(name)[m
[32m+[m[32m                                  })[m
[32m+[m[41m                                  [m
[32m+[m[32m                                  // transcripts 순서와 매핑하여 화자명 업데이트[m
[32m+[m[32m                                  setTranscripts(prev => prev.map((t, idx) => ({[m
[32m+[m[32m                                    ...t,[m
[32m+[m[32m                                    speakerName: extractedSpeakers[idx] || t.speakerName[m
[32m+[m[32m                                  })))[m
[32m+[m[32m                                }[m
[32m+[m[41m                                [m
                                 // 현재 탭에 따라 업데이트[m
                                 if (documentViewTab === "conversation") {[m
                                   setDocumentTextConversation(editDocumentText)[m
[36m@@ -2543,7 +2576,17 @@[m [mPlease write the transcript following this exact format.`[m
                                 }[m
                                 [m
                                 // 화자명 변경사항도 DB에 저장 (utterances 테이블)[m
[31m-                                for (const item of transcripts) {[m
[32m+[m[32m                                // 최신 transcripts 상태를 사용해야 하므로 직접 API 호출[m
[32m+[m[32m                                const currentTranscripts = transcripts.map((t, idx) => {[m
[32m+[m[32m                                  const speakerMatches = editDocumentText.match(/\*\*\[([^\]]+)\]\*\*|\[([^\]]+)\]/g)[m
[32m+[m[32m                                  if (speakerMatches && speakerMatches[idx]) {[m
[32m+[m[32m                                    const name = speakerMatches[idx].replace(/\*\*/g, "").replace(/\[|\]/g, "").trim()[m
[32m+[m[32m                                    return { ...t, speakerName: name }[m
[32m+[m[32m                                  }[m
[32m+[m[32m                                  return t[m
[32m+[m[32m                                })[m
[32m+[m[41m                                [m
[32m+[m[32m                                for (const item of currentTranscripts) {[m
                                   if (item.utteranceId) {[m
                                     await supabase[m
                                       .from("utterances")[m
[36m@@ -2563,14 +2606,44 @@[m [mPlease write the transcript following this exact format.`[m
                             </Button>[m
                           </div>[m
                         </div>[m
[32m+[m[32m                      ) : documentViewTab === "conversation" ? ([m
[32m+[m[32m                        /* 원본대화: 스피커 버튼과 함께 렌더링 */[m
[32m+[m[32m                        <div className="space-y-3">[m
[32m+[m[32m                          {transcripts.map((item, idx) => ([m
[32m+[m[32m                            <div key={item.id || idx} className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">[m
[32m+[m[32m                              {/* 스피커 버튼 */}[m
[32m+[m[32m                              {sessionAudioUrl && item.start !== undefined && ([m
[32m+[m[32m                                <button[m
[32m+[m[32m                                  onClick={() => playAudioFromTime(item.id, item.start!, item.end)}[m
[32m+[m[32m                                  className={`flex-shrink-0 p-1.5 rounded-full transition-colors ${[m
[32m+[m[32m                                    currentPlayingItemId === item.id[m[41m [m
[32m+[m[32m                                      ? "bg-teal-500 text-white"[m[41m [m
[32m+[m[32m                                      : "bg-teal-100 text-teal-600 hover:bg-teal-200"[m
[32m+[m[32m                                  }`}[m
[32m+[m[32m                                  title="이 구간 재생"[m
[32m+[m[32m                                >[m
[32m+[m[32m                                  {currentPlayingItemId === item.id ? ([m
[32m+[m[32m                                    <Square className="h-3 w-3" />[m
[32m+[m[32m                                  ) : ([m
[32m+[m[32m                                    <Play className="h-3 w-3" />[m
[32m+[m[32m                                  )}[m
[32m+[m[32m                                </button>[m
[32m+[m[32m                              )}[m
[32m+[m[32m                              {/* 화자명 + 내용 */}[m
[32m+[m[32m                              <div className="flex-1">[m
[32m+[m[32m                                <span className="font-bold text-teal-700">[{item.speakerName}]</span>[m
[32m+[m[32m                                <span className="ml-2 text-slate-700">{item.original}</span>[m
[32m+[m[32m                              </div>[m
[32m+[m[32m                            </div>[m
[32m+[m[32m                          ))}[m
[32m+[m[32m                        </div>[m
                       ) : ([m
[32m+[m[32m                        /* KR원문 / US번역: 마크다운 렌더링 */[m
                         <div className="prose prose-slate max-w-none prose-headings:text-teal-800 prose-strong:text-teal-700 prose-li:marker:text-teal-500">[m
                           <ReactMarkdown remarkPlugins={[remarkGfm]}>[m
[31m-                            {documentViewTab === "conversation" [m
[31m-                              ? documentTextConversation [m
[31m-                              : documentViewTab === "original" [m
[31m-                                ? documentTextOriginal [m
[31m-                                : documentTextTranslated}[m
[32m+[m[32m                            {documentViewTab === "original"[m[41m [m
[32m+[m[32m                              ? documentTextOriginal[m[41m [m
[32m+[m[32m                              : documentTextTranslated}[m
                           </ReactMarkdown>[m
                         </div>[m
                       )}[m
[36m@@ -2705,7 +2778,7 @@[m [mPlease write the transcript following this exact format.`[m
                                         if (currentPlayingItemId === item.id && isPlayingAudio) {[m
                                           stopAudioPlayback()[m
                                         } else {[m
[31m-                                          playAudioFromTime(item.id, item.start)[m
[32m+[m[32m                                          playAudioFromTime(item.id, item.start, item.end)[m
                                         }[m
                                       }}[m
                                       className={`p-1.5 rounded-full hover:bg-white/50 transition-colors ${[m
