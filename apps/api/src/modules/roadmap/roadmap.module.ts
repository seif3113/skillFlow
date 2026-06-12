import { Module } from '@nestjs/common';
import { RoadmapResolver } from './roadmap.resolver';
import { RoadmapService } from './roadmap.service';
import { RoadmapRepository } from './roadmap.repository';

@Module({
  providers: [RoadmapResolver, RoadmapService, RoadmapRepository],
})
export class RoadmapModule {}
