import React, { useEffect, useMemo, useRef, useState } from 'react';
import { audioEngine, type AudioStateSnapshot } from '../lib/audioEngine';
import { ttsEngine, type TtsStateSnapshot } from '../lib/ttsEngine';
import type { BgmVibe, TtsLangSetting, UserPrefs } from '../types/quiz';
import { IconMusic, IconStop, IconUpload, IconVolume, IconX } from './Icons';

interface AudioTtsDrawerProps {
  open: boolean;
  prefs: UserPrefs;
  onUpdatePrefs: (patch: Partial<UserPrefs>) => void;
  onClose: () => void;
}

const VIBE_OPTIONS: { id: BgmVibe; title: string; subtitle: string }[] = [
  { id: 'lofi', title: 'Lo-fi Piano', subtitle: 'Hợp âm ấm và vinyl nhẹ' },
  { id: 'ambient', title: 'Warm Ambient', subtitle: 'Pad êm dịu tập trung' },
  { id: 'rain', title: 'Tiếng mưa nhẹ', subtitle: 'Âm thanh mưa thư giãn' },
];

const RATE_PRESETS = [0.85, 1.0, 1.25];

export const AudioTtsDrawer: React.FC<AudioTtsDrawerProps> = ({
  open,
  prefs,
  onUpdatePrefs,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [audioSnap, setAudioSnap] = useState<AudioStateSnapshot>(() => audioEngine.getSnapshot());
  const [ttsSnap, setTtsSnap] = useState<TtsStateSnapshot>(() => ttsEngine.getSnapshot());
  const [showMobileTip, setShowMobileTip] = useState(false);

  useEffect(() => {
    const unsubAudio = audioEngine.subscribe(setAudioSnap);
    const unsubTts = ttsEngine.subscribe(setTtsSnap);
    return () => {
      unsubAudio();
      unsubTts();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    ttsEngine.refreshVoices();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const filteredVoices = useMemo(() => {
    const voices = ttsSnap.voices;
    if (prefs.ttsLang === 'vi-VN') {
      return voices.filter((v) => v.lang.toLowerCase().startsWith('vi'));
    }
    if (prefs.ttsLang === 'en-US') {
      return voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
    }
    return [...voices].sort((a, b) => {
      const aPrior = /^(vi|en)/i.test(a.lang) ? 0 : 1;
      const bPrior = /^(vi|en)/i.test(b.lang) ? 0 : 1;
      if (aPrior !== bPrior) return aPrior - bPrior;
      return a.lang.localeCompare(b.lang);
    });
  }, [ttsSnap.voices, prefs.ttsLang]);

  if (!open) return null;

  const handleSelectVibe = (vibe: BgmVibe) => {
    audioEngine.unlock();
    if (vibe === 'custom' && !audioSnap.customTrackName) {
      fileInputRef.current?.click();
      return;
    }
    onUpdatePrefs({ bgmVibe: vibe, bgmEnabled: true });
  };

  const handleUploadAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    audioEngine.unlock();
    audioEngine.setCustomTrack(file);
    onUpdatePrefs({ bgmVibe: 'custom', bgmEnabled: true });
    e.target.value = '';
  };

  const handleTestVoice = () => {
    audioEngine.unlock();
    ttsEngine.unlock();
    if (ttsSnap.speaking) {
      ttsEngine.stop();
      return;
    }
    ttsEngine.speakSample({
      langSetting: prefs.ttsLang,
      voiceURI: prefs.ttsVoiceURI,
      rate: prefs.ttsRate,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-stretch sm:justify-end"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Cài đặt âm thanh và giọng đọc TTS"
    >
      <div
        className="animate-panel-reveal flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-2xl border border-[#E4E4DF] bg-white shadow-2xl dark:border-[#2B3038] dark:bg-[#1A1D22] sm:h-full sm:max-h-full sm:max-w-md sm:rounded-none sm:rounded-l-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E4E4DF] px-5 py-4 dark:border-[#2B3038]">
          <div>
            <h2 className="font-display text-base font-bold text-[#141413] dark:text-[#F3F4F6]">
              Âm thanh và giọng đọc (TTS)
            </h2>
            <p className="text-xs text-[#5C5C56] dark:text-[#9CA3AF]">
              Chạy offline, tự hạ nhỏ nhạc khi máy đang đọc
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng cài đặt"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#5C5C56] transition-colors hover:bg-[#F7F7F5] hover:text-[#141413] dark:text-[#9CA3AF] dark:hover:bg-[#23272E] dark:hover:text-white"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {/* Background chill music */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#2447E5]/10 text-[#2447E5] dark:bg-[#4F75FF]/15 dark:text-[#7896FF]">
                  <IconMusic className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#141413] dark:text-[#F3F4F6]">Nhạc nền chill</h3>
                  <p className="text-xs text-[#5C5C56] dark:text-[#9CA3AF]">Web Audio tích hợp hoặc MP3 cá nhân</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs.bgmEnabled}
                onClick={() => {
                  audioEngine.unlock();
                  onUpdatePrefs({ bgmEnabled: !prefs.bgmEnabled });
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  prefs.bgmEnabled ? 'bg-[#2447E5]' : 'bg-[#D0D0C8] dark:bg-[#2B3038]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    prefs.bgmEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {VIBE_OPTIONS.map((vibe) => {
                const selected = prefs.bgmVibe === vibe.id;
                return (
                  <button
                    key={vibe.id}
                    type="button"
                    onClick={() => handleSelectVibe(vibe.id)}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      selected
                        ? 'border-[#2447E5] bg-[#2447E5]/6 ring-1 ring-[#2447E5] dark:border-[#4F75FF] dark:bg-[#4F75FF]/12'
                        : 'border-[#E4E4DF] bg-[#FBFBF9] hover:border-[#C5C5BD] dark:border-[#2B3038] dark:bg-[#121417]'
                    }`}
                  >
                    <div className="text-xs font-bold text-[#141413] dark:text-[#F3F4F6]">{vibe.title}</div>
                    <div className="mt-0.5 text-[11px] text-[#5C5C56] dark:text-[#9CA3AF]">
                      {vibe.subtitle}
                    </div>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  prefs.bgmVibe === 'custom'
                    ? 'border-[#2447E5] bg-[#2447E5]/6 ring-1 ring-[#2447E5] dark:border-[#4F75FF] dark:bg-[#4F75FF]/12'
                    : 'border-dashed border-[#C9C9C0] bg-[#FBFBF9] hover:border-[#2447E5] dark:border-[#2B3038] dark:bg-[#121417]'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#141413] dark:text-[#F3F4F6]">
                  <IconUpload className="h-3.5 w-3.5 text-[#2447E5] dark:text-[#7896FF]" />
                  <span>Nhạc của bạn</span>
                </div>
                <div className="mt-0.5 truncate text-[11px] text-[#5C5C56] dark:text-[#9CA3AF]">
                  {audioSnap.customTrackName || 'Chọn file .mp3/.m4a'}
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleUploadAudio}
              />
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-[#E4E4DF] bg-[#F7F7F5] px-3.5 py-2.5 dark:border-[#2B3038] dark:bg-[#121417]">
              <span className="text-xs font-semibold text-[#5C5C56] dark:text-[#9CA3AF]">Âm lượng</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={prefs.bgmVolume}
                onChange={(e) => onUpdatePrefs({ bgmVolume: Number(e.target.value) })}
                aria-label="Âm lượng nhạc nền"
                className="h-1.5 flex-1 cursor-pointer accent-[#2447E5]"
              />
              <span className="w-9 text-right font-mono text-xs text-[#141413] dark:text-[#F3F4F6]">
                {Math.round(prefs.bgmVolume * 100)}%
              </span>
            </div>
          </section>

          {/* Sound effects (SFX) */}
          <section className="flex items-center justify-between rounded-xl border border-[#E4E4DF] bg-[#F7F7F5] px-4 py-3 dark:border-[#2B3038] dark:bg-[#121417]">
            <div>
              <h3 className="text-sm font-bold text-[#141413] dark:text-[#F3F4F6]">Hiệu ứng âm thanh (SFX)</h3>
              <p className="text-xs text-[#5C5C56] dark:text-[#9CA3AF]">
                Âm báo đúng/sai, streak và 5 giây cuối
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.sfxEnabled}
              onClick={() => {
                audioEngine.unlock();
                onUpdatePrefs({ sfxEnabled: !prefs.sfxEnabled });
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                prefs.sfxEnabled ? 'bg-[#2447E5]' : 'bg-[#D0D0C8] dark:bg-[#2B3038]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                  prefs.sfxEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </section>

          {/* Text-to-Speech (TTS) */}
          <section className="space-y-3 border-t border-[#E4E4DF] pt-5 dark:border-[#2B3038]">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#168A5B]/12 text-[#168A5B] dark:text-emerald-400">
                <IconVolume className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-[#141413] dark:text-[#F3F4F6]">
                  Đọc câu hỏi và đáp án (TTS)
                </h3>
                <p className="text-xs text-[#5C5C56] dark:text-[#9CA3AF]">
                  Web Speech API miễn phí trên thiết bị
                </p>
              </div>
            </div>

            {!ttsSnap.supported ? (
              <div className="rounded-xl border border-[#D9820B]/40 bg-[#D9820B]/10 p-3 text-xs text-[#9A5804] dark:text-amber-200">
                Trình duyệt hiện tại chưa hỗ trợ Web Speech API (`speechSynthesis`). Hãy mở bằng Safari (iOS) hoặc Chrome (Android/Desktop) để dùng tính năng đọc giọng nói.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-[#E4E4DF] bg-[#F7F7F5] px-4 py-3 dark:border-[#2B3038] dark:bg-[#121417]">
                  <div>
                    <div className="text-xs font-bold text-[#141413] dark:text-[#F3F4F6]">
                      Tự động đọc khi sang câu mới
                    </div>
                    <div className="text-[11px] text-[#5C5C56] dark:text-[#9CA3AF]">
                      Đọc câu hỏi và 4 đáp án A/B/C/D
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={prefs.ttsAutoRead}
                    onClick={() => {
                      ttsEngine.unlock();
                      onUpdatePrefs({ ttsAutoRead: !prefs.ttsAutoRead });
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      prefs.ttsAutoRead ? 'bg-[#168A5B]' : 'bg-[#D0D0C8] dark:bg-[#2B3038]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                        prefs.ttsAutoRead ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Language selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#141413] dark:text-[#F3F4F6]">
                    Ngôn ngữ đọc
                  </label>
                  <div className="grid grid-cols-3 gap-1 rounded-xl border border-[#E4E4DF] bg-[#F7F7F5] p-1 dark:border-[#2B3038] dark:bg-[#121417]">
                    {(
                      [
                        { id: 'auto', label: 'Tự động' },
                        { id: 'vi-VN', label: 'Tiếng Việt' },
                        { id: 'en-US', label: 'English' },
                      ] as { id: TtsLangSetting; label: string }[]
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onUpdatePrefs({ ttsLang: opt.id, ttsVoiceURI: '' })}
                        className={`rounded-lg py-1.5 text-xs font-bold transition-colors ${
                          prefs.ttsLang === opt.id
                            ? 'bg-white text-[#141413] shadow-2xs dark:bg-[#1A1D22] dark:text-white'
                            : 'text-[#5C5C56] hover:text-[#141413] dark:text-[#9CA3AF]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Voice dropdown */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="tts-voice-select"
                    className="text-xs font-semibold text-[#141413] dark:text-[#F3F4F6]"
                  >
                    Giọng đọc trên thiết bị
                  </label>
                  <select
                    id="tts-voice-select"
                    value={prefs.ttsVoiceURI}
                    onChange={(e) => onUpdatePrefs({ ttsVoiceURI: e.target.value })}
                    className="w-full rounded-xl border border-[#E4E4DF] bg-white px-3 py-2 text-xs text-[#141413] focus:border-[#2447E5] focus:outline-none dark:border-[#2B3038] dark:bg-[#121417] dark:text-[#F3F4F6]"
                  >
                    <option value="">Tự chọn giọng tự nhiên nhất</option>
                    {filteredVoices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                  {ttsSnap.hasVoices && filteredVoices.length === 0 && (
                    <p className="text-[11px] text-[#B86B04] dark:text-amber-300">
                      Thiết bị chưa cài gói giọng cho ngôn ngữ này; trình duyệt sẽ dùng giọng mặc định hoặc hãy tải thêm voice Tiếng Việt trong Cài đặt hệ thống.
                    </p>
                  )}
                </div>

                {/* Speed slider */}
                <div className="space-y-2 rounded-xl border border-[#E4E4DF] bg-[#F7F7F5] p-3 dark:border-[#2B3038] dark:bg-[#121417]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#141413] dark:text-[#F3F4F6]">Tốc độ đọc</span>
                    <span className="font-mono font-bold text-[#168A5B] dark:text-emerald-400">
                      {prefs.ttsRate.toFixed(2).replace(/\.00$/, '.0')}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.75}
                    max={1.5}
                    step={0.05}
                    value={prefs.ttsRate}
                    onChange={(e) => onUpdatePrefs({ ttsRate: Number(e.target.value) })}
                    aria-label="Tốc độ đọc TTS"
                    className="h-1.5 w-full cursor-pointer accent-[#168A5B]"
                  />
                  <div className="flex gap-1.5">
                    {RATE_PRESETS.map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => onUpdatePrefs({ ttsRate: rate })}
                        className={`flex-1 rounded-lg py-1 text-[11px] font-bold transition-colors ${
                          Math.abs(prefs.ttsRate - rate) < 0.01
                            ? 'bg-[#168A5B] text-white'
                            : 'bg-white text-[#5C5C56] hover:text-[#141413] dark:bg-[#1A1D22] dark:text-[#9CA3AF]'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sample test button */}
                <button
                  type="button"
                  onClick={handleTestVoice}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#141413] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#2B2B28] dark:bg-[#3B5BFF] dark:hover:bg-[#2E4EEB]"
                >
                  {ttsSnap.speaking ? (
                    <>
                      <IconStop className="h-3.5 w-3.5" />
                      <span>Dừng đọc thử</span>
                    </>
                  ) : (
                    <>
                      <IconVolume className="h-4 w-4" />
                      <span>Nghe thử giọng đọc</span>
                    </>
                  )}
                </button>

                {/* Collapsible mobile tip */}
                <div className="rounded-xl border border-[#E4E4DF] bg-[#F7F7F5] dark:border-[#2B3038] dark:bg-[#121417]">
                  <button
                    type="button"
                    onClick={() => setShowMobileTip((v) => !v)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold text-[#5C5C56] dark:text-[#9CA3AF]"
                  >
                    <span>Mẹo dùng TTS mượt trên Mobile (iOS / Android)</span>
                    <span className="text-[11px] font-bold text-[#2447E5] dark:text-[#7896FF]">
                      {showMobileTip ? 'Ẩn' : 'Xem'}
                    </span>
                  </button>
                  {showMobileTip && (
                    <div className="space-y-1.5 border-t border-[#E4E4DF] px-3 py-2.5 text-[11px] leading-relaxed text-[#5C5C56] dark:border-[#2B3038] dark:text-[#9CA3AF]">
                      <p>
                        • <strong>Miễn phí 100% và Offline:</strong> Web Speech API dùng sẵn giọng hệ thống trên iOS Safari (giọng Linh/Samantha) và Android Chrome (Google Speech).
                      </p>
                      <p>
                        • <strong>Nếu iPhone không phát tiếng:</strong> kiểm tra nút gạt im lặng (Silent switch) bên hông máy hoặc vào <em>Cài đặt → Trợ năng → Nội dung được đọc → Giọng nói → Tiếng Việt</em> tải giọng nâng cao.
                      </p>
                      <p>
                        • Nhạc nền sẽ tự động hạ nhỏ khi máy đang đọc và tăng lại sau khi đọc xong.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
