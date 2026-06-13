import { Module } from '@nestjs/common';
import { RoadmapResolver } from './roadmap.resolver';
import { RoadmapService } from './roadmap.service';
import { RoadmapRepository } from './roadmap.repository';
import { NodeModule } from '../node/node.module';

@Module({
  imports: [NodeModule],
  providers: [RoadmapResolver, RoadmapService, RoadmapRepository],
})
export class RoadmapModule {}
