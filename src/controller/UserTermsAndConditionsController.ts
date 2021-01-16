import {Body, Get, HeaderParam, JsonController, Post} from "routing-controllers";
import {User} from "../models/User";
import {UserTcBatchAcknowledgeDto} from "./dto/UserTcBatchAcknowledgeDto";
import {BaseController} from "./BaseController";
import {TC} from "../models/TC";

@JsonController('/terms-and-conditions')
export class UserTermsAndConditionsController extends BaseController {
    @Get()
    async index(
        @HeaderParam('authorization') user: User,
    ): Promise<TC[]> {
        return this.termsAndConditionsService.getAcknowledgementListForUser(user)
    }

    @Post('/batch/acknowledge')
    async batchAcknowledge(
        @Body() body: UserTcBatchAcknowledgeDto,
        @HeaderParam('authorization') user: User,
    ): Promise<TC[]> {
        return this.termsAndConditionsService.batchAcknowledge(user, body.tcIds)
    }
}
