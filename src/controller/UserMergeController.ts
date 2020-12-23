import {
  Authorized,
  Body,
  Get,
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

    axios.post(`${liveScoreEndpoint}/players/merge`, {
      oldUserId: payload.otherUserId,
      newUserId: payload.masterUserId
    }).then(_ => {})

    await Promise.all([
      this.ureService.replaceUserId(payload.otherUserId, payload.masterUserId),
      this.userService.markUserInactive(payload.otherUserId)
    ])

    if (Object.keys(payload.payload).length) {
      await this.userService.updateById(payload.masterUserId, user)
    }

    return "User merged successfully";
  }
}
