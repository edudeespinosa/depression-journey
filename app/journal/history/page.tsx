"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";

type Mood = "low" | "okay" | "good";

type Entry = {
  id: string;
  content: string;
  ai_response: string | null;
  mood: Mood | null;
  created_at: string;
};

const MOOD_ICON: Record<Mood, string> = { low: "😔", okay: "😐", good: "🙂" };

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function EntryCard({ entry }: { entry: Entry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition"
      >
        {/* Mood */}
        <span className="text-xl flex-shrink-0 mt-0.5">
          {entry.mood ? MOOD_ICON[entry.mood] : "📝"}
        </span>

        <div className="flex-1 min-w-0">
          {/* Date + time */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">{formatDate(entry.created_at)}</span>
            <span className="text-xs text-slate-300">{formatTime(entry.created_at)}</span>
          </div>
          {/* Preview */}
          <p className="text-sm text-[#3E4A3D] leading-relaxed line-clamp-2">
            {entry.content}
          </p>
        </div>

        <span className="text-slate-300 text-xs flex-shrink-0 mt-1">
          {expanded ? "▴" : "▾"}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100">
          {/* Full entry */}
          <div className="pt-3 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
            {entry.content}
          </div>

          {/* AI reflection */}
          {entry.ai_response && (
            <div className="px-3 py-3 rounded-lg bg-[#f5f8f5] border border-[#dce8dc] text-sm text-[#3E4A3D] leading-relaxed whitespace-pre-wrap">
              {entry.ai_response}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function groupByDate(entries: Entry[]) {
  const groups: { label: string; entries: Entry[] }[] = [];
  const map = new Map<string, Entry[]>();

  for (const e of entries) {
    const key = new Date(e.created_at).toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }

  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  for (const [key, list] of map) {
    const label = key === today ? "Today" : key === yesterday ? "Yesterday" : formatDate(list[0].created_at);
    groups.push({ label, entries: list });
  }

  return groups;
}

export default function JournalHistoryPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/journal/entries")
      .then((r) => r.json())
      .then((data) => { setEntries(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const groups = groupByDate(entries);

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-[#3E4A3D] flex flex-col">
      <Nav />
      <main className="flex flex-col items-center px-4 py-12 flex-1">
      <div className="w-full max-w-2xl space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-light tracking-tight">Past Entries</h1>
          <p className="mt-1 text-slate-500 text-sm">
            {entries.length === 0 && !loading ? "Nothing yet. Write your first entry." : `${entries.length} entries`}
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 text-sm">Your reflections will appear here.</p>
            <a href="/journal" className="mt-4 inline-block text-sm text-[#7C9082] hover:underline">
              Write your first entry →
            </a>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map(({ label, entries }) => (
              <div key={label} className="space-y-3">
                <p className="text-xs uppercase tracking-widest text-slate-400">{label}</p>
                {entries.map((e) => <EntryCard key={e.id} entry={e} />)}
              </div>
            ))}
          </div>
        )}
      </div>
      </main>
    </div>
  );
}
