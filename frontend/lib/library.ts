const STORAGE_KEY = "ai-shorts-library";

export interface LibraryItem {
  id: string;
  createdAt: string;
  topic: string;
  tone: string;
  duration: string;
  script: {
    title: string;
    hook: string;
    scenes: { narration: string; caption: string }[];
  };
}

function load(): LibraryItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(items: LibraryItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function saveToLibrary(entry: Omit<LibraryItem, "id" | "createdAt">) {
  const items = load();
  const newItem: LibraryItem = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  save([newItem, ...items]);
  return newItem;
}

export function loadLibrary(): LibraryItem[] {
  return load();
}

export function deleteFromLibrary(id: string) {
  save(load().filter((item) => item.id !== id));
}
