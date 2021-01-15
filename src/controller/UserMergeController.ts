import {
  Authorized,
  Body,
  BodyParam,
  Get,
  JsonController,
  Param,
  Post,
  HeaderParam
} from "routing-controllers";
import { BaseController } from "./BaseController";
import { User } from "../models/User";
import axios from 'axios';

@JsonController("/userMerge")
export class UserRoleEntityController extends BaseController {
  @Authorized()
  @Get("/matches/:userId")
  async getMatches(
    @Param("userId") userId: number
  ): Promise<unknown> {
    const users = await this.userService.findMatchesForMerging(userId);
    if (!users.length)
      return [];

    const affiliates = await this.userService.getAffiliates(users.map(u => u.id))
    return users.map(u => {
      u.affiliates = (
        affiliates.filter(af => af.affiliate && af.id === u.id) // Get affilates for current user
      ).map(u => u.affiliate) // Return only affiliate key from affilate object

      // Remove duplicates
      u.affiliates = Array.from(new Set(u.affiliates))
      return u
    });
  }

  @Post("/find")
  async findByUser(
    @Body()user: User
  ): Promise<unknown> {
    const users = await this.userService.findMatchesForLinking(user);
    if (!users.length)
      return [];

    const affiliates = await this.userService.getAffiliates(users.map(u => u.id))
    return users.map(u => {
      u.affiliates = (
        affiliates.filter(af => af.affiliate && af.id === u.id) // Get affilates for current user
      ).map(u => u.affiliate) // Return only affiliate key from affilate object

      // Remove duplicates
      u.affiliates = Array.from(new Set(u.affiliates))
      return u
    });
  }

  @Authorized()
  @Post("/merge")
  async mergeUsers(
    @HeaderParam("authorization") currentUser: User,
    @Body() payload: any,
  ): Promise<unknown> {
    const liveScoreEndpoint = process.env.liveScoresWebHost
    let user = new User()
    Object.keys(payload.payload).forEach(key => user[key] = payload.payload[key])

    axios.post(`${liveScoreEndpoint}/players/merge`, {
      oldUserId: payload.otherUserId,
      newUserId: payload.masterUserId
    }).then(_ => { })

    await Promise.all([
      this.ureService.replaceUserId(payload.otherUserId, payload.masterUserId),
      this.userService.deactivateUser(payload.otherUserId, currentUser.id, payload.masterUserId)
    ])

    if (Object.keys(payload.payload).length) {
      await this.userService.updateById(payload.masterUserId, user)
    }

    let updatedUser = await this.userService.findById(payload.masterUserId);
    await this.updateFirebaseData(updatedUser, updatedUser.password);

    return "User merged successfully";
  }
}
