import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Vercel delega deep links da SPA ao React Router", () => {
  const config = JSON.parse(fs.readFileSync("vercel.json", "utf8"));

  assert.equal(config.rewrites?.length, 1);
  assert.deepEqual(config.rewrites[0], {
    source: "/(.*)",
    destination: "/index.html",
  });
});
