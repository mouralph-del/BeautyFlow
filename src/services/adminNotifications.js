import { supabase } from "../lib/supabase";
export async function getNotificationCenter(offset=0){const{data,error}=await supabase.rpc("get_admin_notification_center",{page_size:20,page_offset:offset});if(error)throw error;return data||{items:[],unread_count:0}}
export async function markNotificationRead(id=null){const{error}=await supabase.rpc("mark_admin_notification_read",{target_id:id});if(error)throw error}
