import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  SALVAZION_MINT_DEFAULT,
  TOKEN_2022_PROGRAM_ID,
  evaluateSalvazionKey,
  fetchSalvazionBalance,
  resolveHolderKey,
  salvazionKeyEnabled,
  salvazionMinTokens,
  salvazionMint,
  sumMintBalanceUi,
  type ParsedTokenAccount,
} from "./salvazion-key.ts";

const WALLET = "So11111111111111111111111111111111111111112";
const MINT = SALVAZION_MINT_DEFAULT;

function account(
  amount: string,
  opts: { mint?: string; owner?: string } = {},
): ParsedTokenAccount {
  return {
    account: {
      owner: opts.owner ?? TOKEN_2022_PROGRAM_ID,
      data: {
        parsed: {
          info: {
            mint: opts.mint ?? MINT,
            tokenAmount: { amount, decimals: 6 },
          },
        },
      },
    },
  };
}

describe("evaluateSalvazionKey", () => {
  it("stays off unless the flag is exactly 1, even with a large balance", () => {
    assert.equal(salvazionKeyEnabled({}), false);
    assert.equal(salvazionKeyEnabled({ SALVAZION_KEY_ENABLED: "true" }), false);
    assert.equal(salvazionKeyEnabled({ SALVAZION_KEY_ENABLED: "0" }), false);
    assert.equal(salvazionKeyEnabled({ SALVAZION_KEY_ENABLED: "1" }), true);

    const off = evaluateSalvazionKey({
      enabled: false,
      wallet: WALLET,
      balanceUi: 1_000_000,
      minTokens: 1,
    });
    assert.deepEqual(off, { premium: false, reason: "disabled" });
  });

  it("treats an empty wallet as no key and never as a block", () => {
    assert.deepEqual(
      evaluateSalvazionKey({
        enabled: true,
        wallet: "   ",
        balanceUi: 5,
        minTokens: 1,
      }),
      { premium: false, reason: "no_wallet" },
    );
  });

  it("rejects a malformed address without reading a balance", () => {
    assert.deepEqual(
      evaluateSalvazionKey({
        enabled: true,
        wallet: "not-a-wallet",
        balanceUi: 5,
        minTokens: 1,
      }),
      { premium: false, reason: "invalid_wallet" },
    );
  });

  it("fails closed when the chain read is missing or not a number", () => {
    for (const balanceUi of [null, Number.NaN, Number.POSITIVE_INFINITY, -1]) {
      assert.deepEqual(
        evaluateSalvazionKey({
          enabled: true,
          wallet: WALLET,
          balanceUi,
          minTokens: 1,
        }),
        { premium: false, reason: "rpc_unavailable" },
      );
    }
  });

  it("requires at least the configured token quantity, default 1", () => {
    assert.equal(salvazionMinTokens({}), 1);
    assert.equal(salvazionMinTokens({ SALVAZION_KEY_MIN_TOKENS: "" }), 1);
    assert.equal(salvazionMinTokens({ SALVAZION_KEY_MIN_TOKENS: "nope" }), 1);
    assert.equal(salvazionMinTokens({ SALVAZION_KEY_MIN_TOKENS: "-3" }), 1);
    assert.equal(salvazionMinTokens({ SALVAZION_KEY_MIN_TOKENS: "2.5" }), 2.5);

    assert.deepEqual(
      evaluateSalvazionKey({
        enabled: true,
        wallet: WALLET,
        balanceUi: 0,
        minTokens: 1,
      }),
      { premium: false, reason: "no_balance" },
    );
    assert.deepEqual(
      evaluateSalvazionKey({
        enabled: true,
        wallet: WALLET,
        balanceUi: 0.5,
        minTokens: 1,
      }),
      { premium: false, reason: "below_threshold" },
    );
    assert.deepEqual(
      evaluateSalvazionKey({
        enabled: true,
        wallet: WALLET,
        balanceUi: 1,
        minTokens: 1,
      }),
      { premium: true, reason: "holder" },
    );
    assert.deepEqual(
      evaluateSalvazionKey({
        enabled: true,
        wallet: WALLET,
        balanceUi: 2,
        minTokens: 1,
      }),
      { premium: true, reason: "holder" },
    );
  });
});

describe("mint and token accounts", () => {
  it("uses the Salvazion mint and lets SALVAZION_MINT override it", () => {
    assert.equal(salvazionMint({}), SALVAZION_MINT_DEFAULT);
    assert.equal(
      salvazionMint({ SALVAZION_MINT: "  MintOverride111111111111111111111111111  " }),
      "MintOverride111111111111111111111111111",
    );
  });

  it("sums only Token-2022 accounts of this mint, in whole tokens", () => {
    const ui = sumMintBalanceUi([
      account("1000000"),
      account("500000"),
      account("9000000", { mint: "OtherMint111111111111111111111111111111111" }),
      account("8000000", { owner: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" }),
      account("not-a-number"),
    ]);
    assert.equal(ui, 1.5);
  });
});

describe("fetchSalvazionBalance", () => {
  function rpcFetch(payload: unknown, ok = true): typeof fetch {
    return (async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.method, "getTokenAccountsByOwner");
      assert.deepEqual(body.params[1], { mint: MINT });
      return {
        ok,
        status: ok ? 200 : 500,
        json: async () => payload,
      } as Response;
    }) as typeof fetch;
  }

  it("reads a holder balance of 1 token", async () => {
    const ui = await fetchSalvazionBalance(WALLET, {
      mint: MINT,
      rpcUrl: "https://rpc.test",
      fetchImpl: rpcFetch({
        result: { value: [account("1000000")] },
      }),
    });
    assert.equal(ui, 1);
  });

  it("returns 0 for an empty account list", async () => {
    const ui = await fetchSalvazionBalance(WALLET, {
      mint: MINT,
      rpcUrl: "https://rpc.test",
      fetchImpl: rpcFetch({ result: { value: [] } }),
    });
    assert.equal(ui, 0);
  });

  it("fails closed on HTTP errors, RPC errors, and thrown fetches", async () => {
    const http = await fetchSalvazionBalance(WALLET, {
      mint: MINT,
      rpcUrl: "https://rpc.test",
      fetchImpl: rpcFetch({ result: { value: [] } }, false),
    });
    assert.equal(http, null);

    const rpc = await fetchSalvazionBalance(WALLET, {
      mint: MINT,
      rpcUrl: "https://rpc.test",
      fetchImpl: rpcFetch({ error: { code: -32600, message: "nope" } }),
    });
    assert.equal(rpc, null);

    const thrown = await fetchSalvazionBalance(WALLET, {
      mint: MINT,
      rpcUrl: "https://rpc.test",
      fetchImpl: (async () => {
        throw new Error("timeout");
      }) as typeof fetch,
    });
    assert.equal(thrown, null);
  });
});

describe("resolveHolderKey", () => {
  it("does not call Solana when the flag is off or the wallet cannot be read", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      throw new Error("should not be called");
    }) as typeof fetch;

    const disabled = await resolveHolderKey(WALLET, {
      env: {},
      fetchImpl,
    });
    assert.deepEqual(disabled, { premium: false, reason: "disabled" });

    const invalid = await resolveHolderKey("nope", {
      env: { SALVAZION_KEY_ENABLED: "1" },
      fetchImpl,
    });
    assert.deepEqual(invalid, { premium: false, reason: "invalid_wallet" });
    assert.equal(calls, 0);
  });

  it("grants Premium only when the saved wallet holds enough tokens", async () => {
    const holder = await resolveHolderKey(WALLET, {
      env: { SALVAZION_KEY_ENABLED: "1", SALVAZION_KEY_MIN_TOKENS: "1" },
      mint: MINT,
      rpcUrl: "https://rpc.test",
      fetchImpl: (async () =>
        ({
          ok: true,
          json: async () => ({ result: { value: [account("2000000")] } }),
        }) as Response) as typeof fetch,
    });
    assert.deepEqual(holder, { premium: true, reason: "holder" });

    const empty = await resolveHolderKey(WALLET, {
      env: { SALVAZION_KEY_ENABLED: "1" },
      mint: MINT,
      rpcUrl: "https://rpc.test",
      fetchImpl: (async () =>
        ({
          ok: true,
          json: async () => ({ result: { value: [] } }),
        }) as Response) as typeof fetch,
    });
    assert.deepEqual(empty, { premium: false, reason: "no_balance" });
  });
});

describe("holder copy (C7)", () => {
  const forbidden =
    /\b(price|precio|prix|prezzo|preço|preco|value|valor|valeur|valore|return|retorno|rendement|rendimento|investment|investing|inversión|inversion|investimento|investissement|staking|stake|yield|usd|dollar|dólar|dolar|jupiter|oracle)\b/i;

  it("has an access-key line in EN, ES, FR, IT, and PT and nothing about price", () => {
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "app-copy.ts"),
      "utf8",
    );
    for (const key of ["holderTitle", "holderOn", "holderOff"] as const) {
      const values = [...src.matchAll(new RegExp(`${key}:\\s*"([^"]*)"`, "g"))].map(
        (match) => match[1],
      );
      assert.equal(values.length, 5, key);
      for (const value of values) {
        assert.doesNotMatch(value, forbidden, `${key}: ${value}`);
        assert.doesNotMatch(value, /\$|token/i, `${key}: ${value}`);
      }
    }
  });
});
