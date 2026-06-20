import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { QuizService } from './quiz.service';

@Resolver('Quiz')
export class QuizResolver {
  constructor(private readonly quizService: QuizService) {}

  @Query('nodeQuiz')
  nodeQuiz(@Args('nodeId') nodeId: number, @Session() session: UserSession) {
    return this.quizService.getNodeQuiz(nodeId, Number(session.user.id));
  }

  @Query('myQuizAttempts')
  myQuizAttempts(@Session() session: UserSession) {
    return this.quizService.findMyAttempts(Number(session.user.id));
  }

  @Mutation('adaptNode')
  adaptNode(@Args('nodeId') nodeId: number, @Session() session: UserSession) {
    return this.quizService.adaptNode(nodeId, Number(session.user.id));
  }

  @Mutation('generateNodeQuiz')
  generateNodeQuiz(
    @Args('nodeId') nodeId: number,
    @Session() session: UserSession,
  ) {
    return this.quizService.generateNodeQuiz(nodeId, Number(session.user.id));
  }

  @Mutation('submitQuizAttempt')
  submitQuizAttempt(
    @Args('nodeId') nodeId: number,
    @Args('answers') answers: number[],
    @Session() session: UserSession,
  ) {
    return this.quizService.submitAttempt(
      nodeId,
      Number(session.user.id),
      answers,
    );
  }
}
