import Image from "next/image";
import { DollarSign, Star } from "lucide-react";
import InstagramIcon from "./logos/Instagram";

const CARDS = [
  { image: "/singer.jpg", category: "Singing", name: "Maya Rivera", role: "Vocalist · acoustic sets", handle: "@maya.sings" },
  { image: "/dancer.jpg", category: "Dance", name: "Dev Anand", role: "Breakdancer · freestyle", handle: "@dev.moves" },
  { image: "/programmer.jpg", category: "Variety", name: "Arjun Mehta", role: "Live coder · music visuals", handle: "@arjun.codes" },
];

/** Example performer cards — shows what a performer's stage card looks like. */
export default function Showcase() {
  return (
    <section aria-labelledby="showcase-title" className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-28 sm:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="showcase-title" className="text-2xl font-semibold tracking-tight text-white">
            Every performer gets a stage card
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Your socials and demo link sit under your video, and the audience can tip you while you play.
          </p>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-500">Sample profiles</span>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        {CARDS.map((card, i) => (
          <article
            key={card.name}
            className="group animate-rise relative h-80 overflow-hidden rounded-3xl border border-white/10 bg-zinc-900"
            style={{ animationDelay: `${i * 120}ms` }}
          >
            <Image
              src={card.image}
              alt={`${card.category} performer`}
              fill
              sizes="(max-width: 640px) 100vw, 33vw"
              className="object-cover transition duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
            <span className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-amber-200 backdrop-blur">
              {card.category}
            </span>
            <div className="absolute inset-x-0 bottom-0 p-5">
              <p className="text-lg font-semibold text-white">{card.name}</p>
              <p className="text-sm text-zinc-300">{card.role}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-white backdrop-blur [&_svg]:h-3.5 [&_svg]:w-3.5">
                  <InstagramIcon /> {card.handle}
                </span>
                <span className="flex items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-1 text-amber-200">
                  <Star className="h-3.5 w-3.5" /> Audience votes
                </span>
                <span className="flex items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-1 text-emerald-200">
                  <DollarSign className="h-3.5 w-3.5" /> Live tips
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
