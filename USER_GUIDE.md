# CopyFlow — User Guide

CopyFlow mirrors trades from one master trading account to any number of
follower accounts, with per-follower risk controls.

## 1. Create your account

Go to the site and click **Get started free** (or **Sign up**). Enter a
name, email, and password. You're taken straight to the dashboard.

## 2. Add trading accounts

In the **Trading accounts** panel, add each account you want to use:

- **Label** — any name you'll recognize it by (e.g. "My MT5 Master").
- **Platform**:
  - **PAPER** — a built-in simulated broker. Fills instantly against a
    simulated price feed. No real account needed — use this to test the
    whole app, or as the landing spot for signals from TradingView.
  - **MT4 / MT5 / cTrader** — real broker platforms. You can add a
    connection for these today, but live order placement isn't wired up
    yet (see [Broker support](#broker-support) below) — you'll get a clear
    error if you try to trade on one before that's built.
- **Role**:
  - **MASTER** — the account you trade on (or that receives signals). Its
    trades get copied outward.
  - **FOLLOWER** — an account that mirrors a master's trades.
- **Account ID** — any identifier for your own reference (doesn't need to
  match a real broker account number for PAPER).
- **Server / API key** — only needed for MT4/MT5/cTrader connections.

You'll typically want at least one MASTER and one or more FOLLOWER
accounts.

## 3. Link a master to its followers

In the **Copy links** panel, choose a master and a follower, then set:

- **Risk multiplier** — scales the follower's trade size relative to the
  master's. `1` = same size, `0.5` = half size, `2` = double size.
- **Max lot size** *(optional)* — a hard cap on the follower's trade
  volume, regardless of the multiplier.
- **Symbol whitelist** *(optional)* — comma-separated symbols (e.g.
  `EURUSD,XAUUSD`). If set, only those symbols get copied; leave blank to
  copy everything.
- **Reverse copy** — mirrors the *opposite* side (master BUYs → follower
  SELLs). Off by default.

You can pause a copy link (toggle **Active/Paused**) or delete it at any
time — this doesn't affect trades already copied, only future ones.

## 4. Open trades

### Manually, from the dashboard

In the **Trades** panel, pick a master account, enter a symbol, side, and
volume, and click **Open trade**. This works on any master, but only
PAPER accounts actually fill right now.

### Automatically, from TradingView

If your strategy lives in TradingView, you can wire its alerts straight
into a master account instead of opening trades by hand:

1. In **Trading accounts**, find a MASTER connection and click
   **Set up TradingView webhook**. This generates a unique, secret webhook
   URL for that connection.
2. Click **Show TradingView webhook URL**, then **Copy**.
3. In TradingView, open your alert's settings and paste that URL into the
   **Webhook URL** field.
4. Set the alert's **message** to JSON in this shape:
   ```json
   {"symbol": "EURUSD", "side": "BUY", "volume": 1}
   ```
   `side` must be `BUY` or `SELL`. `volume` is optional (defaults to `1`).
5. Save the alert. When it fires, TradingView calls the webhook, which
   opens the trade on that master account — from there it copies to
   followers exactly like a manually-opened trade.

The webhook URL contains a secret token — anyone with that exact URL can
open trades on that master account, so treat it like a password. If it
leaks, click **Regenerate** to invalidate the old one and issue a new URL
(you'll need to update the TradingView alert with the new URL too), or
**Disable** to turn the webhook off entirely.

## 5. Run the copy engine

Trades don't copy themselves the instant they're opened — click
**Run copy engine now** at the top of the dashboard to trigger a copy
pass. It:

1. Finds every open master trade that hasn't been copied yet, scales it
   per each active copy link's settings, and opens it on the follower.
2. Closes any follower trade whose master trade has since closed.

The results are logged right below the button (e.g. "OPENED: BUY 1
EURUSD on Follower Paper"). Run it whenever you've opened or closed a
trade and want it reflected on followers — the TradingView webhook and
manual trades both feed into the same queue this checks.

## 6. Closing trades

Click **Close** next to any open trade in the Trades table. Closing a
master's trade doesn't automatically close the copies — run the copy
engine afterward to propagate the close to followers.

## Broker support

| Platform  | Status |
|-----------|--------|
| PAPER     | Fully working — simulated fills, used for all the flows above |
| MT4/MT5   | Connections can be created; live trading isn't implemented yet |
| cTrader   | Connections can be created; live trading isn't implemented yet |
| TradingView | Supported as a **signal source** via webhook (see §4) — it's not a broker, so it always trades through a PAPER (or, once built, a real) master account |

Adding real broker execution is a matter of implementing a new adapter
against the `BrokerAdapter` interface in `src/lib/brokers/` — nothing else
in the app needs to change once that exists.

## Troubleshooting

- **"not implemented" error when trading** — you tried to open a trade on
  an MT4/MT5/cTrader connection; live execution for that platform isn't
  built yet.
- **A copy link isn't copying anything** — check it's set to **Active**,
  that the symbol isn't excluded by a whitelist, and that you've clicked
  **Run copy engine now** since the trade was opened.
- **TradingView webhook returns 401** — the secret in the URL doesn't
  match, or the webhook was disabled/regenerated. Re-copy the current URL
  from the dashboard.
