/**
 * $SALVAZION as an access key to Premium in Kaenz (phase 1).
 *
 * The rule is a count of tokens on the wallet saved in Account
 * (SALVAZION_KEY_MIN_TOKENS, default 1). It is not a USD value: no price,
 * no Jupiter, no oracle.
 *
 * Mint: Salvazion-Inc/salvazion `lib/solana/config.ts` (the mint used by
 * salvazion.org PR #13 / wallet_holder_links). Override with SALVAZION_MINT.
 * Token-2022, 6 decimals.
 *
 * Fail closed: a missing flag, a bad address, or any RPC failure is not Premium.
 * SALVAZION_KEY_ENABLED must be exactly "1". Anything else leaves the feature off.
 */

/** Same base58 check as isSolanaWallet in lib/listings.ts (32–44 chars, no 0/O/I/l). */
export function isHolderWalletAddress(value: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value.trim());
}

/** Token-2022 program. Classic SPL accounts for this mint are ignored. */
export const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

export const SALVAZION_DECIMALS = 6;

/** Default $SALVAZION mint from Salvazion-Inc/salvazion (PR #13). */
export const SALVAZION_MINT_DEFAULT =
  "2XALhxGKCr2zCADkMANBq3b6rV7Zv5QF6RVZokgEAfUM";

const PUBLIC_MAINNET_RPC = "https://api.mainnet-beta.solana.com";

export type SalvazionKeyReason =
  | "disabled"
  | "no_wallet"
  | "invalid_wallet"
  | "rpc_unavailable"
  | "no_balance"
  | "below_threshold"
  | "holder";

export type SalvazionKeyDecision = {
  premium: boolean;
  reason: SalvazionKeyReason;
};

type Env = Record<string, string | undefined>;

export function salvazionKeyEnabled(env: Env = process.env): boolean {
  return env.SALVAZION_KEY_ENABLED === "1";
}

/** Token quantity required. Non-numeric or negative values fall back to 1. */
export function salvazionMinTokens(env: Env = process.env): number {
  const raw = env.SALVAZION_KEY_MIN_TOKENS;
  if (raw === undefined || String(raw).trim() === "") return 1;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 1;
  return n;
}

export function salvazionMint(env: Env = process.env): string {
  const raw = (env.SALVAZION_MINT || "").trim();
  return raw || SALVAZION_MINT_DEFAULT;
}

export function salvazionRpcUrl(env: Env = process.env): string {
  return (
    (env.SOLANA_RPC_URL || "").trim() ||
    (env.NEXT_PUBLIC_SOLANA_RPC_URL || "").trim() ||
    PUBLIC_MAINNET_RPC
  );
}

/**
 * Pure access rule. `balanceUi` is the on-chain quantity in whole tokens
 * (6 decimals already applied). `null` means the read failed.
 */
export function evaluateSalvazionKey(input: {
  enabled: boolean;
  wallet: string;
  balanceUi: number | null;
  minTokens: number;
}): SalvazionKeyDecision {
  if (!input.enabled) return { premium: false, reason: "disabled" };

  const wallet = input.wallet.trim();
  if (!wallet) return { premium: false, reason: "no_wallet" };
  if (!isHolderWalletAddress(wallet)) return { premium: false, reason: "invalid_wallet" };

  const min =
    Number.isFinite(input.minTokens) && input.minTokens >= 0 ? input.minTokens : 1;
  const balance = input.balanceUi;
  if (balance === null || !Number.isFinite(balance) || balance < 0) {
    return { premium: false, reason: "rpc_unavailable" };
  }
  if (balance <= 0) return { premium: false, reason: "no_balance" };
  if (balance < min) return { premium: false, reason: "below_threshold" };
  return { premium: true, reason: "holder" };
}

/** One jsonParsed account from getTokenAccountsByOwner. */
export type ParsedTokenAccount = {
  account?: {
    owner?: string;
    data?: {
      parsed?: {
        info?: {
          mint?: string;
          tokenAmount?: { amount?: string; decimals?: number };
        };
      };
    };
  };
};

/** Sum Token-2022 balances of `mint` and return the UI amount. */
export function sumMintBalanceUi(
  accounts: ParsedTokenAccount[],
  mint = SALVAZION_MINT_DEFAULT,
  decimals = SALVAZION_DECIMALS,
): number {
  let total = BigInt(0);
  for (const acc of accounts) {
    if (acc?.account?.owner !== TOKEN_2022_PROGRAM_ID) continue;
    const info = acc.account?.data?.parsed?.info;
    if (!info || info.mint !== mint) continue;
    const amount = info.tokenAmount?.amount;
    if (typeof amount !== "string" || !/^\d+$/.test(amount)) continue;
    total += BigInt(amount);
  }
  const base = BigInt(10) ** BigInt(decimals);
  const whole = total / base;
  const frac = total % base;
  return Number(whole) + Number(frac) / Number(base);
}

export type SalvazionBalanceRead = {
  mint?: string;
  rpcUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

/**
 * getTokenAccountsByOwner for the $SALVAZION mint.
 * Returns null on any failure (HTTP, RPC error, timeout, bad shape) so the
 * caller fails closed. An empty account list is a real zero, not a failure.
 */
export async function fetchSalvazionBalance(
  wallet: string,
  options: SalvazionBalanceRead = {},
): Promise<number | null> {
  const mint = options.mint || salvazionMint();
  const rpcUrl = options.rpcUrl || salvazionRpcUrl();
  const fetchImpl = options.fetchImpl ?? fetch;
  try {
    const res = await fetchImpl(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountsByOwner",
        params: [
          wallet,
          { mint },
          { encoding: "jsonParsed", commitment: "confirmed" },
        ],
      }),
      signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      result?: { value?: ParsedTokenAccount[] };
      error?: unknown;
    };
    if (json.error || !Array.isArray(json.result?.value)) return null;
    return sumMintBalanceUi(json.result.value, mint);
  } catch {
    return null;
  }
}

/**
 * Flag, then address, then chain read. RPC runs only for an enabled, valid wallet.
 */
export async function resolveHolderKey(
  wallet: string,
  options: SalvazionBalanceRead & { env?: Env } = {},
): Promise<SalvazionKeyDecision> {
  const env = options.env ?? process.env;
  const enabled = salvazionKeyEnabled(env);
  const minTokens = salvazionMinTokens(env);
  const trimmed = wallet.trim();
  if (!enabled || !trimmed || !isHolderWalletAddress(trimmed)) {
    return evaluateSalvazionKey({
      enabled,
      wallet: trimmed,
      balanceUi: null,
      minTokens,
    });
  }
  const balanceUi = await fetchSalvazionBalance(trimmed, options);
  return evaluateSalvazionKey({
    enabled,
    wallet: trimmed,
    balanceUi,
    minTokens,
  });
}
