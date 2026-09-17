import Link from "next/link";

const features = [
  {
    title: "One master, unlimited followers",
    body: "Trade once on your master account and mirror it instantly across every connected follower account, scaled to each account's risk settings.",
  },
  {
    title: "Per-follower risk controls",
    body: "Set a lot multiplier, a max lot size cap, symbol whitelists, or even reverse-copy mode on every single copy link.",
  },
  {
    title: "Broker-agnostic engine",
    body: "Built on a broker adapter layer so MT4, MT5, and cTrader accounts all copy through the exact same engine as our built-in paper trading sandbox.",
  },
  {
    title: "Full trade audit trail",
    body: "Every copied trade is logged: source trade, follower fill price, multiplier applied, and status — pending, executed, failed, or closed.",
  },
];

const steps = [
  { n: "1", title: "Connect your master account", body: "Add the account you trade on. Start with our paper sandbox or connect a live broker." },
  { n: "2", title: "Add follower accounts", body: "Connect the accounts that should mirror your trades — your own, a client's, or a subscriber's." },
  { n: "3", title: "Set the copy rules", body: "Choose a risk multiplier, max lot size, and whether to reverse trades, per follower." },
  { n: "4", title: "Trade normally", body: "Every trade you open on the master gets mirrored automatically. Close it, and every copy closes too." },
];

export default function LandingPage() {
  return (
    <main className="flex-1">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="text-lg font-semibold tracking-tight">CopyFlow</span>
          <nav className="flex items-center gap-6 text-sm text-slate-300">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#how-it-works" className="hover:text-white">How it works</a>
            <Link href="/login" className="hover:text-white">Log in</Link>
            <Link
              href="/register"
              className="rounded-md bg-emerald-500 px-4 py-2 font-medium text-slate-950 hover:bg-emerald-400"
            >
              Get started free
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <p className="mb-4 inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
          Trade copying for traders, prop desks, and signal providers
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Copy your trades to every account, instantly.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
          CopyFlow mirrors positions from a master trading account to any number of follower
          accounts — with per-follower risk scaling, symbol filters, and a full audit trail.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/register"
            className="rounded-md bg-emerald-500 px-6 py-3 font-medium text-slate-950 hover:bg-emerald-400"
          >
            Start copying trades
          </Link>
          <a
            href="#how-it-works"
            className="rounded-md border border-slate-700 px-6 py-3 font-medium text-slate-200 hover:border-slate-500"
          >
            See how it works
          </a>
        </div>
      </section>

      <section id="features" className="border-t border-slate-800 bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-2xl font-semibold">Built for reliable, controllable copying</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} className="rounded-lg border border-slate-800 bg-slate-950/50 p-6">
                <h3 className="font-semibold text-slate-100">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-slate-800">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-2xl font-semibold">How it works</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.n}>
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 font-semibold text-slate-950">
                  {s.n}
                </div>
                <h3 className="font-semibold text-slate-100">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-800 bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <h2 className="text-2xl font-semibold">Ready to mirror your first trade?</h2>
          <p className="mt-3 text-slate-400">
            Spin up a free paper-trading sandbox in under a minute — no broker account required to try it.
          </p>
          <Link
            href="/register"
            className="mt-8 inline-block rounded-md bg-emerald-500 px-6 py-3 font-medium text-slate-950 hover:bg-emerald-400"
          >
            Create your account
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-800 py-8 text-center text-sm text-slate-500">
        CopyFlow — trade copying software.
      </footer>
    </main>
  );
}
