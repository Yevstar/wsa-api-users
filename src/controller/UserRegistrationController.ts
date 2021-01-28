import {Authorized, Body, HeaderParam, JsonController, Post, Res} from "routing-controllers";
import {User} from "../models/User";
import {Response} from "express";
import {logger} from "../logger";
import AppConstants from "../constants/AppConstants";
import {BaseController} from "./BaseController";

@JsonController("/userRegistration")
export class UserRegistrationController extends BaseController {


    @Authorized('web_users')
    @Post('/transferRegistration')
    async transferRegistration(
        @HeaderParam("authorization") currentUser: User,
        @Body() requestBody: any,
        @Res() response: Response) {
        try {
            if (requestBody != null) {
                const responseJSON = await this.userRegistrationService.userTransferRegistration(requestBody);

                // console.log(JSON.stringify(responseJSON));
                // console.log(responseJSON);

                return response.status(200).send(responseJSON);
            }
        } catch (error) {
            logger.error(`Error Occurred information of user ${requestBody.userId}` + error);
            return response.status(500).send({
                message: process.env.NODE_ENV == AppConstants.development ? AppConstants.errMessage + error : AppConstants.errMessage
            });
        }
    }
}