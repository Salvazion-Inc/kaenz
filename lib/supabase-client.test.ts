import assert from "node:assert/strict";
import test from "node:test";
import { getSupabase } from "./supabase.ts";

const URL_KEY = "NEXT_PUBLIC_SUPABASE_URL";
const SERVICE_KEY = "SUPABASE_SERVICE_ROLE_KEY";
const ANON_KEY = "NEXT_PUBLIC_SUPABASE_ANON_KEY";
const ANON_SENTINEL = "anon-key-must-not-be-used";

function withEnv(
  values: Record<string, string | undefined>,
  fn: () => void,
) {
  const keys = [URL_KEY, SERVICE_KEY, ANON_KEY];
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) {
    const value = values[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    fn();
  } finally {
    for (const key of keys) {
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("getSupabase uses the service role and does not fall back to the anon key", () => {
  withEnv(
    {
      [URL_KEY]: "https://example.supabase.co",
      [SERVICE_KEY]: "test-service-role",
      [ANON_KEY]: ANON_SENTINEL,
    },
    () => {
      assert.ok(getSupabase());
    },
  );

  const errors: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    errors.push(args.map((arg) => String(arg)).join(" "));
  };
  try {
    withEnv(
      {
        [URL_KEY]: "https://example.supabase.co",
        [SERVICE_KEY]: undefined,
        [ANON_KEY]: ANON_SENTINEL,
      },
      () => {
        assert.equal(getSupabase(), null);
        assert.equal(getSupabase(), null);
      },
    );
  } finally {
    console.error = original;
  }

  assert.equal(errors.length, 1);
  assert.match(errors[0], /SUPABASE_SERVICE_ROLE_KEY is missing/);
  assert.match(errors[0], /will not fall back to the anon key/);
  assert.equal(errors[0].includes(ANON_SENTINEL), false);
});
