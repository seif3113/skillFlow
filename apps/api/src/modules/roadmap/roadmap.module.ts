import { Module } from '@nestjs/common';
import { RoadmapResolver, PublicRoadmapResolver } from './roadmap.resolver';
import { RoadmapService } from './roadmap.service';
import { RoadmapRepository } from './roadmap.repository';
import { NodeModule } from '../node/node.module';

@Module({
  imports: [NodeModule],
  providers: [
    RoadmapResolver,
    PublicRoadmapResolver,
    RoadmapService,
    RoadmapRepository,
  ],
})
export class RoadmapModule {}
