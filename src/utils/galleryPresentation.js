export const orderedGalleryServices = (media, catalog = []) => {
  const relations = Array.isArray(media?.serviceRelations) ? media.serviceRelations : [];
  const byId = new Map(catalog.map((service) => [String(service.dbId ?? service.id), service]));

  return relations
    .slice()
    .sort((a, b) => Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0))
    .map((relation) => ({ ...relation, service: byId.get(String(relation.serviceId)) }))
    .filter((relation) => relation.service?.active !== false);
};

export const resolveGalleryCopy = (media, relations) => {
  const services = relations.map((relation) => relation.service).filter(Boolean);
  const explicitPrimary = relations.find((relation) => relation.isPrimary)?.service;
  const first = services[0];
  const customTitle = media?.customTitle?.trim();
  const legacyTitle = media?.title?.trim();
  let title;

  if (media?.titleSource === "custom") title = customTitle;
  else if (services.length > 1) title = services.map((service) => service.title).join(" + ");
  else if (explicitPrimary) title = explicitPrimary.title;
  else if (services.length === 1) title = first.title;

  const serviceDescription = (explicitPrimary || first)?.description;
  const description = media?.descriptionSource === "custom"
    ? media?.customDescription?.trim()
    : serviceDescription;

  return {
    title: title || customTitle || legacyTitle || "Resultado do Beauty Studio",
    description: description || media?.customDescription?.trim() || "",
    primaryService: explicitPrimary || first || null,
    services,
  };
};

export const promotionForService = (service, promotions = []) => promotions.find((promotion) =>
  promotion.applies_to_all_services || promotion.service_ids?.map(String).includes(String(service.dbId))
) || null;
