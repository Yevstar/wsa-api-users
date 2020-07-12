import { BaseController } from "./BaseController";
import { Post, JsonController, HeaderParam, QueryParam, Body, Res, Authorized, Get } from "routing-controllers";
import { logger } from "../logger";
import { User } from "../models/User";
import { Response, response } from 'express';
import e = require("express");
import { validateReqFilter } from "../validation/Validation";
import * as  fastcsv from 'fast-csv';
import { UserRegistration } from "../models/UserRegistration";

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
                const affiliateListRes = await this.userDashboardService.userDashboardTextualList(requestBody, currentUser.id);
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
        @QueryParam('organisationId') organisationUniqueKey: string,
        @HeaderParam("authorization") currentUser: User,
        @Res() response: Response) {
        try {
            if (userId) {
                if (currentUser.id) {
                    const userPersonalDetailsRes = await this.userService.userPersonalDetails(userId, organisationUniqueKey);
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

    @Authorized()
    @Post('/export/registration/questions')
    async exportRegistrationQuestions(
        @HeaderParam("authorization") currentUser: User,
        @Body() requestBody: any,
        @Res() response: Response) {
        try {
            if (requestBody != null) {
                const Res = await this.userDashboardService.exportRegistrationQuestions(requestBody, currentUser.id);
                response.setHeader('Content-disposition', 'attachment; filename=teamFinal.csv');
                response.setHeader('content-type', 'text/csv');
                fastcsv
                    .write(Res, { headers: true })
                    .on("finish", function () {
                    })
                    .pipe(response);
            }
        } catch (error) {
            logger.error(`Error Occurred in dashboard textual`+error);
            return response.status(500).send({
                message: 'Something went wrong. Please contact administrator'
            });
        }
        
    }

    @Authorized()
    @Post('/userprofile/update')
    async userProfileUpdate(
        @HeaderParam("authorization") currentUser: User,
        @QueryParam("section") section: string,
        @Body() requestBody: any,
        @Res() response: Response) {
        try {

            let user = new User();
            let userReg = new UserRegistration();

            if(section == 'address'){
                let userFromDb = await this.userService.findById(requestBody.userId);
                user.id = requestBody.userId;
                user.firstName = requestBody.firstName;
                user.lastName = requestBody.lastName;
                user.middleName = requestBody.middleName;
                user.dateOfBirth = requestBody.dateOfBirth;
                user.mobileNumber = requestBody.mobileNumber;
                user.street1 = requestBody.street1;
                user.street2 = requestBody.street2;
                user.suburb = requestBody.suburb;
                user.stateRefId = requestBody.stateRefId;
                user.postalCode = requestBody.postalCode;
                user.email = requestBody.email.toLowerCase();
                let userData = await this.userService.createOrUpdate(user);

                if(userFromDb != undefined){
                    if(userFromDb.email !== user.email){
                        await this.updateFirebaseData(userData, userFromDb.password);
                    }
                }

                return response.status(200).send({message: "Successfully updated"})
            }
            else if(section == 'primary' || section == 'child'){
                if(section == 'primary'){
                    user.id = requestBody.parentUserId;
                }
                else if(section == 'child'){
                    user.id = requestBody.childUserId;
                }
                let userFromDb = await this.userService.findById(user.id);
                user.firstName = requestBody.firstName;
                user.lastName = requestBody.lastName;
                user.street1 = requestBody.street1;
                user.street2 = requestBody.street2;
                user.suburb = requestBody.suburb;
                user.stateRefId = requestBody.stateRefId;
                user.postalCode = requestBody.postalCode;
                user.mobileNumber = requestBody.mobileNumber;
                user.email = requestBody.email.toLowerCase();
                let userData =  await this.userService.createOrUpdate(user);

                if(userFromDb != undefined){
                    if(userFromDb.email !== user.email){
                        await this.updateFirebaseData(userData, userFromDb.password);
                    }
                }
                return response.status(200).send({message: "Successfully updated"})
            }
            else if(section == 'emergency'){
                user.id = requestBody.userId;
                user.emergencyContactName = requestBody.emergencyContactName
                user.emergencyContactNumber = requestBody.emergencyContactNumber;
                await this.userService.createOrUpdate(user);
                return response.status(200).send({message: "Successfully updated"})
            }
            else if(section == 'other'){
                userReg.id = requestBody.userRegistrationId;
                
                userReg.nationalityRefId = requestBody.nationalityRefId;
                userReg.countryRefId = requestBody.countryRefId;
                userReg.languages = requestBody.languages;
                await this.userRegistrationService.createOrUpdate(userReg);

                user.id = requestBody.userId;
                user.genderRefId = requestBody.genderRefId;
                await this.userService.createOrUpdate(user);

                return response.status(200).send({message: "Successfully updated"})
            }
            else if(section == 'medical'){
                userReg.id = requestBody.userRegistrationId;
                userReg.existingMedicalCondition = requestBody.existingMedicalCondition;
                userReg.regularMedication = requestBody.regularMedication;
                userReg.isDisability = requestBody.isDisability;
                userReg.disabilityCareNumber = requestBody.disabilityCareNumber;
                userReg.disabilityTypeRefId = requestBody.disabilityTypeRefId;
                await this.userRegistrationService.createOrUpdate(userReg);
                return response.status(200).send({message: "Successfully updated"})
            }


        } catch (error) {
            logger.error(`Error Occurred in userProfileUpdate `+error);
            return response.status(500).send({
                message: 'Something went wrong. Please contact administrator'
            });
        }
        
    }


    @Authorized()
    @Post('/user/history')
    async userHistory(
        @HeaderParam("authorization") currentUser: User,
        @Body() requestBody: any,
        @Res() response: Response) {
        try {
            if (requestBody != null) {
                let validateUserId = validateReqFilter(requestBody.userId, 'userId');
                if (validateUserId != null) {
                    return response.status(212).send(validateUserId);
                }
                const userCompRes = await this.userService.userHistory(requestBody);
                return response.status(200).send(userCompRes);
            }
        } catch (error) {
            logger.error(`Error Occurred in user history `+error);
            return response.status(500).send({
                message: 'Something went wrong. Please contact administrator'
            });
        }
    }
}