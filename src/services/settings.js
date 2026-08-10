import { supabase } from "../lib/supabase";

export const DEFAULT_PUBLIC_SETTINGS = {
  studio: {
    studio_name: "Thaís Santos Beauty Studio", professional_name: "Thaís Santos",
    tagline: "Beleza com cuidado e naturalidade", description: "", contact_email: "Thaisfonsecadossantos18@gmail.com", phone: "",
    instagram: "https://www.instagram.com/thaissantos.studio", neighborhood: "São João Clímaco",
    city: "São Paulo", state: "SP", map_link: "", logo_path: "",
    payment_methods: { pix: true, debit_card: true, credit_card: true, cash: true },
    credit_card_notice: "Pagamentos realizados no cartão de crédito estarão sujeitos à taxa da maquininha.",
    site: {
      home_title: "Cuidados que valorizam a sua beleza natural.",
      home_subtitle: "Procedimentos realizados com técnica, delicadeza e atenção a cada detalhe para proporcionar resultados que combinam com você.",
      primary_button: "Agendar agora", gallery_button: "Ver galeria",
      instagram_call: "Inspire-se com ainda mais resultados.", contact_text: "",
      menu: { home: "Home", services: "Serviços", story: "Minha História", gallery: "Galeria", contact: "Contato" },
    },
  },
  schedule: { slot_interval: 30, days: {
    0: { active: false },
    1: { active: true, open: "08:00", break_start: "12:00", break_end: "13:30", close: "18:00" },
    2: { active: true, open: "08:00", break_start: "12:00", break_end: "13:30", close: "18:00" },
    3: { active: true, open: "08:00", break_start: "12:00", break_end: "13:30", close: "18:00" },
    4: { active: false },
    5: { active: true, open: "08:00", break_start: "12:00", break_end: "13:30", close: "18:00" },
    6: { active: true, open: "08:00", break_start: "12:00", break_end: "13:00", close: "15:00" },
  } }, policies: {},
};

let publicSettingsCache = null;
let publicSettingsRequest = null;
const subscribers = new Set();
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const mergeSettings = (defaults, value) => {
  if (!isObject(value)) return defaults;
  return Object.fromEntries(Object.keys({ ...defaults, ...value }).map((key) => [key,
    isObject(defaults?.[key]) && isObject(value?.[key]) ? mergeSettings(defaults[key], value[key]) : value[key] ?? defaults?.[key],
  ]));
};
const normalizePublicSettings = (settings) => ({
  ...settings,
  studio: {
    ...settings.studio,
    contact_email: settings.studio?.contact_email?.trim() || DEFAULT_PUBLIC_SETTINGS.studio.contact_email,
  },
});
const publish = (settings) => { publicSettingsCache = settings; subscribers.forEach((fn) => fn(settings)); };

export const getCachedPublicSettings = () => publicSettingsCache ?? DEFAULT_PUBLIC_SETTINGS;
export const subscribePublicSettings = (subscriber) => { subscribers.add(subscriber); return () => subscribers.delete(subscriber); };
export const invalidatePublicSettings = async ({ reload = true } = {}) => { publicSettingsCache = null; publicSettingsRequest = null; return reload ? getPublicSettings({ force: true }) : null; };
export const getAdminSettings = async () => {
  const [{ data, error }, { data: adminPreferences, error: preferenceError }] = await Promise.all([
    supabase.rpc("admin_get_settings"),
    supabase.from("admin_notification_preferences").select("*"),
  ]);
  if (error || preferenceError) throw error || preferenceError;
  return { ...data, admin_preferences: adminPreferences || [] };
};
export const getPublicSettings = async ({ force = false } = {}) => {
  if (!force && publicSettingsCache) return publicSettingsCache;
  if (!force && publicSettingsRequest) return publicSettingsRequest;
  publicSettingsRequest = supabase.rpc("get_public_settings").then(({ data, error }) => { if (error) throw error; const settings = normalizePublicSettings(mergeSettings(DEFAULT_PUBLIC_SETTINGS, data ?? {})); publish(settings); return settings; }).finally(() => { publicSettingsRequest = null; });
  return publicSettingsRequest;
};
export const getPublicDayAvailability = async (date) => { const { data, error } = await supabase.rpc("get_public_day_availability", { target_date: date }); if (error) throw error; return data ?? { special_hours: null, blocks: [] }; };
export const saveSettings = async (section, payload) => { const { error } = await supabase.rpc("admin_save_settings", { section, payload }); if (error) throw error; if (["profile", "site", "schedule"].includes(section)) await invalidatePublicSettings(); };
export const savePolicy = async (type, content) => { const { error } = await supabase.rpc("admin_save_policy", { target_type: type, target_content: content }); if (error) throw error; await invalidatePublicSettings(); };
export const saveNotifications = async (payload) => { const { error } = await supabase.rpc("admin_save_notifications", { payload }); if (error) throw error; };
export const saveEmailTemplate = async (payload) => { const { error } = await supabase.rpc("admin_save_email_template", { payload }); if (error) throw error; };
export const setAdminRole = async (email, makeAdmin) => { const { error } = await supabase.rpc("admin_set_role", { target_email: email, make_admin: makeAdmin }); if (error) throw error; };
export const saveAdminPreference = async (adminUserId, values) => { const { error } = await supabase.rpc("admin_save_individual_notification_preference", { target_admin: adminUserId, panel_enabled: values.panel_notifications_enabled, email_enabled: values.email_notifications_enabled, active_value: values.is_active }); if (error) throw error; };
export const saveAdminDailyPreference = async (adminUserId, values) => { const { error } = await supabase.rpc("admin_save_daily_preferences", { target_admin: adminUserId, show_verse: values.show_daily_verse, daily_email: values.daily_summary_email_enabled, end_email: values.end_of_day_email_enabled, show_closing: values.show_closing_message }); if (error) throw error; };
export const updatePassword = async (password) => { const { error } = await supabase.auth.updateUser({ password }); if (error) throw error; };
export const updateAccountEmail = async (email) => { const { error } = await supabase.auth.updateUser({ email: email.trim() }); if (error) throw error; };
export const signOutAllSessions = async () => { const { error } = await supabase.auth.signOut({ scope: "global" }); if (error) throw error; };
