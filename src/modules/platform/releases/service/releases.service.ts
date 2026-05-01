import { ConflictError } from "../../../../shared/errors/conflict-error";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { CreateReleaseDto } from "../dto/create-release.dto";
import { UpdateReleaseDto } from "../dto/update-release.dto";
import { QueryReleasesDto } from "../dto/query-releases.dto";
import { mapReleaseResponse } from "../mapper/releases.mapper";
import { releasesRepository, ReleasesRepository } from "../repository/releases.repository";

export class ReleasesService {
  constructor(private readonly repository: ReleasesRepository) {}

  async list(query: QueryReleasesDto) {
    const releases = await this.repository.list(query);
    return releases.map(mapReleaseResponse);
  }

  async getById(id: string) {
    const release = await this.repository.findById(id);
    if (!release) {
      throw new NotFoundError("Release not found", { id }, "release.not_found");
    }
    return mapReleaseResponse(release);
  }

  async create(data: CreateReleaseDto) {
    const release = await this.repository.create(data);
    return mapReleaseResponse(release);
  }

  async update(id: string, data: UpdateReleaseDto) {
    await this.getById(id);
    const release = await this.repository.update(id, data);
    return mapReleaseResponse(release);
  }

  async remove(id: string) {
    await this.getById(id);
    await this.repository.delete(id);
  }

  /**
   * Public downloads manifest — returns latest active release per channel.
   * Used by desktop clients to determine if an update is available.
   */
  async getDownloadManifest() {
    const [stable, beta] = await Promise.all([
      this.repository.findLatestByChannel("STABLE"),
      this.repository.findLatestByChannel("BETA"),
    ]);

    return {
      stable: stable ? mapReleaseResponse(stable) : null,
      beta: beta ? mapReleaseResponse(beta) : null,
    };
  }
}

export const releasesService = new ReleasesService(releasesRepository);
