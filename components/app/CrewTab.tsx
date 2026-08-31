"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { at } from "@/lib/app-copy";
import { crew, crewById, crewFeed, type CrewPost } from "@/lib/crew";
import type { Locale } from "@/lib/locale";
import { ImmortalizeTrip } from "./ImmortalizeTrip";
import { TopSelfies } from "./TopSelfies";

export function CrewTab({ locale }: { locale: Locale }) {
  const c = at(locale);
  const [joined, setJoined] = useState<Record<string, boolean>>({});
  const [posts, setPosts] = useState<CrewPost[]>(crewFeed);
  const [draft, setDraft] = useState("");
  const [likes, setLikes] = useState<Record<string, number>>(() =>
    Object.fromEntries(crewFeed.map((p) => [p.id, p.likes])),
  );

  const people = useMemo(() => crew, []);

  function publish() {
    const body = draft.trim();
    if (!body) return;
    const post: CrewPost = {
      id: `local-${Date.now()}`,
      authorId: "william-brown",
      body: { en: body, es: body, fr: body, it: body, pt: body },
      place: "Kaenz",
      likes: 1,
      when: "now",
    };
    setPosts((p) => [post, ...p]);
    setLikes((l) => ({ ...l, [post.id]: 1 }));
    setDraft("");
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold">{c.tabs.crew}</h1>
      <p className="mt-1 text-sm text-white/70">{c.crewLead}</p>

      <ImmortalizeTrip locale={locale} />
      <TopSelfies locale={locale} />

      <div className="mt-8 flex gap-3 overflow-x-auto pb-2">
        {people.map((p) => (
          <article
            key={p.id}
            className="w-40 shrink-0 rounded-2xl border border-white/10 bg-white/5 p-3"
          >
            <Image
              src={p.photo}
              alt={p.name}
              width={80}
              height={80}
              className="h-16 w-16 rounded-full object-cover"
            />
            <h2 className="mt-2 truncate text-sm font-bold">{p.name}</h2>
            <p className="text-[11px] text-white/55">{p.city}</p>
            <p className="mt-1 line-clamp-2 text-[11px] text-white/70">
              {p.bio[locale]}
            </p>
            <p className="mt-2 text-[10px] font-semibold text-kaenz">
              {c.goingTo}: {p.goingTo}
            </p>
            <button
              type="button"
              onClick={() =>
                setJoined((j) => ({ ...j, [p.id]: !j[p.id] }))
              }
              className={`mt-2 w-full rounded-lg py-1.5 text-[11px] font-bold ${
                joined[p.id] ? "bg-white/15 text-kaenz" : "bg-kaenz text-white"
              }`}
            >
              {joined[p.id] ? c.joined : c.joinCrew}
            </button>
          </article>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={c.write}
          className="flex-1 rounded-xl bg-white px-3 py-3 text-sm text-navy outline-none"
        />
        <button
          type="button"
          onClick={publish}
          className="rounded-xl bg-kaenz px-4 text-sm font-bold text-white"
        >
          {c.post}
        </button>
      </div>

      <ul className="mt-5 space-y-3">
        {posts.map((post) => {
          const author = crewById(post.authorId);
          if (!author) return null;
          return (
            <li
              key={post.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex items-center gap-3">
                <Image
                  src={author.photo}
                  alt={author.name}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div>
                  <p className="text-sm font-bold">{author.name}</p>
                  <p className="text-[11px] text-white/50">
                    {post.place} · {post.when}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed">{post.body[locale]}</p>
              <button
                type="button"
                onClick={() =>
                  setLikes((l) => ({
                    ...l,
                    [post.id]: (l[post.id] || 0) + 1,
                  }))
                }
                className="mt-3 text-xs font-semibold text-kaenz"
              >
                ♥ {likes[post.id] ?? post.likes} {c.likes}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
