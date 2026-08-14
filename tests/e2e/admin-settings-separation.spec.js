import { expect, test } from "@playwright/test";

const mobileSizes = [{ width:360,height:640 },{ width:390,height:844 },{ width:430,height:932 }];
const largerSizes = [{ width:768,height:1024 },{ width:820,height:1180 },{ width:1024,height:768 },{ width:1366,height:768 },{ width:1920,height:1080 }];
const settings = {
  studio: { public_data: { studio_name:"Studio", professional_name:"Profissional", site:{} }, private_data: { full_address:"privado", integration_status:{} } },
  schedule: { settings: { days:{}, slot_interval:30, minimum_duration:30, future_months:2 } },
  policies: [], notifications: [], templates: [], admins: [],
};
const preference = { admin_user_id:"00000000-0000-4000-8000-000000000001", panel_notifications_enabled:true, email_notifications_enabled:false, is_active:true, show_daily_verse:true, daily_summary_email_enabled:false, end_of_day_email_enabled:false, show_closing_message:true };

const token = (payload) => {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg:"none",typ:"JWT" })}.${encode(payload)}.`;
};
async function prepare(page) {
  await page.addInitScript(({ session }) => sessionStorage.setItem("sb-uckezdozxfnctorbhwfh-auth-token", JSON.stringify(session)), { session:{ access_token:token({ exp:Math.floor(Date.now()/1000)+3600,role:"authenticated" }),refresh_token:"e2e-refresh",expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:"bearer",user:{ id:preference.admin_user_id,email:"admin@example.invalid",app_metadata:{role:"admin"},user_metadata:{name:"Administradora"} } } });
  await page.route(/https:\/\/[^/]+\.supabase\.co\//, (route) => {
    const url = route.request().url();
    const body = url.includes("admin_get_settings") ? settings : url.includes("admin_notification_preferences") ? [preference] : {};
    return route.fulfill({ status:200,contentType:"application/json",body:JSON.stringify(body) });
  });
}
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth-document.documentElement.clientWidth);

test("conta e site permanecem separados e responsivos", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await prepare(page);
  const sizes = testInfo.project.name === "chromium-mobile" ? mobileSizes : largerSizes;
  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.goto("/admin/configuracoes");
    await expect(page.getByRole("heading", { name:"Configurações da minha conta" })).toBeVisible();
    await expect(page.getByRole("button", { name:"Minha conta", exact:true })).toBeVisible();
    await expect(page.getByRole("button", { name:"Minhas preferências" })).toBeVisible();
    await expect(page.getByRole("button", { name:"Segurança" })).toBeVisible();
    await expect(page.getByRole("button", { name:"Perfil do estúdio" })).toHaveCount(0);
    expect(await overflow(page)).toBeLessThanOrEqual(1);

    await page.goto("/admin/configuracoes-site");
    await expect(page.getByRole("heading", { name:"Configurações do site" })).toBeVisible();
    await expect(page.getByRole("button", { name:"Perfil do estúdio" })).toBeVisible();
    await expect(page.getByRole("button", { name:"Minhas preferências" })).toHaveCount(0);
    await expect(page.getByRole("textbox", { name:"Endereço completo do atendimento" })).toBeAttached();
    expect(await overflow(page)).toBeLessThanOrEqual(1);
  }
});
