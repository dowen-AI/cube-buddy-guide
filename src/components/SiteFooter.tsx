import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Link2, Printer, RotateCcw, Share2 } from 'lucide-react';

const SITE_URL = 'https://cube-buddy-guide.lovable.app/';
const SHARE_TEXT = "Learn to solve a Rubik's Cube one turn at a time, with a moving picture for every turn.";

const btn = 'flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-border bg-card px-5 text-base font-semibold text-foreground transition-colors hover:bg-muted';

export const SiteFooter = ({ onResetAll }: { onResetAll: () => void }) => {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(SITE_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt('Copy this link:', SITE_URL);
    }
  };
  const share = async () => {
    try {
      await navigator.share({ title: "Rubik's Cube Beginner's Guide", text: SHARE_TEXT, url: SITE_URL });
    } catch {
      // closed the share sheet: nothing to do
    }
  };

  return (
    <footer className="border-t border-border px-4 py-12 print:hidden">
      <div className="mx-auto max-w-2xl space-y-8 text-center">
        <div className="space-y-3">
          <h2 className="font-display text-xl font-bold text-foreground">Know someone with a cube in a drawer?</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {canShare ? <button type="button" onClick={share} className={btn} data-testid="share"><Share2 className="h-5 w-5" />Share this guide</button> : null}
            <button type="button" onClick={copyLink} className={btn} data-testid="copy-link">
              {copied ? <><Check className="h-5 w-5 text-cube-green" />Link copied</> : <><Link2 className="h-5 w-5" />Copy the link</>}
            </button>
            <button type="button" onClick={() => window.print()} className={btn} data-testid="print-cheat-sheet"><Printer className="h-5 w-5" />Print the cheat sheet</button>
          </div>
        </div>

        <div className="space-y-3">
          {confirming ? (
            <div className="space-y-3 rounded-xl border-2 border-destructive/40 bg-destructive/5 p-4" role="alertdialog" aria-label="Reset all my progress">
              <p className="text-base font-semibold text-foreground">Start over from nothing?</p>
              <p className="text-base text-muted-foreground">This clears your finished stages, your place inside each stage, and the cube you painted in the solver. It cannot be undone.</p>
              <div className="flex flex-wrap justify-center gap-3">
                <button type="button" onClick={() => { setConfirming(false); onResetAll(); }} className="flex min-h-14 items-center justify-center rounded-xl bg-destructive px-5 text-base font-semibold text-destructive-foreground" data-testid="reset-confirm">Yes, reset everything</button>
                <button type="button" onClick={() => setConfirming(false)} className={btn}>Keep my progress</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className={`${btn} mx-auto`} data-testid="reset-all"><RotateCcw className="h-5 w-5" />Start over / Reset all my progress</button>
          )}
        </div>

        <nav aria-label="About this site" className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-base">
          <Link to="/about" className="flex min-h-14 items-center font-medium text-primary underline underline-offset-4">About</Link>
          <Link to="/privacy" className="flex min-h-14 items-center font-medium text-primary underline underline-offset-4">Privacy</Link>
        </nav>
        <p className="text-base text-muted-foreground">Built with ❤️ to help everyone solve the Rubik's Cube. Free. No sign-up.</p>
      </div>
    </footer>
  );
};
