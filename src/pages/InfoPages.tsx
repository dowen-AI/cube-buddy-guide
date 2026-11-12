import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Shell = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <main className="min-h-screen bg-background px-4 py-10">
    <Helmet><title>{title} — Rubik's Cube Beginner's Guide</title></Helmet>
    <article className="mx-auto max-w-2xl space-y-5 text-base leading-relaxed text-foreground">
      <Link to="/" className="inline-flex min-h-14 items-center gap-2 font-semibold text-primary"><ArrowLeft className="h-5 w-5" />Back to the guide</Link>
      <h1 className="font-display text-3xl font-bold">{title}</h1>
      {children}
    </article>
  </main>
);

export const About = () => (
  <Shell title="About this guide">
    <p>This is a free guide that teaches a complete beginner to solve a standard 3×3 Rubik's Cube. You hold your own cube, the guide shows one turn at a time with a moving picture, and you tap when you have done it.</p>
    <h2 className="font-display text-xl font-bold">How it teaches</h2>
    <ul className="list-disc space-y-2 pl-6">
      <li>The solve is split into 7 stages, bottom layer first, then the middle, then the top. This is called the layer-by-layer method.</li>
      <li>Yellow stays on top and white on the bottom the whole time. You never have to flip the cube over.</li>
      <li>Every set of turns the guide teaches is checked by a program that scrambles hundreds of cubes and follows the guide's own screens until each one is solved.</li>
      <li>If you make a wrong turn, "I messed up" walks your real cube back one turn at a time.</li>
    </ul>
    <h2 className="font-display text-xl font-bold">The solver</h2>
    <p>"Just solve my cube for me" lets you copy your cube's colors into the page. It then works out a short solution and plays it one turn at a time. The search uses Herbert Kociemba's two-phase method through the open-source cubejs library.</p>
    <h2 className="font-display text-xl font-bold">Cost</h2>
    <p>Free. There is no sign-up, no paywall and no advertising.</p>
  </Shell>
);

export const Privacy = () => (
  <Shell title="Privacy">
    <p>Short version: this site does not ask who you are and has no accounts.</p>
    <h2 className="font-display text-xl font-bold">What is saved, and where</h2>
    <ul className="list-disc space-y-2 pl-6">
      <li>Your progress (finished stages, your place inside a stage, the cube you painted, and options such as dark mode or big text) is saved <strong>only in this browser on this device</strong>. It is never sent to us.</li>
      <li>"Start over / Reset all my progress" at the bottom of the home page erases it. Clearing your browser data does the same.</li>
    </ul>
    <h2 className="font-display text-xl font-bold">What we do not collect</h2>
    <p>No name, no email address, no payment details. The "Listen" button uses the voice built into your own device.</p>
    <h2 className="font-display text-xl font-bold">Hosting</h2>
    <p>The site is hosted by Lovable. Like most web hosts, the hosting service may record basic, anonymous visit statistics such as which pages were opened, the type of device and the country.</p>
    <h2 className="font-display text-xl font-bold">Children</h2>
    <p>The guide is suitable for children and does not ask them for any information.</p>
  </Shell>
);
