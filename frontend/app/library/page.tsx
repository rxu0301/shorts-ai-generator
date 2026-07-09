"use client";

import { useEffect, useState } from "react";
import { loadLibrary, deleteFromLibrary, type LibraryItem } from "../../lib/library";

const DURATION_LABEL: Record<string, string> = {
  "10s": "10초",
  "30s": "30초",
  "60s": "1분",
};

export default function LibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setItems(loadLibrary());
  }, []);

  function handleDelete(id: string) {
    deleteFromLibrary(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (expanded === id) setExpanded(null);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">📚 라이브러리</h1>
      <p className="mb-8 text-sm text-gray-500">
        저장된 대본은 브라우저 로컬 스토리지에 보관됩니다.
      </p>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm">저장된 대본이 없습니다.</p>
          <p className="text-xs mt-1">대본 생성 후 💾 저장 버튼을 눌러보세요.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => {
            const isOpen = expanded === item.id;
            const date = new Date(item.createdAt).toLocaleString("ko-KR", {
              year: "numeric", month: "2-digit", day: "2-digit",
              hour: "2-digit", minute: "2-digit",
            });

            return (
              <li
                key={item.id}
                className="rounded-xl border border-gray-200 bg-white shadow-sm"
              >
                {/* 헤더 */}
                <div
                  className="flex cursor-pointer items-center justify-between px-5 py-4"
                  onClick={() => setExpanded(isOpen ? null : item.id)}
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-800">
                      {item.script.title}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {date} · {item.tone} · {DURATION_LABEL[item.duration] ?? item.duration} · 주제: {item.topic}
                    </p>
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-500 transition hover:bg-red-50"
                    >
                      삭제
                    </button>
                    <span className="text-gray-400 text-sm">{isOpen ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* 상세 */}
                {isOpen && (
                  <div className="border-t border-gray-100 px-5 py-4">
                    <p className="mb-3 text-sm italic text-blue-600">🪝 {item.script.hook}</p>
                    <div className="flex flex-col gap-2">
                      {item.script.scenes.map((scene, i) => (
                        <div
                          key={i}
                          className="rounded-lg bg-gray-50 px-4 py-3 text-sm"
                        >
                          <p className="text-gray-800">🎙 {scene.narration}</p>
                          <p className="mt-1 text-xs text-gray-500">📝 {scene.caption}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
