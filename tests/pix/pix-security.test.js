import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

async function sourceFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
    if (entry.isDirectory()) result.push(...await sourceFiles(path));
    else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) result.push(path);
  }
  return result;
}

test("frontend não contém service role nem armazenamento manual de senha", async () => {
  for (const file of await sourceFiles(new URL("../../src/", import.meta.url))) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|service_role/i);
    assert.doesNotMatch(source, /(localStorage|sessionStorage)[\s\S]{0,80}password|password[\s\S]{0,80}(localStorage|sessionStorage)/i);
  }
});

test("comprovantes usam URLs assinadas e .env permanece ignorado", async () => {
  const requests = await readFile(new URL("../../src/services/adminRequests.js", import.meta.url), "utf8");
  const gitignore = await readFile(new URL("../../.gitignore", import.meta.url), "utf8");
  assert.match(requests, /from\("payment-proofs"\)\s*\.createSignedUrl\(/);
  assert.match(gitignore, /^\.env$/m);
});
