"use client";

import { useState, useEffect } from "react";

// ── 타입 ──────────────────────────────────────────────────────────
interface ModelCandidate {
  name: string;
  sub: string;
  memory: string;
  speed: string;
  quality: string;
  license: string;
  params_b: number;
  bits: number;
  verdict?: string;
  vram_gb?: number;
}

interface RecommendedItem { name: string; desc: string; }
interface Recommended { text: RecommendedItem; audio: RecommendedItem; image: RecommendedItem; video: RecommendedItem; }
interface Candidates { text: ModelCandidate[]; audio: ModelCandidate[]; image: ModelCandidate[]; video: ModelCandidate[]; }

interface CalcResult { vram_gb: number; verdict: string; }

// ── 상수 ──────────────────────────────────────────────────────────
const MODES = [
  { value: "16gb",    label: "🏠 16GB 기본" },
  { value: "speed",   label: "⚡ 속도 우선" },
  { value: "quality", label: "💎 품질 우선" },
  { value: "secure",  label: "🔒 보안 로컬" },
] as const;
type Mode = (typeof MODES)[number]["value"];

const TABS = [
  { value: "text",  label: "📝 텍스트" },
  { value: "audio", label: "🔊 오디오" },
  { value: "image", label: "🖼 이미지" },
  { value: "video", label: "🎬 비디오" },
] as const;
type Tab = (typeof TABS)[number]["value"];

const QUANT_OPTIONS = [
  { value: 4,  label: "4-bit (Q4)" },
  { value: 8,  label: "8-bit (Q8)" },
  { value: 16, label: "16-bit (FP16)" },
  { value: 32, label: "32-bit (FP32)" },
];

const PRESET_GPU = [
  { label: "선택 안함", vram: "" },
  { label: "RTX 4090 (24GB)", vram: "24" },
  { label: "RTX 4080 (16GB)", vram: "16" },
  { label: "RTX 4070 Ti (12GB)", vram: "12" },
  { label: "RTX 3080 (10GB)", vram: "10" },
  { label: "RTX 3060 (8GB)", vram: "8" },
  { label: "GTX 1660 (6GB)", vram: "6" },
  { label: "M1/M2/M3 (Unified)", vram: "unified" },
];

// ── 컴포넌트 ──────────────────────────────────────────────────────
export default function ModelsPage() {
  const [mode, setMode] = useState<Mode>("16gb");
  const [tab, setTab] = useState<Tab>("text");
  const [recommended, setRecommended] = useState<Recommended | null>(null);
  const [candidates, setCandidates] = useState<Candidates | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // 사용자 스펙 입력
  const [gpuPreset, setGpuPreset] = useState("");
  const [gpuVram, setGpuVram] = useState("");          // GB
  const [ramGb, setRamGb] = useState("");              // GB
  const [cpuOnly, setCpuOnly] = useState(false);

  // 커스텀 계산기
  const [calcParams, setCalcParams] = useState("7");
  const [calcBits, setCalcBits] = useState(4);
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  // 모드별 데이터 로드
  useEffect(() => {
    setLoadingData(true);
    fetch(`/api/models/data/${mode}`)
      .then((r) => r.json())
      .then((d) => {
        setRecommended(d.recommended);
        setCandidates(d.candidates);
      })
      .catch(() => {})
      .finally(() => setLoadingData(false));
  }, [mode]);

  // GPU 프리셋 선택 시 VRAM 자동 입력
  function handleGpuPreset(preset: string) {
    setGpuPreset(preset);
    const found = PRESET_GPU.find((g) => g.label === preset);
    if (found && found.vram && found.vram !== "unified") {
      setGpuVram(found.vram);
    } else if (found?.vram === "unified") {
      setGpuVram("");
      setCpuOnly(false);
    }
  }

  // VRAM 판정 (사용자 스펙 기준)
  function getVerdictForUser(vram_gb: number): { ok: boolean; label: string } {
    if (cpuOnly) {
      const ram = parseFloat(ramGb);
      if (!isNaN(ram)) return { ok: vram_gb <= ram * 0.8, label: ram ? `RAM ${ram}GB 기준` : "RAM 기준" };
      return { ok: true, label: "CPU 모드" };
    }
    if (gpuPreset.includes("M1") || gpuPreset.includes("M2") || gpuPreset.includes("M3")) {
      const ram = parseFloat(ramGb);
      if (!isNaN(ram)) return { ok: vram_gb <= ram * 0.7, label: `Unified ${ram}GB 기준` };
      return { ok: true, label: "Unified Memory" };
    }
    const userVram = parseFloat(gpuVram);
    if (!isNaN(userVram)) return { ok: vram_gb <= userVram * 0.9, label: `VRAM ${userVram}GB 기준` };
    return { ok: vram_gb < 15, label: "기본 16GB 기준" };
  }

  async function handleCalc() {
    const p = parseFloat(calcParams);
    if (isNaN(p) || p <= 0) return;
    setCalcLoading(true);
    setCalcResult(null);
    try {
      const r = await fetch(`/api/models/calc?params_b=${p}&bits=${calcBits}`);
      const d: CalcResult = await r.json();
      setCalcResult(d);
    } catch {
      setCalcResult(null);
    } finally {
      setCalcLoading(false);
    }
  }

  const tabModels: ModelCandidate[] = (candidates as any)?.[tab] ?? [];

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-1 text-3xl font-bold text-gray-900">🖥️ 모델</h1>
      <p className="mb-8 text-sm text-gray-500">
        내 환경에서 어떤 AI 모델을 쓸 수 있는지 확인하세요.
      </p>

      {/* ── 내 하드웨어 스펙 입력 ── */}
      <section className="mb-8 rounded-xl border border-blue-100 bg-blue-50 px-6 py-5">
        <h2 className="mb-4 text-sm font-semibold text-blue-700">⚙️ 내 하드웨어 스펙</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* GPU 프리셋 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">GPU 프리셋</label>
            <select
              value={gpuPreset}
              onChange={(e) => handleGpuPreset(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
            >
              {PRESET_GPU.map((g) => (
                <option key={g.label} value={g.label}>{g.label}</option>
              ))}
            </select>
          </div>

          {/* GPU VRAM 직접 입력 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              GPU VRAM (GB) <span className="text-gray-400">— 직접 입력</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={0.5}
                value={gpuVram}
                onChange={(e) => setGpuVram(e.target.value)}
                disabled={cpuOnly}
                placeholder="예: 8"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 disabled:opacity-40"
              />
              <span className="text-xs text-gray-400 shrink-0">GB</span>
            </div>
          </div>

          {/* 시스템 RAM */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">시스템 RAM (GB)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={1}
                value={ramGb}
                onChange={(e) => setRamGb(e.target.value)}
                placeholder="예: 32"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
              <span className="text-xs text-gray-400 shrink-0">GB</span>
            </div>
          </div>

          {/* CPU only 토글 */}
          <div className="flex items-end pb-1">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={cpuOnly}
                onChange={(e) => setCpuOnly(e.target.checked)}
                className="h-4 w-4 accent-blue-600"
              />
              GPU 없음 (CPU 전용)
            </label>
          </div>
        </div>

        {/* 현재 스펙 요약 */}
        <div className="mt-4 rounded-lg bg-white px-4 py-2 text-xs text-gray-500 border border-blue-100">
          {cpuOnly
            ? `CPU 전용 · RAM ${ramGb || "?"}GB`
            : gpuPreset.includes("M1") || gpuPreset.includes("M2") || gpuPreset.includes("M3")
            ? `Apple Silicon · Unified Memory ${ramGb || "?"}GB`
            : `GPU VRAM ${gpuVram || "?"}GB · RAM ${ramGb || "?"}GB`}
        </div>
      </section>

      {/* ── 모드 선택 ── */}
      <div className="mb-6 flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
              mode === m.value
                ? "border-blue-500 bg-blue-600 text-white"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {loadingData ? (
        <p className="py-10 text-center text-sm text-gray-400 animate-pulse">모델 정보 불러오는 중...</p>
      ) : (
        <>
          {/* ── 추천 조합 ── */}
          {recommended && (
            <section className="mb-6">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">추천 조합</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(["text", "audio", "image", "video"] as const).map((k) => (
                  <div key={k} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                    <p className="text-xs text-gray-400 mb-1">
                      {k === "text" ? "📝 텍스트" : k === "audio" ? "🔊 오디오" : k === "image" ? "🖼 이미지" : "🎬 비디오"}
                    </p>
                    <p className="text-sm font-semibold text-gray-800">{recommended[k].name}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{recommended[k].desc}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── 탭 ── */}
          <div className="mb-4 flex gap-1 border-b border-gray-200">
            {TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${
                  tab === t.value
                    ? "border-blue-500 text-blue-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── 모델 목록 ── */}
          <div className="flex flex-col gap-3 mb-10">
            {tabModels.map((m) => {
              const hasVram = m.vram_gb !== undefined && m.vram_gb > 0;
              const userVerdict = hasVram ? getVerdictForUser(m.vram_gb!) : null;

              return (
                <div key={m.name} className="rounded-xl border border-gray-200 bg-white px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-800">{m.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{m.sub}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {/* 기본 판정 */}
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        m.verdict === "16GB OK"
                          ? "bg-green-100 text-green-700"
                          : m.verdict === "해당없음"
                          ? "bg-gray-100 text-gray-500"
                          : "bg-red-100 text-red-600"
                      }`}>
                        {m.verdict}
                      </span>
                      {/* 내 스펙 기준 판정 */}
                      {userVerdict && (
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          userVerdict.ok ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-600"
                        }`}>
                          {userVerdict.ok ? "✓ 내 환경 가능" : "✗ 내 환경 부족"} · {userVerdict.label}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-500 sm:grid-cols-4">
                    <span>💾 {m.memory}</span>
                    <span>⚡ 속도: {m.speed}</span>
                    <span>✨ 품질: {m.quality}</span>
                    <span>📄 라이선스: {m.license}</span>
                    {hasVram && <span className="col-span-2 sm:col-span-4 text-gray-400">추정 VRAM: {m.vram_gb}GB</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── 커스텀 VRAM 계산기 ── */}
      <section className="rounded-xl border border-gray-200 bg-white px-6 py-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">🧮 커스텀 VRAM 계산기</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">파라미터 수 (B)</label>
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={calcParams}
              onChange={(e) => setCalcParams(e.target.value)}
              placeholder="예: 7"
              className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">양자화</label>
            <select
              value={calcBits}
              onChange={(e) => setCalcBits(Number(e.target.value))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            >
              {QUANT_OPTIONS.map((q) => (
                <option key={q.value} value={q.value}>{q.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCalc}
            disabled={calcLoading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {calcLoading ? "계산 중..." : "계산"}
          </button>
        </div>

        {calcResult && (
          <div className={`mt-4 rounded-lg px-4 py-3 text-sm ${
            calcResult.verdict === "16GB OK"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-600"
          }`}>
            <p className="font-semibold">추정 VRAM: {calcResult.vram_gb.toFixed(2)} GB</p>
            <p className="text-xs mt-0.5">
              기본 판정: {calcResult.verdict}
              {gpuVram && !cpuOnly && (
                <> · 내 VRAM({gpuVram}GB) 기준:{" "}
                  {calcResult.vram_gb <= parseFloat(gpuVram) * 0.9
                    ? <span className="text-blue-600 font-medium">가능 ✓</span>
                    : <span className="text-orange-500 font-medium">부족 ✗</span>
                  }
                </>
              )}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
