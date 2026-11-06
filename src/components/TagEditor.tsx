"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { updateContactTags } from "@/app/app/actions";

export function TagEditor({ id, tags: initial }: { id: string; tags: string[] }) {
  const [tags, setTags] = useState(initial);
  const [value, setValue] = useState("");
  const [, start] = useTransition();

  const save = (next: string[]) => {
    setTags(next);
    start(() => updateContactTags(id, next));
  };

  return (
    <div className="flex flex-wrap items-center gap-1 sm:max-w-xs">
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] text-brand-700">
          {t}
          <button onClick={() => save(tags.filter((x) => x !== t))} aria-label={`Remover ${t}`}>
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) {
            e.preventDefault();
            save([...new Set([...tags, value.trim().toLowerCase()])]);
            setValue("");
          }
        }}
        placeholder="+ tag"
        className="w-16 rounded border-none bg-transparent px-1 text-[11px] outline-none focus:w-24 focus:bg-zinc-100"
      />
    </div>
  );
}
