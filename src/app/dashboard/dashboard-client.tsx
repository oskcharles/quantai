"use client";

import { useCallback, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { BROKER_PLATFORMS, CONNECTION_ROLES, TRADE_SIDES } from "@/lib/constants";

type Connection = {
  id: string;
  label: string;
  platform: string;
  role: string;
  accountId: string;
  balance: number;
  equity: number;
  active: boolean;
};

type CopyLink = {
  id: string;
  masterId: string;
  followerId: string;
  riskMultiplier: number;
  maxLotSize: number | null;
  reverseCopy: boolean;
  symbolWhitelist: string | null;
  active: boolean;
  master: Connection;
  follower: Connection;
};

type Trade = {
  id: string;
  ticketId: string;
  symbol: string;
  side: string;
  volume: number;
  openPrice: number;
  closePrice: number | null;
  status: string;
  connection: Connection;
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data as T;
}

export default function DashboardClient({ userName }: { userName: string }) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [links, setLinks] = useState<CopyLink[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tickLog, setTickLog] = useState<string[]>([]);
  const [ticking, setTicking] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [c, l, t] = await Promise.all([
        api<Connection[]>("/api/connections"),
        api<CopyLink[]>("/api/copy-links"),
        api<Trade[]>("/api/trades"),
      ]);
      setConnections(c);
      setLinks(l);
      setTrades(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    refresh();
  }, [refresh]);

  const masters = connections.filter((c) => c.role === "MASTER");
  const followers = connections.filter((c) => c.role === "FOLLOWER");

  async function handleTick() {
    setTicking(true);
    setError(null);
    try {
      const { results } = await api<{ results: { action: string; detail: string }[] }>(
        "/api/engine/tick",
        { method: "POST" },
      );
      setTickLog(
        results.length
          ? results.map((r) => `${r.action}: ${r.detail}`)
          : ["No new trades to copy."],
      );
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setTicking(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl flex-1 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">Signed in as</p>
          <h1 className="text-xl font-semibold">{userName}</h1>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="rounded-md border border-slate-700 px-4 py-2 text-sm hover:border-slate-500"
        >
          Sign out
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-900 bg-red-950/50 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <section className="mt-8 flex items-center justify-between rounded-lg border border-emerald-900 bg-emerald-950/30 px-5 py-4">
        <div>
          <h2 className="font-semibold text-emerald-300">Copy engine</h2>
          <p className="text-sm text-slate-400">
            Runs a tick that mirrors any new open master trades to their followers, and closes
            copies whose source trade has closed.
          </p>
        </div>
        <button
          onClick={handleTick}
          disabled={ticking}
          className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
        >
          {ticking ? "Running..." : "Run copy engine now"}
        </button>
      </section>
      {tickLog.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-slate-400">
          {tickLog.map((l, i) => (
            <li key={i}>• {l}</li>
          ))}
        </ul>
      )}

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <ConnectionsPanel connections={connections} onChange={refresh} onError={setError} />
        <CopyLinksPanel
          links={links}
          masters={masters}
          followers={followers}
          onChange={refresh}
          onError={setError}
        />
      </div>

      <div className="mt-10">
        <TradesPanel trades={trades} masters={masters} onChange={refresh} onError={setError} />
      </div>
    </main>
  );
}

function ConnectionsPanel({
  connections,
  onChange,
  onError,
}: {
  connections: Connection[];
  onChange: () => void;
  onError: (e: string | null) => void;
}) {
  const [label, setLabel] = useState("");
  const [platform, setPlatform] = useState<(typeof BROKER_PLATFORMS)[number]>("PAPER");
  const [role, setRole] = useState<(typeof CONNECTION_ROLES)[number]>("MASTER");
  const [accountId, setAccountId] = useState("");
  const [server, setServer] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    onError(null);
    try {
      await api("/api/connections", {
        method: "POST",
        body: JSON.stringify({
          label,
          platform,
          role,
          accountId,
          server: server || undefined,
          apiKey: apiKey || undefined,
        }),
      });
      setLabel("");
      setAccountId("");
      setServer("");
      setApiKey("");
      onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    onError(null);
    try {
      await api(`/api/connections/${id}`, { method: "DELETE" });
      onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-5">
      <h2 className="font-semibold">Trading accounts</h2>
      <p className="mt-1 text-sm text-slate-400">
        Add a master account to trade on, and follower accounts to mirror trades onto.
      </p>

      <ul className="mt-4 space-y-2">
        {connections.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm"
          >
            <div>
              <span className="font-medium">{c.label}</span>{" "}
              <span className="text-slate-500">
                · {c.platform} · {c.role} · #{c.accountId}
              </span>
              <div className="text-xs text-slate-500">
                Balance ${c.balance.toLocaleString()} · Equity ${c.equity.toLocaleString()}
              </div>
            </div>
            <button
              onClick={() => handleDelete(c.id)}
              className="text-xs text-red-400 hover:underline"
            >
              Remove
            </button>
          </li>
        ))}
        {connections.length === 0 && (
          <li className="text-sm text-slate-500">No accounts yet.</li>
        )}
      </ul>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3 border-t border-slate-800 pt-4">
        <div className="grid grid-cols-2 gap-3">
          <input
            required
            placeholder="Label (e.g. My MT5 Master)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="col-span-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as typeof platform)}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          >
            {BROKER_PLATFORMS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          >
            {CONNECTION_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <input
            required
            placeholder="Account ID"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="col-span-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          {platform !== "PAPER" && (
            <>
              <input
                placeholder="Server"
                value={server}
                onChange={(e) => setServer(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
              <input
                placeholder="API key / token"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </>
          )}
        </div>
        {platform !== "PAPER" && (
          <p className="text-xs text-amber-400">
            Live {platform} trading isn&apos;t wired up in this environment yet — the connection
            will save, but placing trades on it will report a clear &quot;not implemented&quot;
            error until a real {platform} adapter is added.
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-white disabled:opacity-60"
        >
          {submitting ? "Adding..." : "Add account"}
        </button>
      </form>
    </section>
  );
}

function CopyLinksPanel({
  links,
  masters,
  followers,
  onChange,
  onError,
}: {
  links: CopyLink[];
  masters: Connection[];
  followers: Connection[];
  onChange: () => void;
  onError: (e: string | null) => void;
}) {
  const [masterId, setMasterId] = useState("");
  const [followerId, setFollowerId] = useState("");
  const [riskMultiplier, setRiskMultiplier] = useState("1");
  const [maxLotSize, setMaxLotSize] = useState("");
  const [reverseCopy, setReverseCopy] = useState(false);
  const [symbolWhitelist, setSymbolWhitelist] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!masterId || !followerId) {
      onError("Choose a master and a follower account");
      return;
    }
    setSubmitting(true);
    onError(null);
    try {
      await api("/api/copy-links", {
        method: "POST",
        body: JSON.stringify({
          masterId,
          followerId,
          riskMultiplier: Number(riskMultiplier) || 1,
          maxLotSize: maxLotSize ? Number(maxLotSize) : undefined,
          reverseCopy,
          symbolWhitelist: symbolWhitelist || undefined,
        }),
      });
      setMaxLotSize("");
      setSymbolWhitelist("");
      onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(link: CopyLink) {
    onError(null);
    try {
      await api(`/api/copy-links/${link.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !link.active }),
      });
      onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleDelete(id: string) {
    onError(null);
    try {
      await api(`/api/copy-links/${id}`, { method: "DELETE" });
      onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-5">
      <h2 className="font-semibold">Copy links</h2>
      <p className="mt-1 text-sm text-slate-400">
        Link a master to a follower and set how trades should be scaled.
      </p>

      <ul className="mt-4 space-y-2">
        {links.map((l) => (
          <li
            key={l.id}
            className="rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm"
          >
            <div className="flex items-center justify-between">
              <span>
                <span className="font-medium">{l.master.label}</span>
                <span className="text-slate-500"> → </span>
                <span className="font-medium">{l.follower.label}</span>
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleActive(l)}
                  className={`text-xs ${l.active ? "text-emerald-400" : "text-slate-500"}`}
                >
                  {l.active ? "Active" : "Paused"}
                </button>
                <button
                  onClick={() => handleDelete(l.id)}
                  className="text-xs text-red-400 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {l.riskMultiplier}x risk
              {l.maxLotSize ? ` · max ${l.maxLotSize} lots` : ""}
              {l.reverseCopy ? " · reverse copy" : ""}
              {l.symbolWhitelist ? ` · symbols: ${l.symbolWhitelist}` : ""}
            </div>
          </li>
        ))}
        {links.length === 0 && <li className="text-sm text-slate-500">No copy links yet.</li>}
      </ul>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3 border-t border-slate-800 pt-4">
        <div className="grid grid-cols-2 gap-3">
          <select
            required
            value={masterId}
            onChange={(e) => setMasterId(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          >
            <option value="">Master account</option>
            {masters.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          <select
            required
            value={followerId}
            onChange={(e) => setFollowerId(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          >
            <option value="">Follower account</option>
            {followers.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
          <input
            type="number"
            step="0.1"
            min="0.1"
            placeholder="Risk multiplier"
            value={riskMultiplier}
            onChange={(e) => setRiskMultiplier(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Max lot size (optional)"
            value={maxLotSize}
            onChange={(e) => setMaxLotSize(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <input
            placeholder="Symbol whitelist (optional, e.g. EURUSD,XAUUSD)"
            value={symbolWhitelist}
            onChange={(e) => setSymbolWhitelist(e.target.value)}
            className="col-span-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <label className="col-span-2 flex items-center gap-2 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={reverseCopy}
              onChange={(e) => setReverseCopy(e.target.checked)}
            />
            Reverse copy (mirror opposite side)
          </label>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-white disabled:opacity-60"
        >
          {submitting ? "Linking..." : "Create copy link"}
        </button>
      </form>
    </section>
  );
}

function TradesPanel({
  trades,
  masters,
  onChange,
  onError,
}: {
  trades: Trade[];
  masters: Connection[];
  onChange: () => void;
  onError: (e: string | null) => void;
}) {
  const [connectionId, setConnectionId] = useState("");
  const [symbol, setSymbol] = useState("EURUSD");
  const [side, setSide] = useState<(typeof TRADE_SIDES)[number]>("BUY");
  const [volume, setVolume] = useState("1");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!connectionId) {
      onError("Choose a master account to trade on");
      return;
    }
    setSubmitting(true);
    onError(null);
    try {
      await api("/api/trades/simulate", {
        method: "POST",
        body: JSON.stringify({
          connectionId,
          symbol: symbol.toUpperCase(),
          side,
          volume: Number(volume) || 1,
        }),
      });
      onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClose(id: string) {
    onError(null);
    try {
      await api(`/api/trades/${id}/close`, { method: "POST" });
      onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-5">
      <h2 className="font-semibold">Trades</h2>
      <p className="mt-1 text-sm text-slate-400">
        Open a trade on a master account, then run the copy engine to mirror it to followers.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <select
          required
          value={connectionId}
          onChange={(e) => setConnectionId(e.target.value)}
          className="col-span-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm sm:col-span-1"
        >
          <option value="">Master account</option>
          {masters.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="Symbol"
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
        />
        <select
          value={side}
          onChange={(e) => setSide(e.target.value as typeof side)}
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
        >
          {TRADE_SIDES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={volume}
          onChange={(e) => setVolume(e.target.value)}
          placeholder="Volume"
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
        >
          {submitting ? "Opening..." : "Open trade"}
        </button>
      </form>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="pb-2">Account</th>
              <th className="pb-2">Symbol</th>
              <th className="pb-2">Side</th>
              <th className="pb-2">Volume</th>
              <th className="pb-2">Open</th>
              <th className="pb-2">Close</th>
              <th className="pb-2">Status</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => (
              <tr key={t.id} className="border-t border-slate-800">
                <td className="py-2">
                  {t.connection.label}
                  <span className="ml-1 text-xs text-slate-500">({t.connection.role})</span>
                </td>
                <td className="py-2">{t.symbol}</td>
                <td className={`py-2 ${t.side === "BUY" ? "text-emerald-400" : "text-red-400"}`}>
                  {t.side}
                </td>
                <td className="py-2">{t.volume}</td>
                <td className="py-2">{t.openPrice}</td>
                <td className="py-2">{t.closePrice ?? "—"}</td>
                <td className="py-2">{t.status}</td>
                <td className="py-2">
                  {t.status === "OPEN" && (
                    <button
                      onClick={() => handleClose(t.id)}
                      className="text-xs text-slate-300 hover:underline"
                    >
                      Close
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {trades.length === 0 && (
              <tr>
                <td colSpan={8} className="py-4 text-center text-slate-500">
                  No trades yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
