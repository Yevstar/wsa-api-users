import {
  Authorized,
  Body,
  Get,
  HeaderParam,
  JsonController,
  Post,
  QueryParam,
} from 'routing-controllers';
import { User } from '../models/User';
import { UserTcBatchAcknowledgeDto } from './dto/UserTcBatchAcknowledgeDto';
import { BaseController } from './BaseController';
import { TC } from '../models/TC';
import { TCTypeEnum } from '../models/enum/TCTypeEnum';

@JsonController('/terms-and-conditions')
@Authorized()
export class UserTermsAndConditionsController extends BaseController {
  @Get()
  async index(
    @QueryParam('userId') userId: number,
    @HeaderParam('authorization') user: User,
    @QueryParam('tcType') tcType: TCTypeEnum,
  ): Promise<any> {
    return this.termsAndConditionsService.getAcknowledgementListForUser(user, tcType);
  }

  @Post('/batch/acknowledge')
  async batchAcknowledge(
    @Body() body: UserTcBatchAcknowledgeDto,
    @HeaderParam('authorization') user: User,
  ): Promise<TC[]> {
    return this.termsAndConditionsService.batchAcknowledge(user, body.tcIds);
  }
}
