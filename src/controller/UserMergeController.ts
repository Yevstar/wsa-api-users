import {
  Authorized,
  Body,
  Get,
  HeaderParam,
  JsonController,
  Param,
  Post,
} from "routing-controllers";
import { BaseController } from "./BaseController";
import { User } from "../models/User";
import axios from 'axios';

@JsonController("/userMerge")
export class UserRoleEntityController extends BaseController {
  @Authorized()
  @Get("/matches/:userId")
  async getMatches(
    // @HeaderParam("authorization") currentUser: User
    @Param("userId") userId: number
  ): Promise<unknown> {
    return this.userService.findMatchesForMerging(userId);
  }

  @Authorized()
  @Post("/merge")
  async mergeUsers(
    @Body() payload: any,
  ): Promise<unknown> {
    const liveScoreEndpoint = process.env.liveScoresWebHost
    let user = new User()
    Object.keys(payload.payload).forEach(key => user[key] = payload.payload[key])

    const response = await axios.post(`${liveScoreEndpoint}/mergeUsers/players`, {
      "oldUserId": payload.sourceId,
      "newUserId": payload.destinationId
    })

    await Promise.all([
      this.ureService.replaceUserId(payload.sourceId, payload.destinationId),
      this.userService.markUserInactive(payload.destinationId)
    ])

    if (Object.keys(payload.payload).length) {
      await this.userService.updateById(payload.sourceId, user)
    }

    return "User merged successfully";
  }
}
