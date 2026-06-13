import { Module } from '@nestjs/common';
import { NodeResolver } from './node.resolver';
import { NodeService } from './node.service';
import { NodeRepository } from './node.repository';
import { RoadmapRepository } from '../roadmap/roadmap.repository';

@Module({
  providers: [
    NodeResolver,
    NodeService,
    NodeRepository,
    RoadmapRepository,
  ],
  exports: [NodeService],
})
export class NodeModule { }
