import { mapFeatureDefinition, MappedFeatureDefinition } from "../mapper/feature-definitions.mapper";
import {
  featureDefinitionsRepository,
  FeatureDefinitionsRepository,
} from "../repository/feature-definitions.repository";

export class FeatureDefinitionsService {
  constructor(private readonly repository: FeatureDefinitionsRepository) {}

  async listDefinitions(
    lang: string,
    includeInactive = false,
  ): Promise<MappedFeatureDefinition[]> {
    const defs = await this.repository.list(includeInactive);

    return defs.map((def) => mapFeatureDefinition(def, lang));
  }
}

export const featureDefinitionsService = new FeatureDefinitionsService(
  featureDefinitionsRepository,
);
