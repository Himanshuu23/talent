import { Eye, Mic, Crown } from "lucide-react";

const roles = [
  {
    icon: Crown,
    name: "Host",
    tag: "Creates the room",
    points: [
      "Starts and ends each performance",
      "Scores the act and sees the average",
      "Promotes a co-host, closes the room",
      "On camera with the performers",
    ],
  },
  {
    icon: Mic,
    name: "Performer",
    tag: "Joins with the room code",
    points: [
      "Joins the queue and waits for their turn",
      "Camera and mic go live on stage",
      "Backstage chat with hosts and performers",
      "Shares socials and a demo link",
    ],
  },
  {
    icon: Eye,
    name: "Viewer",
    tag: "Watches for free",
    points: [
      "Watches the act on stage",
      "Votes 1–10 for the performer",
      "Sends cheers and tips",
      "No camera or account needed",
    ],
  },
];

export default function Roles() {
  return (
    <section id="roles" className="scroll-mt-16 border-t border-white/5 bg-zinc-950 px-5 py-24 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-400">Roles</p>
        <h2 className="mt-3 max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Three roles, each with exactly the controls they need.
        </h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {roles.map((role) => (
            <article key={role.name} className="rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 p-7">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 text-zinc-950">
                  <role.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold">{role.name}</h3>
                  <p className="text-xs text-zinc-500">{role.tag}</p>
                </div>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-zinc-300">
                {role.points.map((point) => (
                  <li key={point} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
