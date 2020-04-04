import { BaseController } from "./BaseController";
import { Post, JsonController, HeaderParam, QueryParam, Body, Res, Authorized, Get } from "routing-controllers";
import { logger } from "../logger";
import { User } from "../models/User";
import { Response, response } from 'express';
import e = require("express");
import { validateReqFilter } from "../validation/Validation";

@JsonController("/api")
export class UserDashboardController extends BaseController {

    @Authorized()
    @Post('/user/dashboard/textual')
    async userDashboardTextual(
        @HeaderParam("authorization") currentUser: User,
        @Body() requestBody: any,
        @Res() response: Response) {
        try {
            if (requestBody != null) {
                const affiliateListRes = await this.userDashboardService.userDashboardTextualList(requestBody);
                return response.status(200).send(affiliateListRes);
            }
        } catch (error) {
            logger.error(`Error Occurred in dashboard textual`+error);
            return response.status(500).send({
                message: 'Something went wrong. Please contact administrator'
            });
        }
    }

    @Authorized()
    @Get('/user/personaldetails')
    async userPersonalDetails(
        @QueryParam('userId') userId: number,
        @HeaderParam("authorization") currentUser: User,
        @Res() response: Response) {
        try {
            if (userId) {
                if (currentUser.id) {
                    const userPersonalDetailsRes = await this.userService.userPersonalDetails(userId);
                    return response.status(200).send(userPersonalDetailsRes);

                }
            }
        } catch (error) {
            logger.error(`Error Occurred in affilatelist ${userId}`+error);
            return response.status(500).send({
                message: 'Something went wrong. Please contact administrator'
            });
        }
    }

    @Authorized()
    @Post('/user/personaldetails/competition')
    async userPersonalDetailsByCompetition(
        @HeaderParam("authorization") currentUser: User,
        @Body() requestBody: any,
        @Res() response: Response) {
        try {
            if (requestBody != null) {
                const userCompRes = await this.userService.userPersonalDetailsByCompetition(requestBody);
                return response.status(200).send(userCompRes);
            }
        } catch (error) {
            logger.error(`Error Occurred in user Personal Details By Competition `+error);
            return response.status(500).send({
                message: 'Something went wrong. Please contact administrator'
            });
        }
    }

    @Authorized()
    @Post('/user/activity/player')
    async userActivitiesPlayer(
        @HeaderParam("authorization") currentUser: User,
        @Body() requestBody: any,
        @Res() response: Response) {
        try {
            if (requestBody != null) {
                //let validateComp = validateReqFilter(requestBody.competitionUniqueKey, 'competitionUniqueKey');
                // if (validateComp != null) {
                //     return response.status(212).send(validateComp);
                // }
                let validateComp = validateReqFilter(requestBody.userId, 'userId');
                if (validateComp != null) {
                    return response.status(212).send(validateComp);
                }
                const userCompRes = await this.userService.userActivitiesPlayer(requestBody);
                return response.status(200).send(userCompRes);
            }
        } catch (error) {
            logger.error(`Error Occurred in user activity player `+error);
            return response.status(500).send({
                message: 'Something went wrong. Please contact administrator'
            });
        }
    }

    @Authorized()
    @Post('/user/activity/parent')
    async userActivitiesParent(
        @HeaderParam("authorization") currentUser: User,
        @Body() requestBody: any,
        @Res() response: Response) {
        try {
            if (requestBody != null) {
                // let validateComp = validateReqFilter(requestBody.competitionUniqueKey, 'competitionUniqueKey');
                // if (validateComp != null) {
                //     return response.status(212).send(validateComp);
                // }
                let validateComp = validateReqFilter(requestBody.userId, 'userId');
                if (validateComp != null) {
                    return response.status(212).send(validateComp);
                }
                const userCompRes = await this.userService.userActivitiesParent(requestBody);
                return response.status(200).send(userCompRes);
            }
        } catch (error) {
            logger.error(`Error Occurred in user activity parent `+error);
            return response.status(500).send({
                message: 'Something went wrong. Please contact administrator'
            });
        }
    }

    @Authorized()
    @Post('/user/activity/scorer')
    async userActivitiesScorer(
        @HeaderParam("authorization") currentUser: User,
        @Body() requestBody: any,
        @Res() response: Response) {
        try {
            if (requestBody != null) {
                // let validateComp = validateReqFilter(requestBody.competitionUniqueKey, 'competitionUniqueKey');
                // if (validateComp != null) {
                //     return response.status(212).send(validateComp);
                // }
                let validateComp = validateReqFilter(requestBody.userId, 'userId');
                if (validateComp != null) {
                    return response.status(212).send(validateComp);
                }
                const userCompRes = await this.userService.userActivitiesScorer(requestBody);
                return response.status(200).send(userCompRes);
            }
        } catch (error) {
            logger.error(`Error Occurred in user activity scorer `+error);
            return response.status(500).send({
                message: 'Something went wrong. Please contact administrator'
            });
        }
    }

    @Authorized()
    @Post('/user/activity/manager')
    async userActivitiesManager(
        @HeaderParam("authorization") currentUser: User,
        @Body() requestBody: any,
        @Res() response: Response) {
        try {
            if (requestBody != null) {
                // let validateComp = validateReqFilter(requestBody.competitionUniqueKey, 'competitionUniqueKey');
                // if (validateComp != null) {
                //     return response.status(212).send(validateComp);
                // }
                let validateComp = validateReqFilter(requestBody.userId, 'userId');
                if (validateComp != null) {
                    return response.status(212).send(validateComp);
                }
                const userCompRes = await this.userService.userActivitiesManager(requestBody);
                return response.status(200).send(userCompRes);
            }
        } catch (error) {
            logger.error(`Error Occurred in user activity manager `+error);
            return response.status(500).send({
                message: 'Something went wrong. Please contact administrator'
            });
        }
    }

    @Authorized()
    @Post('/user/medical')
    async userMedicalDetailsByCompetition(
        @HeaderParam("authorization") currentUser: User,
        @Body() requestBody: any,
        @Res() response: Response) {
        try {
            if (requestBody != null) {
                const userCompRes = await this.userRegistrationService.userMedicalDetailsByCompetition(requestBody);
                return response.status(200).send(userCompRes);
            }
        } catch (error) {
            logger.error(`Error Occurred in medical information of user ${requestBody.userId}`+error);
            return response.status(500).send({
                message: 'Something went wrong. Please contact administrator'
            });
        }
    }
    @Authorized()
    @Post('/user/registration')
    async userRegistrationDetails(
        @HeaderParam("authorization") currentUser: User,
        @Body() requestBody: any,
        @Res() response: Response) {
        try {
            if (requestBody != null) {
                // let validateComp = validateReqFilter(requestBody.competitionUniqueKey, 'competitionUniqueKey');
                // if (validateComp != null) {
                //     return response.status(212).send(validateComp);
                // }
                const userRegRes = await this.userService.userRegistrationDetails(requestBody);
                return response.status(200).send(userRegRes);
            }
        } catch (error) {
            logger.error(`Error Occurred in medical information of user ${requestBody.userId}`+error);
            return response.status(500).send({
                message: 'Something went wrong. Please contact administrator'
            });
        }
    }
}