const steps = [
  {
    n: "01",
    title: "Create a room",
    copy: "Pick a category and how long each performer gets. Share the code or the invite link.",
  },
  {
    n: "02",
    title: "Fill the queue",
    copy: "Performers join, add their socials, and line up. You start the next act when you're ready.",
  },
  {
    n: "03",
    title: "Let the room react",
    copy: "Viewers watch the stage, vote 1–10, cheer and tip. Time runs out and the next act is up.",
  },
  {
    n: "04",
    title: "Crown the winner",
    copy: "The results board combines audience votes and your host score so you can call it live.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-16 border-t border-white/5 bg-black px-5 py-24 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">How it works</p>
        <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          From empty room to standing ovation
        </h2>
        <ol className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <li key={step.n} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
              <p className="font-mono text-xs text-zinc-500">{step.n}</p>
              <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{step.copy}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
