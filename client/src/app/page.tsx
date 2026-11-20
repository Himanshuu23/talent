import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Roles from "@/components/Roles";
import HowItWorks from "@/components/HowItWorks";

export default function Home() {
  return (
    <div className="bg-black">
      <Hero />
      <Features />
      <Roles />
      <HowItWorks />
      <footer className="border-t border-white/5 bg-black px-6 py-10 text-center text-sm text-zinc-500">
        <p className="font-medium text-zinc-300">
          Talent<span className="text-zinc-500">.live</span>
        </p>
        <p className="mt-2">Real-time talent shows with live video, voting, cheers and tips.</p>
      </footer>
    </div>
  );
}
