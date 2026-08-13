import { expect, test } from "@playwright/test";

const sizes=[
  {width:360,height:640},{width:390,height:844},{width:768,height:1024},
  {width:820,height:1180},{width:1024,height:768},{width:1366,height:768},{width:1920,height:1080},
];

const token=(payload)=>{
  const encode=(value)=>Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({alg:"none",typ:"JWT"})}.${encode(payload)}.`;
};

async function prepareAdmin(page){
  await page.addInitScript(({storageKey,session})=>sessionStorage.setItem(storageKey,JSON.stringify(session)),{
    storageKey:"sb-uckezdozxfnctorbhwfh-auth-token",
    session:{access_token:token({exp:Math.floor(Date.now()/1000)+3600,role:"authenticated"}),refresh_token:"local",expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:"bearer",user:{id:"00000000-0000-4000-8000-000000000001",email:"admin@example.invalid",app_metadata:{role:"admin"},user_metadata:{name:"Administradora"}}},
  });
  await page.route("**/rest/v1/**",async(route)=>{
    const path=new URL(route.request().url()).pathname;
    if(path.endsWith("/rpc/get_admin_notification_center"))return route.fulfill({json:{items:[],unread_count:0}});
    if(path.endsWith("/rpc/admin_get_holidays"))return route.fulfill({json:[{id:"00000000-0000-4000-8000-000000000010",name:"Black Friday",holiday_date:"2026-11-27",scope:"personalizado",source:"commercial_catalog",commercial_key:"black_friday",admin_decision:"pending",is_active:true,appointment_count:0}]});
    return route.fulfill({json:[]});
  });
}

test("oportunidade comercial permanece acessível e sem overflow nas resoluções homologadas",async({page})=>{
  test.setTimeout(120_000);
  await prepareAdmin(page);
  for(const size of sizes){
    await page.setViewportSize(size);
    await page.goto("/admin/agenda");
    const card=page.locator(".holiday-list article").filter({hasText:"Black Friday"});
    await expect(card).toBeVisible();
    await expect(card.getByRole("button",{name:"Criar promoção"})).toBeVisible();
    await expect(card.getByRole("button",{name:"Revisar agenda"})).toBeVisible();
    await expect(card.getByRole("button",{name:"Dispensar"})).toBeVisible();
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
  await page.getByRole("button",{name:"Revisar agenda"}).click();
  await expect(page).toHaveURL(/\/admin\/agenda\?date=2026-11-27&view=day&holiday=/);
});
