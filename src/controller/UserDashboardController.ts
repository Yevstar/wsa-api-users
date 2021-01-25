import { BaseController } from "./BaseController";
import { Post, JsonController, HeaderParam, QueryParam, Body, Res, Authorized, Get } from "routing-controllers";
import { logger } from "../logger";
import { User } from "../models/User";
import { Response, response } from 'express';
import e = require("express");
import { validateReqFilter } from "../validation/Validation";
import * as  fastcsv from 'fast-csv';
import nodeMailer from 'nodemailer';
import { UserRegistration } from "../models/UserRegistration";
import { isArrayPopulated, isNullOrEmpty } from "../utils/Utils";
import AppConstants from '../constants/AppConstants';
import { isNullOrUndefined } from "util";
import {UserRoleEntity} from "../models/security/UserRoleEntity";
let moment = require('moment');
import twilio from 'twilio';
import { LookForExistingUserBody } from './types';

@JsonController("/api")
export class UserDashboardController extends BaseController {

    @Authorized()
    @Post('/user/dashboard/textual')
    async userDashboardTextual(
        @HeaderParam("authorization") currentUser: User,
        @Body() requestBody: any,
        @Res() response: Response,
        @QueryParam('sortBy') sortBy?: string,
        @QueryParam('sortOrder') sortOrder?: "ASC" | "DESC") {
        try {
            if (requestBody != null) {
                const affiliateListRes = await this.userDashboardService.userDashboardTextualList(requestBody, currentUser.id, sortBy, sortOrder);
                return response.status(200).send(affiliateListRes);
            }
        } catch (error) {
            logger.error(`Error Occurred in dashboard textual`+error);
            return response.status(500).send({
                message: process.env.NODE_ENV == AppConstants.development ? AppConstants.errMessage + error : AppConstants.errMessage
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
                message: process.env.NODE_ENV == AppConstants.development ? AppConstants.errMessage + error : AppConstants.errMessage
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
                message: process.env.NODE_ENV == AppConstants.development ? AppConstants.errMessage + error : AppConstants.errMessage
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
                message: process.env.NODE_ENV == AppConstants.development ? AppConstants.errMessage + error : AppConstants.errMessage
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
                message: process.env.NODE_ENV == AppConstants.development ? AppConstants.errMessage + error : AppConstants.errMessage
            });
        }
    }

    @Authorized()
    @Post('/user/activity/roster')
    async userActivitiesRoster(
        @HeaderParam("authorization") currentUser: User,
        @QueryParam('roleId') roleId: number,
        @QueryParam('matchStatus') matchStatus: string,
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
                const userCompRes = await this.userService.userActivitiesRoster(requestBody, roleId, matchStatus);
                return response.status(200).send(userCompRes);
            }
        } catch (error) {
            logger.error(`Error Occurred in user activity roster ` + error);
            return response.status(500).send({
                message: process.env.NODE_ENV == AppConstants.development ? AppConstants.errMessage + error : AppConstants.errMessage
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
                message: process.env.NODE_ENV == AppConstants.development ? AppConstants.errMessage + error : AppConstants.errMessage
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
                message: process.env.NODE_ENV == AppConstants.development ? AppConstants.errMessage + error : AppConstants.errMessage
            });
        }
    }

    /**
     * Look for the existing user during registration process
     * @param {LookForExistingUserBody} requestBody - body data
     * @param {Response} response - response object
     * @returns {Promise<void>}
     */
    @Post('/user/existing')
    async lookForExistingUser(
        @Body() requestBody: any,
        @Res() response: Response
    ) {
        try {
            // check body data
            const { dateOfBirth, email, firstName, lastName, mobileNumber } = requestBody;
            if (!(dateOfBirth && firstName && lastName && email && mobileNumber)) {
                return response.status(400).send({
                    info: "MISSING_DATA",
                    requestBody,
                });
            }
            const users = await this.userService.findExistingUser(requestBody);
            let existStatus = false;
            if (users.length > 0) {
                existStatus = true;
                const [{ email, mobileNumber, id }] = users;
                if (!(email || mobileNumber)) {
                    return response.status(200).send({
                        phone: "",
                        email: "",
                    });
                }
                const emailRegexp = /^(.{2}).*@(.{2}).*(\..+)$/;
                const responsingUsers = users.map((user) => {
                    const { email, mobileNumber, id } = user;

                    const result = email.match(emailRegexp);
                    const maskedEmail = email && result ? `${result[1]}***@${result[2]}***${result[3]}` : "";
                    const maskedPhone = mobileNumber && mobileNumber !== "NULL" ? `${mobileNumber.substr(0, 2)}xx xxx x${mobileNumber.substr(-2)}` : "";
                    return {
                        phone: maskedPhone,
                        email: maskedEmail,
                        id,
                        firstName: user.firstName,
                        lastName: user.lastName,
                    };
                });

                return response.status(200).send([...responsingUsers]);
            } else {
                return response.status(200).send(existStatus);
            }
        } catch (error) {
            logger.error(`Error @ lookForExistingUser: ${requestBody.userId || ""}\n${JSON.stringify(error)}`);
            return response.status(500).send({
                message: process.env.NODE_ENV == AppConstants.development ? AppConstants.errMessage + error : AppConstants.errMessage,
            });
        }
    }

    /**
     * Send digit code to email or sms
     * @param {LookForExistingUserBody} requestBody - body data
     * @param {Response} response - response object
     * @returns {Promise<void>}
     */
    @Post('/user/existing-digit-code')
    async sendCodeToEmailOrSms(
        @Body() requestBody: any,
        @Res() response: Response
    ) {
        try {
            // check body data
            const { id, type } = requestBody;
            if (!(id && type)) {
                return response.status(400).send({
                    info: "MISSING_DATA",
                    requestBody,
                });
            }
            const emailAndPhoneById = await this.userService.getEmailAndPhoneById(id);
            const [{ email, mobileNumber }] = emailAndPhoneById;
            const digitCode = Math.floor(100000 + Math.random() * 900000);

            let user = await this.userService.findById(id);
            user.digit_code = String(digitCode);
            await this.userService.createOrUpdate(user);

            if (type === 1) {
                await this.userService.sendAndLogEmail(`${email}`, id, "NetballConnect Verification",  `<b>${digitCode}</b>`, "", 3, id, id);

            } else {
                await this.userService.sendAndLogSMS(`${mobileNumber}`, id, `Your Netball Verification Code is:<b>${digitCode}</b>`, 3, id, id);
            }

            return response.status(200).send({
                message: type === 1 ? `Please check your email.` : "Please check your phone",
            });
        } catch (error) {
            logger.error(`Error @ sendCodeToEmailOrSms: ${requestBody.id || ""}\n${JSON.stringify(error)}`);
            return response.status(500).send({
                message: process.env.NODE_ENV == AppConstants.development ? AppConstants.errMessage + error : AppConstants.errMessage,
            });
        }

    }

    @Post('/user/check-existing-digit-code')
    async checkDigitCode(
        @Body() requestBody: any,
        @Res() response: Response
    ) {
        try {
            // check body data
            const { id, digitCode } = requestBody;
            if (!(id && digitCode)) {
                return response.status(400).send({
                    info: "MISSING_DATA",
                    requestBody,
                });
            }
            let message = "";
            const digitCodeById = await this.userService.getDigitCodeById(id);
            const currentDigitCode = digitCodeById[0].digit_code;
            if (currentDigitCode === digitCode) {
                message = "success";

                //delete code from db
                let user = await this.userService.findById(id);
                user.digit_code = null;
                await this.userService.createOrUpdate(user);
            } else {
                message = "decline";
            }

            return response.status(200).send({
                message,
                id,
            });
        } catch (error) {
            logger.error(`Error @ checkDigitCode: ${requestBody.id || ""}\n${JSON.stringify(error)}`);
            return response.status(500).send({
                message: process.env.NODE_ENV == AppConstants.development ? AppConstants.errMessage + error : AppConstants.errMessage,
            });
        }
    }

    @Post('/user/confirm-details')
    async confirmDetails(
        @Body() requestBody: any,
        @Res() response: Response
    ) {
        try {
            const { id, type, detail } = requestBody;
            if (!(id && type && detail)) {
                return response.status(400).send({
                    info: "MISSING_DATA",
                    requestBody,
                });
            }
            let message = "";
            const emailAndPhoneById = await this.userService.getEmailAndPhoneById(id);
            const [{ email, mobileNumber }] = emailAndPhoneById;

            if (Number(type) === 1 && email === detail) {
                message = "success";
            } else if (Number(type) === 2 && mobileNumber === detail) {
                message = "success";
            } else {
                message = "decline";
            }
            return response.status(200).send({
                message,
            });
        } catch (error) {
            logger.error(`Error @ confirmDetails: ${requestBody.id || ""}\n${JSON.stringify(error)}`);
            return response.status(500).send({
                message: process.env.NODE_ENV == AppConstants.development ? AppConstants.errMessage + error : AppConstants.errMessage,
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
                let responseObj = {};

                // todo: refactor below and remove redundant promises?

                const userRegRes = new Promise(async(resolve,reject) => {
                        responseObj["myRegistrations"] = await this.userService.userRegistrationDetails(requestBody);
                        resolve(responseObj["myRegistrations"]);
                    });


                const otherRegRes = new Promise(async(resolve,reject) => {
                        responseObj["otherRegistrations"] = await this.userService.otherRegistrationDetails(requestBody);
                        resolve(responseObj["otherRegistrations"]);
                    });

                const childRegRes = new Promise(async(resolve,reject) => {
                        responseObj["childRegistrations"] = await this.userService.childRegistrationDetails(requestBody);
                        resolve(responseObj["childRegistrations"]);
                    });

                const teamRegRes = new Promise(async(resolve,reject) => {
                        responseObj["teamRegistrations"] = await this.userService.teamRegistrationDetails(requestBody);
                        resolve(responseObj["teamRegistrations"]);
                    });

                await Promise.all([userRegRes,otherRegRes,childRegRes,teamRegRes])
                            .then(results => {console.log(`${JSON.stringify(results)}`);});

                return response.status(200).send(responseObj);
            }
        } catch (error) {
            logger.error(`Error Occurred in medical information of user ${requestBody.userId}`+error);
            return response.status(500).send({
                message: process.env.NODE_ENV == AppConstants.development ? AppConstants.errMessage + error : AppConstants.errMessage
            });
        }
    }

    @Authorized('web_users')
    @Post('/user/registration/registrationForm')
    async registrationFormDetails(
        @HeaderParam("authorization") currentUser: User,
        @Body() requestBody: any,
        @Res() response: Response) {
        try {
            if(requestBody != null) {
                const responseJSON = await this.userService.getRegistrationFormDetails(requestBody);

                return response.status(200).send(responseJSON);
            }
        } catch (error) {
            logger.error(`Error Occurred information of user ${requestBody.userId}`+error);
            return response.status(500).send({
                message: process.env.NODE_ENV == AppConstants.development ? AppConstants.errMessage + error : AppConstants.errMessage
            });
        }
    }

    @Authorized()
    @Post('/user/dashboard/netsetgo')
    async userRegistrationNetSetGo(
        @HeaderParam("authorization") currentUser: User,
        @Body() requestBody: any,
        @Res() response: Response,
        @QueryParam('sortBy') sortBy?: string,
        @QueryParam('sortOrder') sortOrder?: "ASC" | "DESC") {
        try {
            if (requestBody != null) {
                // let validateComp = validateReqFilter(requestBody.competitionUniqueKey, 'competitionUniqueKey');
                // if (validateComp != null) {
                //     return response.status(212).send(validateComp);
                // }


                const responseObj = await this.userService.getNetSetGoRegistration(requestBody,sortBy,sortOrder);


                return response.status(200).send(responseObj);
            }
        } catch (error) {
            logger.error(`Error Occurred in medical information of user ${requestBody.userId}`+error);
            return response.status(500).send({
                message: process.env.NODE_ENV == AppConstants.development ? AppConstants.errMessage + error : AppConstants.errMessage
            });
        }
    }
    @Authorized()
    @Post('/user/registration/team')
    async userRegistrationTeamMemberDetails(
        @HeaderParam("authorization") currentUser: User,
        @Body() requestBody: any,
        @Res() response: Response) {
            try{
                if(requestBody) {
                    let teamMembers = await this.userService.getTeamMembers(requestBody);
                    return response.status(200).send(teamMembers);
                }
            }
            catch (error) {
                logger.error(`Error Occurred in team information of user ${requestBody.userId}`+error);
                return response.status(500).send({
                    message: process.env.NODE_ENV == AppConstants.development ? AppConstants.errMessage + error : AppConstants.errMessage
                });
        }
    }

    @Authorized()
    @Post('/user/registration/resendmail')
    async userRegistrationResendMail(
        @HeaderParam("authorization") currentUser: User,
        @Body() requestBody: any,
        @Res() response: Response) {
        try {
            if (requestBody != null) {
                // let validateComp = validateReqFilter(requestBody.competitionUniqueKey, 'competitionUniqueKey');
                // if (validateComp != null) {
                //     return response.status(212).send(validateComp);
                // }
                //const userRegRes = await this.userService.sendTeamRegisterPlayerInviteMail(requestBody);
               // return response.status(200).send(userRegRes);
            }
        } catch (error) {
            logger.error(`Error Occurred in medical information of user ${requestBody.userId}`+error);
            return response.status(500).send({
                message: process.env.NODE_ENV == AppConstants.development ? AppConstants.errMessage + error : AppConstants.errMessage
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
                message: process.env.NODE_ENV == AppConstants.development ? AppConstants.errMessage + error : AppConstants.errMessage
            });
        }

    }

    @Authorized()
    @Post('/export/registration/data')
    async exportUserRegistrationData(
        @HeaderParam("authorization") currentUser: User,
        @Body() requestBody: any,
        @Res() response: Response) {
        try {
            if (requestBody != null) {
                const Res = await this.userDashboardService.exportUserRegistrationData(requestBody);
                response.setHeader('Content-disposition', 'attachment; filename=teamFinal.csv');
                response.setHeader('content-type', 'text/csv');
                fastcsv
                    .write(Res, {headers: true})
                    .on("finish", function () {
                    })
                    .pipe(response);
            }
        } catch (error) {
            logger.error('Error Occurred in dashboard textual' + error);
            return response.status(500).send({
                message: process.env.NODE_ENV == AppConstants.development ? AppConstants.errMessage + error : AppConstants.errMessage
            });
        }
    }

    @Authorized()
    @Post('/userprofile/update')
    async userProfileUpdate(
        @HeaderParam("authorization") currentUser: User,
        @QueryParam("section") section: string,
        @QueryParam("organisationId") organisationId: string,
        @Body() requestBody: any,
        @Res() response: Response) {
        try {

            let user = new User();
            let userReg = new UserRegistration();
            let ureData = new UserRoleEntity();
            let organisationName = null ;
            if(!(isNullOrUndefined(organisationId))){
               let organisation = await this.organisationService.findOrgByUniquekey(organisationId)
               organisationName = organisation.name;
            }
            if(section == 'address') {
                // does the email exist in the database, and compare with current user in db
                let userFromDb = await this.userService.findById(requestBody.userId);
                logger.info(`changing address for user: ${requestBody.userId} Email from web:${requestBody.email} firstName: ${requestBody.firstName} `);

                let emailChanged = false;
                if (userFromDb != undefined) {
                    logger.info(`existing email: ${userFromDb.email}`);
                    // check if email was changed
                    if (requestBody.email.toLowerCase().trim() != userFromDb.email.toLowerCase()) {
                        let pseudoEmail = `${requestBody.email.toLowerCase().trim()}.${requestBody.firstName.toLowerCase().trim()}`;
                        logger.info(`checking details for : ${pseudoEmail}`);
                        if ( pseudoEmail !=  userFromDb.email.toLowerCase()) { // also check child user format

                            // email was changed
                            let userDb2 = await this.userService.findByEmail(requestBody.email)
                            if (userDb2 != undefined) { // if email exists in DB
                                return response.status(212).send({
                                    errorCode: 7,
                                    message: 'This email address is already in use. Please use a different email address'
                                });
                            } else {
                                emailChanged = true;
                                logger.info(`changing email to : ${requestBody.email}`);
                                user.email = requestBody.email.toLowerCase();

                            }
                        }
                    }
                }

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

                let userData = await this.userService.createOrUpdate(user);

                if(emailChanged == true) {

                        await this.updateFirebaseData(userData, userFromDb.password);
                        let mailObjOld = await this.communicationTemplateService.findById(12);
                        await this.userService.sentMailForEmailUpdate(userFromDb, mailObjOld ,currentUser, organisationName);

                        let mailObjNew = await this.communicationTemplateService.findById(13);
                        await this.userService.sentMailForEmailUpdate(userData, mailObjNew ,currentUser, organisationName)

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
                let userDb2 = await this.userService.findByEmail(requestBody.email)
                if(userDb2 != undefined){
                    if (userFromDb && userFromDb.email.toLowerCase().trim() != requestBody.email.toLowerCase().trim()) {
                        return response.status(212).send({
                            errorCode: 7,
                            message: 'This email address is already in use. Please use a different email address'
                        });
                    }
                }
                user.firstName = requestBody.firstName;
                user.lastName = requestBody.lastName;
                user.street1 = requestBody.street1;
                user.street2 = requestBody.street2;
                user.suburb = requestBody.suburb;
                user.stateRefId = requestBody.stateRefId;
                user.postalCode = requestBody.postalCode;
                user.dateOfBirth = requestBody.dateOfBirth;
                user.mobileNumber = requestBody.mobileNumber;
                user.email = requestBody.email.toLowerCase();
                if (user.id != 0 || user.id != null) {
                    user.updatedBy = currentUser.id;
                    user.updatedOn = new Date();
                }
                else {
                    user.createdBy = currentUser.id;
                }
                let userData =  await this.userService.createOrUpdate(user);


                let getData;
                if(section == 'child') {
                    getData = await this.ureService.findExisting(requestBody.userId,userData.id,4,9);
                    ureData.userId = requestBody.userId;
                    ureData.entityId = userData.id;
                }
                else {
                    getData = await this.ureService.findExisting(userData.id,requestBody.userId,4,9);
                    ureData.userId = userData.id;
                    ureData.entityId = requestBody.userId;
                }

                if (getData) {
                    ureData.id = getData.id;
                    ureData.updatedBy = currentUser.id;
                    ureData.updatedAt = new Date();
                }
                else {
                    ureData.id = 0;
                    ureData.createdBy = currentUser.id;
                }
                ureData.roleId = 9;
                ureData.entityTypeId = 4;
                await this.ureService.createOrUpdate(ureData);

                if(userFromDb != undefined){
                    if(userFromDb.email !== user.email){
                        await this.updateFirebaseData(userData, userFromDb.password);
                        let mailObjOld = await this.communicationTemplateService.findById(12);
                        await this.userService.sentMailForEmailUpdate(userFromDb, mailObjOld ,currentUser, organisationName);

                        let mailObjNew = await this.communicationTemplateService.findById(13);
                        await this.userService.sentMailForEmailUpdate(userData, mailObjNew ,currentUser, organisationName)

                    }
                }
                return response.status(200).send({message: "Successfully updated"})
            }
            else if(section == 'unlink' || section == 'link') {
                let existingRoleId;
                let roleId;
                if(section == 'unlink'){
                    existingRoleId = AppConstants.PARENT_LINKED;
                    roleId = AppConstants.PARENT_UNLINKED;
                }
                else{
                    existingRoleId = AppConstants.PARENT_UNLINKED;
                    roleId = AppConstants.PARENT_LINKED;
                }

                let getData = await this.ureService.findExisting(requestBody.parentUserId, requestBody.childUserId,4, existingRoleId);
                if(getData) {
                    ureData.id = getData.id;
                    ureData.roleId = roleId;
                    ureData.updatedBy = requestBody.userId;
                    ureData.updatedAt = new Date();
                    await this.ureService.createOrUpdate(ureData);
                    return response.status(200).send({message: "Successfully Deleted"});
                }
            }

            else if(section == 'emergency'){
                user.id = requestBody.userId;
                user.emergencyFirstName = requestBody.emergencyFirstName;
                user.emergencyLastName= requestBody.emergencyLastName;
                user.emergencyContactNumber = requestBody.emergencyContactNumber;
                await this.userService.createOrUpdate(user);
                return response.status(200).send({message: "Successfully updated"})
            }
            else if(section == 'other'){
                userReg.id = requestBody.userRegistrationId;

                userReg.countryRefId = requestBody.countryRefId;
                await this.userRegistrationService.createOrUpdate(userReg);

                user.id = requestBody.userId;
                user.genderRefId = requestBody.genderRefId;
                user.childrenCheckNumber = requestBody.childrenCheckNumber;
                user.childrenCheckExpiryDate = moment(requestBody.childrenCheckExpiryDate, 'YYYY-MM-DD').toDate();
                user.accreditationLevelUmpireRefId = requestBody.accreditationLevelUmpireRefId;
                user.accreditationUmpireExpiryDate = requestBody.accreditationUmpireExpiryDate;
                user.accreditationLevelCoachRefId = requestBody.accreditationLevelCoachRefId;
                user.accreditationCoachExpiryDate = requestBody.accreditationCoachExpiryDate;
                await this.userService.createOrUpdate(user);

                if(!isNullOrEmpty(requestBody.childrenCheckExpiryDate)){
                    console.log("####################" + requestBody.childrenCheckExpiryDate);
                    this.actionsService.clearActionChildrenCheckNumber(user.id,currentUser.id);
                    let actions = [];
                    let masterId = 0;

                    if(moment(user.childrenCheckExpiryDate).isAfter(moment())){
                        actions = await this.actionsService.getActionDataForChildrenCheck13(user.id);
                        masterId = 13;
                        console.log("$$$$$$$$$13" + JSON.stringify(actions));
                    }
                    if(moment(user.childrenCheckExpiryDate).isBefore(moment())){
                        actions = await this.actionsService.getActionDataForChildrenCheck14(user.id);
                        masterId = 14;
                        console.log("$$$$$$$$$14" + JSON.stringify(actions));
                    }

                    if(isArrayPopulated(actions)){
                        let arr = [];
                        for(let item of actions){
                            let action = await this.actionsService.createAction13_14(item.organisationId,
                                item.competitionOrgId, item.userId, masterId);
                            arr.push(action);
                        }
                        if(isArrayPopulated(arr)){
                            console.log("Arr::" + JSON.stringify(arr));
                            await this.actionsService.batchCreateOrUpdate(arr);
                        }
                    }
                }

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
                message: process.env.NODE_ENV == AppConstants.development ? AppConstants.errMessage + error : AppConstants.errMessage
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
                message: process.env.NODE_ENV == AppConstants.development ? AppConstants.errMessage + error : AppConstants.errMessage
            });
        }
    }


    @Authorized()
    @Post('/user/delete')
    async userDelete(
        @HeaderParam("authorization") currentUser: User,
        @Body() requestBody: any,
        @Res() response: Response) {
        try {
            if (requestBody != null) {
                let validateUserId = validateReqFilter(requestBody.userId, 'userId');
                if (validateUserId != null) {
                    return response.status(212).send(validateUserId);
                }

                if(isArrayPopulated(requestBody.organisations)){
                    for(let organisation of  requestBody.organisations){
                   //     let organisationId = await this.organisationService.findByUniquekey(requestBody.organisationId);

                        let ureRes = await this.userService.userDelete(requestBody.userId,organisation.linkedEntityId);
                        if(ureRes != undefined){
                            ureRes.isDeleted = 1;
                            ureRes.updatedBy = currentUser.id;
                            ureRes.updatedAt = new Date();
                            await this.ureService.createOrUpdate(ureRes);
                        }
                    }
                }


                return response.status(200).send({message: 'Successfully deleted user'});
            }
        } catch (error) {
            logger.error(`Error Occurred in user delete `+error);
            return response.status(500).send({
                message: process.env.NODE_ENV == AppConstants.development ? AppConstants.errMessage + error : AppConstants.errMessage
            });
        }
    }

    @Authorized()
    @Post('/user/activity/incident')
    async userActivitiesIncident(
        @Body() incidentRequest: playerIncidentRequest,
        @Res() response: Response) {
        try {
            if (incidentRequest !== null) {
                return await this.userService.getPlayerIncident(
                    incidentRequest.userId, incidentRequest.competitionId,
                    incidentRequest.yearId, incidentRequest.offset, incidentRequest.limit);
            }
        } catch (error) {
            logger.error(`Error Occurred in user activity incident ` + error);
            return response.status(500).send({
                message: process.env.NODE_ENV == AppConstants.development ? AppConstants.errMessage + error : AppConstants.errMessage
            });
        }
    }
}

export interface playerIncidentRequest {
    userId: number,
    competitionId: string,
    yearId: number,
    offset: number,
    limit: number
}
