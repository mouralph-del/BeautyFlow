import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route(/https:\/\/[^/]+\.supabase\.co\//, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
});

test("visitante navega por páginas públicas sem escrita", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("header")).toBeVisible();
  const mobileMenu = page.getByRole("button", { name: "Abrir menu" });
  if (await mobileMenu.isVisible()) await mobileMenu.click();
  await page.getByRole("link", { name: /serviços/i }).first().click();
  await expect(page).toHaveURL(/\/servicos$/);
  await page.goto("/recuperar-senha");
  await expect(page.getByRole("heading", { name: "Esqueceu sua senha?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Receber e-mail" })).toBeVisible();
});

test("visitante não acessa painel administrativo", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/entrar$/);
});

test("contato exibe e permite usar o e-mail público em desktop e celular", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/contato");

    const email = "Thaisfonsecadossantos18@gmail.com";
    await expect(page.getByText(email, { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Enviar e-mail" })).toHaveAttribute("href", `mailto:${email}`);
    await page.getByRole("button", { name: "Copiar endereço" }).click();
    await expect(page.getByRole("button", { name: "E-mail copiado" })).toBeVisible();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(email);
  }
});

test("rota inexistente apresenta página 404 acolhedora", async ({ page }) => {
  await page.goto("/pagina-que-nao-existe");
  await expect(page.getByRole("heading", { name: "Ops! Não encontramos essa página." })).toBeVisible();
  await expect(page.getByRole("link", { name: /Voltar ao início/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Entrar na minha conta/i })).toBeVisible();
});

test("login permite lembrar somente o e-mail", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByRole("textbox", { name: "E-mail", exact: true }).fill("cliente.teste@example.invalid");
  await page.getByLabel("Lembrar meu e-mail").check();
  await page.evaluate(() => localStorage.setItem("beauty-studio-remembered-email", "cliente.teste@example.invalid"));
  await page.reload();
  await expect(page.getByRole("textbox", { name: "E-mail", exact: true })).toHaveValue("cliente.teste@example.invalid");
  const storage = await page.evaluate(() => ({ ...localStorage }));
  expect(Object.keys(storage)).toEqual(["beauty-studio-remembered-email"]);
  expect(JSON.stringify(storage)).not.toContain("password");
});

for (const [width, height] of [[360,640],[390,844],[430,932],[768,1024],[820,1180],[1024,768],[1366,768],[1920,1080]]) {
  test(`páginas críticas não têm rolagem horizontal em ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    for (const route of ["/entrar", "/recuperar-senha", "/contato", "/agendamento/1", "/pagina-que-nao-existe"]) {
      await page.goto(route);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${route} excedeu a viewport`).toBeLessThanOrEqual(1);
    }
  });
}
