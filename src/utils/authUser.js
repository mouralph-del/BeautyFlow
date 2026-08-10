export const getUserDisplayName = (user) =>
  user?.user_metadata?.full_name?.trim() ||
  user?.user_metadata?.name?.trim() ||
  user?.email?.split("@")[0] ||
  "Administrador";

export const getUserInitials = (user) =>
  getUserDisplayName(user)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
