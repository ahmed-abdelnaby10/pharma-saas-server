import { FeatureDefinition } from "@prisma/client";

/**
 * Maps a FeatureDefinition record to the locale-aware API shape.
 * `label` and `description` are projected from the correct language columns
 * based on the resolved Accept-Language header value on the request.
 */
export const mapFeatureDefinition = (def: FeatureDefinition, lang: string) => ({
  key:          def.key,
  type:         def.type,
  label:        lang === "ar" ? def.labelAr        : def.labelEn,
  description:  lang === "ar" ? def.descriptionAr  : def.descriptionEn,
  labelEn:      def.labelEn,
  labelAr:      def.labelAr,
  descriptionEn: def.descriptionEn,
  descriptionAr: def.descriptionAr,
  module:       def.module,
  requiresKeys: def.requiresKeys,
  isActive:     def.isActive,
});

export type MappedFeatureDefinition = ReturnType<typeof mapFeatureDefinition>;
