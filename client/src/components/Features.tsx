import { Clapperboard, DoorOpen, Gavel, ListOrdered, MessageSquare, ShieldCheck, Timer, Wallet } from "lucide-react";

const features = [
  {
    icon: DoorOpen,
    title: "Rooms in seconds",
    copy: "Name your show, pick a category and share a 6-character code or invite link. Viewers can also find live rooms by name.",
  },
  {
    icon: Clapperboard,
    title: "Live stage video",
    copy: "Hosts and performers share a WebRTC video mesh. The act on stage is what the audience sees and hears.",
  },
  {
    icon: ListOrdered,
    title: "Performer queue",
    copy: "Performers line up from their phone or laptop. The host starts the next act with one click.",
  },
  {
    icon: Timer,
    title: "Auto-timed sets",
    copy: "Choose the time per performer when you create the room. When time is up the act ends and the next one is ready.",
  },
  {
    icon: Gavel,
    title: "Votes and scores",
    copy: "Viewers rate 1–10. Hosts add a judge score. The overall score and a results board update live.",
  },
  {
    icon: Wallet,
    title: "Cheers and tips",
    copy: "Send a cheer that pops up on stage, or tip the performer. Totals are tracked per performer in the room.",
  },
  {
    icon: MessageSquare,
    title: "Backstage chat",
    copy: "Hosts and performers get a private text chat so the stage stays focused. Viewers never see it.",
  },
  {
    icon: ShieldCheck,
    title: "Host controls",
    copy: "Promote a co-host, close the room, and keep admin rights safe — they can’t be claimed by other users.",
  },
];

export default function Features() {
  return (
    <section id="features" className="scroll-mt-16 bg-zinc-950 px-5 py-24 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Features</p>
        <h2 className="mt-3 max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Everything a live talent night needs, in one room.
        </h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 transition hover:border-white/15 hover:bg-white/[0.04]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white/[0.06] text-zinc-300">
                <feature.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{feature.copy}</p>
            </article>
          ))}
        </div>
        <p className="mt-6 text-xs text-zinc-500">
          Tips are tracked inside the room. Real payment processing is not connected in this version, so no money moves.
        </p>
      </div>
    </section>
  );
}
