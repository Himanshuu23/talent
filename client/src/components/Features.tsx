import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    copy: "Hosts and performers go on camera. The act on stage is what the audience sees and hears.",
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
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-400">Features</p>
        <h2 className="mt-3 max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Everything a live talent night needs, in one room.
        </h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="border-white/10 bg-zinc-900/50 shadow-none transition hover:border-amber-400/30 hover:bg-zinc-900"
            >
              <CardHeader>
                <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
                  <feature.icon className="h-5 w-5" />
                </span>
                <CardTitle className="text-base text-white">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="leading-6 text-zinc-400">{feature.copy}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
