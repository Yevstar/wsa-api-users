import { BaseController } from "./BaseController";
import { Post, JsonController, HeaderParam, QueryParam, Body, Res, Authorized, Param, Get, UploadedFile } from "routing-controllers";
import { isArrayEmpty, uuidv4, timestamp, fileExt, md5, stringTONumber, isPhoto, isStringNullOrEmpty } from "../utils/Utils";
import { Response, response } from 'express';
import { Affiliate } from "../models/Affiliate";
import { logger } from "../logger";
import { User } from "../models/User";
import { Organisation } from "../models/Organisation";
import { UserRoleEntity } from "../models/security/UserRoleEntity";
import e = require("express");
import { OrganisationLogo } from "../models/OrganisationLogo";

@JsonController("/api")
export class AffiliateController extends BaseController {

    @Authorized()
    @Post("/affiliates/save")
    async affiliateSave(
        @QueryParam("userId") userId: number,
        @HeaderParam("authorization") currentUser: User,
        @UploadedFile("organisationLogo") organisationLogoFile: Express.Multer.File,
        @Body() requestBody: any,
        @Res() response: Response) {
        try {
            if (userId) {
                if (userId && userId == currentUser.id) {
                    //let requestBody = Object.assign({}, requestBod);

                    let OrgObject = await this.organisationService.findOrgByUniquekey(requestBody.organisationId);


                    if (requestBody != null) {
                        if (isStringNullOrEmpty(requestBody.contacts)) {
                            requestBody.contacts = JSON.parse(requestBody.contacts);
                            if (isArrayEmpty(requestBody.contacts)) {
                                let arr =[];
                                for (let contact of requestBody.contacts) {
                                    let userDb = await this.userService.findByEmail(contact.email)
                                    if (userDb && contact.userId != 0) {
                                        if (contact.firstName == userDb.firstName && contact.lastName == userDb.lastName && contact.mobileNumber == userDb.mobileNumber) {
                                            continue;
                                        }
                                        else {
                                            return response.status(212).send({
                                                errorCode: 7,
                                                message: 'A user with this email already exists, but the details you have entered do not match'
                                            });
                                        }
                                    }else if(userDb && contact.userId == 0){
                                        return response.status(212).send({
                                            errorCode: 7,
                                            message: 'A user with this email already exists'
                                        });
                                    }else{
                                        let email =arr.find(x=> x == contact.email)
                                        if(email != null && email != undefined && email != ""){
                                            return response.status(212).send({
                                                errorCode: 7,
                                                message: 'Duplicate email address'
                                            });
                                        }else{
                                            arr.push(contact.email)
                                        }
                                    }
                                }
                            }
                        }
                        let organisation = new Organisation();
                        // organisation.id = Number(requestBody.affiliateOrgId);
                        organisation.organisationTypeRefId = requestBody.organisationTypeRefId;
                        organisation.name = requestBody.name;
                        organisation.phoneNo = requestBody.phoneNo;
                        organisation.street1 = requestBody.street1;
                        organisation.street2 = requestBody.street2;
                        organisation.suburb = requestBody.suburb;
                        organisation.city = requestBody.city;
                        organisation.postalCode = requestBody.postalCode;
                        organisation.stateRefId = requestBody.stateRefId;
                        organisation.statusRefId = 2;

                        organisation.whatIsTheLowestOrgThatCanAddChild = requestBody.whatIsTheLowestOrgThatCanAddChild;
                        if (requestBody.affiliateOrgId == "" || requestBody.affiliateOrgId == 0) {
                            organisation.id = 0;
                            organisation.createdBy = userId;
                            organisation.organisationUniqueKey = uuidv4();
                        } else {
                            let affiliateOrgId = await this.organisationService.findByUniquekey(requestBody.affiliateOrgId);
                            organisation.id = affiliateOrgId;
                            organisation.updatedBy = userId;
                            organisation.updatedOn = new Date();
                        }
                        let organisationRes = await this.organisationService.createOrUpdate(organisation);
                        let affiliatedToOrgId = await this.organisationService.findByUniquekey(requestBody.affiliatedToOrgId);
                        let affiliate = new Affiliate();
                        affiliate.id = Number(requestBody.affiliateId);
                        affiliate.affiliateOrgId = Number(organisationRes.id);
                        affiliate.affiliatedToOrgId = affiliatedToOrgId;
                        affiliate.organisationTypeRefId = requestBody.organisationTypeRefId;
                        affiliate.statusRefId = 2;
                        if (requestBody.affiliateId == 0) {
                            affiliate.createdBy = userId;
                        }
                        else {
                            affiliate.updatedBy = userId;
                            affiliate.updatedOn = new Date();
                        }

                        let affiliateRes = await this.affiliateService.createOrUpdate(affiliate);
                        if (organisationLogoFile != null) {
                            if (isPhoto(organisationLogoFile.mimetype)) {
                                //   let organisation_logo_file = requestBody.organisationLogo ;
                                let filename = `/organisation/logo_org_${affiliateRes.affiliateOrgId}_${timestamp()}.${fileExt(organisationLogoFile.originalname)}`;
                                let fileUploaded = await this.firebaseService.upload(filename, organisationLogoFile);
                                if (fileUploaded) {
                                    let orgLogoModel = new OrganisationLogo();
                                    orgLogoModel.id = requestBody.organisationLogoId;
                                    orgLogoModel.organisationId = affiliateRes.affiliateOrgId;
                                    orgLogoModel.logoUrl = fileUploaded['url'];
                                    orgLogoModel.isDefault = requestBody.logoIsDefault;
                                    orgLogoModel.createdBy = userId;
                                    await this.organisationLogoService.createOrUpdate(orgLogoModel);
                                }
                            }
                        }

                        const ureUserIdDb = await this.ureService.findByTemplateId(affiliateRes.affiliateOrgId);
                        let contactMap = new Map(); let PermissionMap = new Map();
                        // if (isStringNullOrEmpty(requestBody.contacts)) {
                        //     console.log("@@@@@@-----1")
                        //     requestBody.contacts = JSON.parse(requestBody.contacts);
                            if (isArrayEmpty(requestBody.contacts)) {
                                for (let contact of requestBody.contacts) {
                                    // let userDb = await this.userService.findByEmail(contact.email)
                                    // if (userDb == null) {
                                        let user = new User();
                                        user.id = Number(contact.userId);
                                        user.firstName = contact.firstName;
                                        user.middleName = contact.middleName;
                                        user.lastName = contact.lastName;
                                        user.mobileNumber = contact.mobileNumber;
                                        user.email = contact.email;
                                        let password = Math.random().toString(36).slice(-8);
                                        if (contact.userId == 0) {
                                            user.createdBy = userId;
                                            user.password = md5(password);
                                        } else {
                                            user.updatedBy = userId;
                                            user.updatedOn = new Date();
                                        }
                                        contactMap.set(user.id, user);

                                        let userRes = await this.userService.createOrUpdate(user);
                                        let ureDb = await this.ureService.findByUserAndEntityId(userRes.id,affiliateRes.affiliateOrgId)
                                        if(isArrayEmpty(contact.permissions)){
                                            for (let permission of contact.permissions) {
                                                let userRoleEntity = new UserRoleEntity();
                                               if(ureDb){
                                                    userRoleEntity.id = ureDb.id;
                                                    userRoleEntity.updatedBy = userId
                                                    userRoleEntity.updatedAt = new Date();
                                               }
                                                else{
                                                    userRoleEntity.id = Number(permission.userRoleEntityId);
                                                    userRoleEntity.createdBy = userId;
                                                    let password = "";
                                                    let mailObj;
                                                    if(contact.userId != 0 ){
                                                        mailObj = await this.communicationTemplateService.findById(3);
                                                        await this.userService.sentMail(mailObj, OrgObject.name, userRes, password)
                                                    }
                                                }
                                                userRoleEntity.roleId = permission.roleId;
                                                userRoleEntity.userId = Number(userRes.id);
                                                userRoleEntity.entityId = Number(organisationRes.id);
                                                userRoleEntity.entityTypeId = 2;
                                                PermissionMap.set(userRoleEntity.id, userRoleEntity);
                                                await this.ureService.createOrUpdate(userRoleEntity);
                                            }
                                        }
                                        if (contact.userId == 0) {
                                            let mailObj = await this.communicationTemplateService.findById(1);
                                            await this.userService.sentMail(mailObj, OrgObject.name, userRes, password)
                                        }
                                        
                                   // }
                                }

                            }
                      //  }
                        if (isArrayEmpty(ureUserIdDb)) {
                            for (let uItem of ureUserIdDb) {
                                if (contactMap.get(uItem.userId) == undefined) {
                                    await this.userService.DeleteUser(uItem.userId);
                                }
                                if (PermissionMap.get(uItem.id) == undefined) {
                                    await this.ureService.DeleteUre(uItem.id, uItem.userId);
                                }
                            }
                        }
                        return response.status(200).send({ id: organisationRes.id, message: 'Successfully inserted' });

                    }
                    else {
                        return response.status(204).send({
                            errorCode: 3,
                            message: 'Empty Body'
                        });
                    }
                }
                else {
                    return response.status(401).send({
                        errorCode: 2,
                        message: 'You are trying to access another user\'s data'
                    });
                }
            }
            else {
                return response.status(212).send({
                    errorCode: 3,
                    message: 'Please pass userId to save the affiliate '
                })
            }
        } catch (error) {
            logger.error(`Error Occurred in Competition Timeslot Save ${userId}`, error);
            return response.status(500).send({
                message: `Something went wrong. Please contact administrator:  ${error}`
            });
        }
    }

    @Authorized()
    @Post('/affiliateslisting')
    async affiliatesList(
        @QueryParam('userId') userId: number,
        @HeaderParam("authorization") currentUser: User,
        @Body() requestFilter: any,
        @Res() response: Response) {
        try {
            if (userId) {
                if (userId && userId == currentUser.id) {
                    if (requestFilter != null) {
                        const affiliateListRes = await this.affiliateService.affiliatesList(requestFilter);
                        return response.status(200).send(affiliateListRes);
                    }
                }
            }
        } catch (error) {
            logger.error(`Error Occurred in affilateslist ${userId}`, error);
            return response.status(500).send({
                message: 'Something went wrong. Please contact administrator'
            });
        }
    }

    @Authorized()
    @Get('/affiliate/:organisationId')
    async affiliate(
        @QueryParam('userId') userId: number,
        @HeaderParam("authorization") currentUser: User,
        @Param("organisationId") organisationUniqueKey: string,
        @Res() response: Response) {
        try {
            if (userId) {
                if (userId && userId == currentUser.id) {
                    let organisationId = await this.organisationService.findByUniquekey(organisationUniqueKey);

                    const affiliateListRes = await this.affiliateService.affiliate(organisationId);
                    return response.status(200).send(affiliateListRes);

                }
            }
        } catch (error) {
            logger.error(`Error Occurred in affilatelist ${userId}`, error);
            return response.status(500).send({
                message: 'Something went wrong. Please contact administrator'
            });
        }
    }

    @Authorized()
    @Get('/affiliatedtoorganisation/:organisationId')
    async affiliateToOrg(
        @QueryParam('userId') userId: number,
        @HeaderParam("authorization") currentUser: User,
        @Param("organisationId") organisationUniqueKey: string,
        @Res() response: Response) {
        try {
            if (userId) {
                if (userId && userId == currentUser.id) {
                    let organisationId = await this.organisationService.findByUniquekey(organisationUniqueKey);
                    const affiliateToOrgRes = await this.affiliateService.affiliateToOrg(organisationId);
                    return response.status(200).send(affiliateToOrgRes);

                }
            }
        } catch (error) {
            logger.error(`Error Occurred in affilatelist ${userId}`, error);
            return response.status(500).send({
                message: 'Something went wrong. Please contact administrator'
            });
        }
    }

    @Authorized()
    @Post('/affiliate/delete')
    async affiliatesDelete(
        @QueryParam('userId') userId: number,
        @HeaderParam("authorization") currentUser: User,
        @Body() requestBody: any,
        @Res() response: Response) {
        try {
            if (userId) {
                if (userId && userId == currentUser.id) {
                    if (requestBody != null) {
                        const affiliateListRes = await this.affiliateService.affiliatesDelete(requestBody, userId);
                        return response.status(200).send({ id: requestBody.affiliateId, message: "Successfully deleted affiliate" });
                    }
                }
            }
        } catch (error) {
            logger.error(`Error Occurred in affilateslist ${userId}`, error);
            return response.status(500).send({
                message: 'Something went wrong. Please contact administrator'
            });
        }
    }

}