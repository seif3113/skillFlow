import { Module } from '@nestjs/common';
import { QuizResolver } from './quiz.resolver';
import { QuizService } from './quiz.service';
import { QuizRepository } from './quiz.repository';
import { NodeModule } from '../node/node.module';
import { NodeRepository } from '../node/node.repository';
import { RoadmapRepository } from '../roadmap/roadmap.repository';

@Module({
  imports: [NodeModule],
  providers: [
    QuizResolver,
    QuizService,
    QuizRepository,
    NodeRepository,
    RoadmapRepository,
  ],
})
export class QuizModule {}
