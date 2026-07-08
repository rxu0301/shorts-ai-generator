"use client";

import { useState, useRef } from "react";

const TTS_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;
type TtsVoice = (typeof TTS_VOICES)[number];

const IMAGE_MODELS = [
  { value: "gpt-image-2",   label: "gpt-image-2 (최신)" },
  { value: "gpt-image-1.5", label: "gpt-image-1.5" },
] as const;
type ImageModel = (typeof IMAGE_MODELS)[number]["value"];

const IMAGE_STYLES = [
  { value: "realistic", label: "🎬 실사",      desc: "사진처럼 사실적인 스타일" },
  { value: "cartoon",   label: "🎨 키툰",      desc: "한국 웹툰풍 일러스트" },
  { value: "anime",     label: "✨ 애니메이션", desc: "일본 애니메이션 스타일" },
] as const;
type ImageStyle = (typeof IMAGE_STYLES)[number]["value"];

const DURATIONS = [
  { value: "10s", label: "10초", desc: "2 장면" },
  { value: "30s", label: "30초", desc: "5 장면" },
  { value: "60s", label: "1분",  desc: "10 장면" },
] as const;
type Duration = (typeof DURATIONS)[number]["value"];

interface Scene {
  narration: string;
  caption: string;
  image_prompt?: string;
}

interface Script {
  title: string;
  hook: string;
  scenes: Scene[];
}

interface ImageState {
  url: string | null;
  loading: boolean;
  error: string;
}

export default function Home() {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("재미있게");
  const [duration, setDuration] = useState<Duration>("30s");
  const [script, setScript] = useState<Script | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // 이미지 설정
  const [imageModel, setImageModel] = useState<ImageModel>("gpt-image-2");
  const [imageStyle, setImageStyle] = useState<ImageStyle>("realistic");

  // 장면별 이미지 상태
  const [sceneImages, setSceneImages] = useState<Record<number, ImageState>>({});

  // TTS 상태
  const [speaking, setSpeaking] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0); // 0.5 ~ 2.0 (Web Audio API detune 변환)
  const [selectedVoice, setSelectedVoice] = useState<TtsVoice>("nova");
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  async function fetchOneSceneImage(scene: Scene, i: number) {
    setSceneImages((prev) => ({
      ...prev,
      [i]: { url: prev[i]?.url ?? null, loading: true, error: "" },
    }));

    const prompt = scene.image_prompt ?? scene.caption;
    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model: imageModel, style: imageStyle }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSceneImages((prev) => ({
          ...prev,
          [i]: { url: null, loading: false, error: data.error ?? "이미지 생성 실패" },
        }));
      } else {
        setSceneImages((prev) => ({
          ...prev,
          [i]: { url: data.url, loading: false, error: "" },
        }));
      }
    } catch {
      setSceneImages((prev) => ({
        ...prev,
        [i]: { url: null, loading: false, error: "이미지 요청 오류" },
      }));
    }
  }

  async function handleSpeak() {
    if (!script) return;

    // 재생 중이면 중지
    if (speaking) {
      sourceRef.current?.stop();
      sourceRef.current = null;
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
      setSpeaking(false);
      return;
    }

    const text = script.scenes.map((s) => s.narration).join(" ");

    setTtsLoading(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: selectedVoice, speed: speechRate }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "TTS 오류가 발생했습니다.");
        return;
      }

      const arrayBuffer = await res.arrayBuffer();

      // Web Audio API로 pitch 조절
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const source = ctx.createBufferSource();
      sourceRef.current = source;

      source.buffer = audioBuffer;
      // detune: 100 cents = 반음, pitch 1.0 → 0 cents, 2.0 → 1200 cents (1 octave up)
      source.detune.value = Math.round((pitch - 1.0) * 1200);
      source.connect(ctx.destination);

      source.onended = () => {
        setSpeaking(false);
        ctx.close();
        audioCtxRef.current = null;
        sourceRef.current = null;
      };

      setSpeaking(true);
      source.start(0);
    } finally {
      setTtsLoading(false);
    }
  }

  async function handleGenerate() {
    if (!topic.trim()) return;

    setLoading(true);
    setError("");
    setScript(null);
    setSceneImages({});

    try {
      const res = await fetch("/api/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, tone, duration }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "오류가 발생했습니다.");
      } else {
        setScript(data.script);
      }
    } catch {
      setError("서버에 연결할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!script) return;
    await navigator.clipboard.writeText(JSON.stringify(script, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-5xl font-bold">AI 쇼츠 생성기</h1>

      <div className="flex w-full max-w-lg flex-col gap-4">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
          placeholder="주제를 입력하세요"
          className="rounded-xl border border-gray-300 px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />

        <select
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          className="rounded-xl border border-gray-300 px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        >
          <option value="재미있게">재미있게</option>
          <option value="진지하게">진지하게</option>
        </select>

        {/* 분량 선택 */}
        <div className="flex gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d.value}
              onClick={() => setDuration(d.value)}
              className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                duration === d.value
                  ? "border-blue-500 bg-blue-600 text-white"
                  : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {d.label}
              <span className={`ml-1 text-xs ${duration === d.value ? "text-blue-100" : "text-gray-400"}`}>
                ({d.desc})
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !topic.trim()}
          className="rounded-xl bg-blue-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "생성 중..." : "대본 생성"}
        </button>
      </div>

      {error && (
        <p className="w-full max-w-lg rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {script && (
        <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-gray-50 px-6 py-5">
          {/* 헤더 */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-500">생성된 대본</h2>
            <div className="flex gap-2">
              <button
                onClick={handleSpeak}
                disabled={ttsLoading}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {ttsLoading ? "로딩 중..." : speaking ? "⏹ 중지" : "🔊 낭독 듣기"}
              </button>
              <button
                onClick={handleCopy}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm text-gray-600 transition hover:bg-gray-100"
              >
                {copied ? "복사됨 ✓" : "복사"}
              </button>
            </div>
          </div>

          {/* TTS 설정 */}
          <div className="mb-5 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-xs text-gray-400">음성</span>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value as TtsVoice)}
                disabled={speaking || ttsLoading}
                className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-700 outline-none focus:border-blue-400 disabled:opacity-50"
              >
                {TTS_VOICES.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-xs text-gray-400">
                속도 {speechRate.toFixed(1)}x
              </span>
              <input
                type="range"
                min={0.25}
                max={4.0}
                step={0.25}
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                disabled={speaking || ttsLoading}
                className="flex-1 accent-blue-600 disabled:opacity-50"
              />
              <span className="text-xs text-gray-400">0.25–4.0</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-xs text-gray-400">
                높낮이 {pitch.toFixed(1)}x
              </span>
              <input
                type="range"
                min={0.5}
                max={2.0}
                step={0.1}
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
                disabled={speaking || ttsLoading}
                className="flex-1 accent-purple-600 disabled:opacity-50"
              />
              <span className="text-xs text-gray-400">0.5–2.0</span>
            </div>

            <p className="text-xs text-gray-400">
              ※ 높낮이는 재생 시 Web Audio API로 처리됩니다. 속도는 OpenAI TTS에서 처리합니다.
            </p>
          </div>

          {/* 이미지 설정 */}
          <div className="mb-5 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs font-semibold text-gray-500">🖼 이미지 설정</p>

            {/* 모델 선택 */}
            <div className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-xs text-gray-400">모델</span>
              <select
                value={imageModel}
                onChange={(e) => setImageModel(e.target.value as ImageModel)}
                className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-700 outline-none focus:border-blue-400"
              >
                {IMAGE_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* 이미지 유형 선택 */}
            <div className="flex items-start gap-3">
              <span className="w-16 shrink-0 pt-1 text-xs text-gray-400">유형</span>
              <div className="flex flex-1 gap-2">
                {IMAGE_STYLES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setImageStyle(s.value)}
                    title={s.desc}
                    className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition ${
                      imageStyle === s.value
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {s.label}
                    <span className="mt-0.5 block text-[10px] font-normal text-gray-400">
                      {s.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 대본 내용 */}
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">제목</p>
          <p className="mb-4 text-lg font-bold text-gray-800">{script.title}</p>

          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">훅</p>
          <p className="mb-4 text-base italic text-blue-700">{script.hook}</p>

          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">장면</p>
          <div className="flex flex-col gap-3">
            {script.scenes.map((scene, i) => {
              const img = sceneImages[i];
              const hasImage = img && !img.loading && img.url;
              const isLoading = img?.loading;
              const hasError = img && !img.loading && img.error;

              return (
                <div key={i} className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                  {/* 텍스트 */}
                  <p className="mb-1 text-sm text-gray-800">🎙 {scene.narration}</p>
                  <p className="mb-3 text-xs text-gray-500">📝 {scene.caption}</p>

                  {/* 이미지 생성 / 새로고침 버튼 */}
                  <button
                    onClick={() => fetchOneSceneImage(scene, i)}
                    disabled={isLoading}
                    className="mb-3 w-full rounded-lg border border-blue-200 bg-blue-50 py-2 text-xs font-medium text-blue-600 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading
                      ? "⏳ 이미지 생성 중..."
                      : hasImage
                      ? "🔄 이미지 새로고침"
                      : "🖼 이미지 생성"}
                  </button>

                  {/* 에러 */}
                  {hasError && (
                    <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-500">
                      {img.error}
                    </p>
                  )}

                  {/* 로딩 플레이스홀더 */}
                  {isLoading && (
                    <div className="flex h-48 items-center justify-center rounded-lg bg-gray-100">
                      <span className="animate-pulse text-xs text-gray-400">이미지 생성 중...</span>
                    </div>
                  )}

                  {/* 생성된 이미지 */}
                  {hasImage && (
                    <img
                      src={img.url!}
                      alt={scene.caption}
                      className="w-full rounded-lg object-cover"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
