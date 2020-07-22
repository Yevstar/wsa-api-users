import { BaseController } from "./BaseController";
import { Post, JsonController, HeaderParam, QueryParam, Body, Res, Authorized, Param, Get, UploadedFiles,UploadedFile, Delete } from "routing-controllers";
import { isArrayPopulated, uuidv4, timestamp, fileExt, md5, stringTONumber, isPhoto, isStringNullOrEmpty, isPdf, isNullOrEmpty } from "../utils/Utils";
import { Response, response } from 'express';
import { Affiliate } from "../models/Affiliate";
import { logger } from "../logger";
import { User } from "../models/User";
import { Organisation } from "../models/Organisation";
import { UserRoleEntity } from "../models/security/UserRoleEntity";
import e = require("express");
import { OrganisationLogo } from "../models/OrganisationLogo";
import { OrganisationPhoto } from "../models/OrganisationPhoto";
import { validateReqFilter } from "../validation/Validation";
import * as  fastcsv from 'fast-csv';
import { CharityRoundUp } from "../models/CharityRoundUp";
import { Charity } from "../models/Charity";


@JsonController("/api")
export class AffiliateController extends BaseController {

    @Authorized()
    @Post("/affiliates/save")
    async affiliateSave(
        @QueryParam("userId") userId: number,
        @HeaderParam("authorization") currentUser: User,
        @UploadedFiles("organisationLogo") organisationLogoFile: Express.Multer.File[],
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
                            if (isArrayPopulated(requestBody.contacts)) {
                                let arr = [];
                                for (let contact of requestBody.contacts) {
                                    if (contact.userId == 0) {
                                        let userDb = await this.userService.findByEmail(contact.email.toLowerCase().trim())
                                        if (userDb) {
                                            if (contact.firstName.trim() == userDb.firstName.trim() && contact.lastName.trim() == userDb.lastName.trim() && contact.mobileNumber.trim() == userDb.mobileNumber.trim()) {
                                                contact.userId = userDb.id
                                                continue;
                                            }
                                            else {
                                                return response.status(212).send({
                                                    errorCode: 7,
                                                    message: 'A user with this email already exists, but the details you have entered do not match'
                                                });
                                            }
                                        }
                                    } else if (contact.userId != 0) {
                                        if (currentUser.id != contact.userId) {
                                            let userDb1 = await this.userService.findById(contact.userId)
                                            if (userDb1.email.toLowerCase().trim() != contact.email.toLowerCase().trim()) {
                                                return response.status(212).send({
                                                    errorCode: 7,
                                                    message: 'Email address cannot be modified'
                                                });
                                            }
                                        } else {
                                            let userDb = await this.userService.findByEmail(contact.email.toLowerCase().trim())
                                            if (userDb.id != contact.userId) {
                                                if (contact.firstName.trim() == userDb.firstName.trim() && contact.lastName.trim() == userDb.lastName.trim() && contact.mobileNumber.trim() == userDb.mobileNumber.trim()) {
                                                    contact.userId = userDb.id
                                                    continue;
                                                } else {
                                                    return response.status(212).send({
                                                        errorCode: 7,
                                                        message: 'A user with this email already exists, but the details you have entered do not match'
                                                    });
                                                }
                                            }

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
                        organisation.email = (requestBody.email != undefined && requestBody.email != null) ? requestBody.email.toLowerCase() : null;
                        organisation.statusRefId = 2;
                        organisation.termsAndConditionsRefId = requestBody.termsAndConditionsRefId;
                        organisation.termsAndConditions = requestBody.termsAndConditions;
                        organisation.whatIsTheLowestOrgThatCanAddChild = requestBody.whatIsTheLowestOrgThatCanAddChild;
                        if (requestBody.affiliateOrgId == "" || requestBody.affiliateOrgId == 0) {
                            organisation.id = 0;
                            organisation.createdBy = userId;
                            organisation.organisationUniqueKey = uuidv4();
                        } else {
                            let affiliateOrgId = await this.organisationService.findByUniquekey(requestBody.affiliateOrgId);
                            organisation.id = affiliateOrgId;
                            organisation.updatedBy = userId;
                            organisation.organisationUniqueKey = requestBody.affiliateOrgId;
                            organisation.updatedOn = new Date();
                        }
                        if(organisationLogoFile && organisationLogoFile.length > 0){
                           
                            if(requestBody.termsAndConditionId == 0){
                                let termAndConditionfile = null;
                                if(requestBody.organisationLogoId == 0){
                                    termAndConditionfile = organisationLogoFile[1];
                                }
                                else{
                                    termAndConditionfile = organisationLogoFile[0]
                                }

                                if (isPdf(termAndConditionfile.mimetype)) {
                                    let filename = `/organisation/termsAndCondition_org_${organisation.organisationUniqueKey}_${timestamp()}.${fileExt(termAndConditionfile.originalname)}`;
                                    let fileUploaded = await this.firebaseService.upload(filename, termAndConditionfile);
                                  
                                    if (fileUploaded) {
                                        organisation.termsAndConditions = fileUploaded['url'];
                                    }
                                }
                            }
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

                        if(requestBody.affiliateId == 0){
                            if (requestBody.organisationTypeRefId == 4) {
                                await this.affiliateAction(affiliatedToOrgId, OrgObject, affiliateRes, userId)
                            }
                        }

                        let orgLogoDb = await this.organisationLogoService.findByOrganisationId(affiliateRes.affiliateOrgId)
                        if (organisationLogoFile != null && organisationLogoFile.length > 0 
                                && organisationLogoFile[0] != null && requestBody.organisationLogoId == 0) {
                            if (isPhoto(organisationLogoFile[0].mimetype)) {
                                //   let organisation_logo_file = requestBody.organisationLogo ;
                                let filename = `/organisation/logo_org_${affiliateRes.affiliateOrgId}_${timestamp()}.${fileExt(organisationLogoFile[0].originalname)}`;
                                let fileUploaded = await this.firebaseService.upload(filename, organisationLogoFile[0]);
                                if (fileUploaded) {
                                    let orgLogoModel = new OrganisationLogo();
                                    if (orgLogoDb) {
                                        orgLogoModel.id = orgLogoDb.id;
                                        orgLogoModel.updatedBy = userId;
                                        orgLogoModel.updatedOn = new Date();
                                    }
                                    else {
                                        orgLogoModel.id = requestBody.organisationLogoId;
                                        orgLogoModel.createdBy = userId;
                                    }
                                    orgLogoModel.organisationId = affiliateRes.affiliateOrgId;
                                    orgLogoModel.logoUrl = fileUploaded['url'];
                                    orgLogoModel.isDefault = requestBody.logoIsDefault;
                                    await this.organisationLogoService.createOrUpdate(orgLogoModel);
                                }
                            }
                        }
                        else {
                            if (orgLogoDb) {
                                let orgLogoModel = new OrganisationLogo();
                                orgLogoModel.id = orgLogoDb.id;
                                orgLogoModel.updatedBy = userId;
                                orgLogoModel.updatedOn = new Date();
                                orgLogoModel.isDefault = requestBody.logoIsDefault;
                                await this.organisationLogoService.createOrUpdate(orgLogoModel);
                            }
                        }

                        const ureUserIdDb = await this.ureService.findByTemplateId(affiliateRes.affiliateOrgId);
                        let contactMap = new Map(); let PermissionMap = new Map();
                        // if (isStringNullOrEmpty(requestBody.contacts)) {
                        //     console.log("@@@@@@-----1")
                        //     requestBody.contacts = JSON.parse(requestBody.contacts);
                        if (isArrayPopulated(requestBody.contacts)) {
                            for (let contact of requestBody.contacts) {
                                // let userDb = await this.userService.findByEmail(contact.email)
                                // if (userDb == null) {
                                let user = new User();
                                user.id = Number(contact.userId);
                                user.firstName = contact.firstName.trim();
                                user.middleName = contact.middleName.trim();
                                user.lastName = contact.lastName.trim();
                                user.mobileNumber = contact.mobileNumber.trim();
                                user.email = contact.email.toLowerCase().trim();
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
                                let ureDb = await this.ureService.findByUserAndEntityId(userRes.id, affiliateRes.affiliateOrgId)
                                if (isArrayPopulated(contact.permissions)) {
                                    for (let permission of contact.permissions) {
                                        let userRoleEntity = new UserRoleEntity();
                                        if (ureDb) {
                                            userRoleEntity.id = ureDb.id;
                                            userRoleEntity.updatedBy = userId
                                            userRoleEntity.updatedAt = new Date();
                                        }
                                        else {
                                            userRoleEntity.id = Number(permission.userRoleEntityId);
                                            userRoleEntity.createdBy = userId;
                                            let password = "";
                                            let mailObj;
                                            if (contact.userId != 0) {
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
                                        if (contact.userId == 0 && permission.roleId == 2) {
                                            await this.contactAction(affiliatedToOrgId, OrgObject, organisationRes, userRes.id, userId)
                                        }
                                    }
                                }
                                if (contact.userId == 0) {
                                    await this.updateFirebaseData(userRes, userRes.password);
                                    let mailObj = await this.communicationTemplateService.findById(1);
                                    await this.userService.sentMail(mailObj, OrgObject.name, userRes, password)
                                }

                                // }
                            }

                        }
                        //  }
                        // if (isArrayPopulated(ureUserIdDb)) {
                        //     for (let uItem of ureUserIdDb) {

                        //         if (PermissionMap.get(uItem.id) == undefined) {
                        //             await this.ureService.DeleteUre(uItem.id, uItem.userId);
                        //         }
                        //         // if (contactMap.get(uItem.userId) == undefined) {
                        //         //     let userExist = await this.ureService.findByAffiliateUser(uItem.userId)
                        //         //     if (userExist == undefined || userExist == null) {
                        //         //         console.log("deleting")
                        //         //         await this.userService.DeleteUser(uItem.userId,userId);
                        //         //     }
                        //         // }
                        //     }
                        // }
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
            logger.error(`Error Occurred in Competition Timeslot Save ${userId}` + error);
            return response.status(500).send({
                message: `Something went wrong. Please contact administrator:  ${error}`
            });
        }
    }

    @Authorized()
    @Post("/charity/update")
    async updateCharity(
        @HeaderParam("authorization") currentUser: User,
        @Body() requestBody: any,
        @Res() response: Response
    ){
        try {
            if (currentUser.id) {
                if (requestBody != null) {
                    let organisationId = await this.organisationService.findByUniquekey(requestBody.organisationId);
                    let charityRoundUpArr = [];
                    let charityArr = [];
                    
                    if(isArrayPopulated(requestBody.charityRoundUp)){
                        requestBody.charityRoundUp.map((x, index) => {
                            let obj = new CharityRoundUp();
                            if(isNullOrEmpty(x.charityRoundUpId)){
                                obj.createdBy = currentUser.id;
                            }
                            else{
                                obj.updatedBy = currentUser.id;
                                obj.updatedOn = new Date();
                            }
                            obj.id = x.charityRoundUpId;
                            obj.organisationId = organisationId;
                            obj.charityRoundUpRefId = x.charityRoundUpRefId;
                            charityRoundUpArr.push(obj);
                        });
                    }

                    const checkPreviousCharityRoundUp = await this.charityRoundUpService.checkPreviousCharityRoundUp(organisationId);
                    let previousCharityRoundUp = [];
                    if (isArrayPopulated(checkPreviousCharityRoundUp)) {
                        for (let i of checkPreviousCharityRoundUp) previousCharityRoundUp.push(i.id);
                    }

                    previousCharityRoundUp.forEach(async e => {
                        const index = charityRoundUpArr.findIndex(g => g.id === e);
                        if (index === -1) {
                            let charityRoundUp = new CharityRoundUp();
                            charityRoundUp.isDeleted = 1;
                            charityRoundUp.id = e;
                            await this.charityRoundUpService.createOrUpdate(charityRoundUp);
                        }
                    });


                    if(isArrayPopulated(requestBody.charity)){
                        requestBody.charity.map((x, index) => {
                            let obj = new Charity();
                            if(isNullOrEmpty(x.charityId)){
                                obj.createdBy = currentUser.id;
                            }
                            else{
                                obj.updatedBy = currentUser.id;
                                obj.updatedOn = new Date();
                            }
                            obj.id = x.charityId;
                            obj.organisationId = organisationId;
                            obj.name = x.title;
                            obj.description = x.description;
                            charityArr.push(obj);
                        });
                    }

                    const checkPreviousCharity = await this.charityService.checkPreviousCharity(organisationId);
                    let previousCharity = [];
                    if (isArrayPopulated(checkPreviousCharity)) {
                        for (let i of checkPreviousCharity) previousCharity.push(i.id);
                    }

                    previousCharity.forEach(async e => {
                        const index = charityArr.findIndex(g => g.id === e);
                        if (index === -1) {
                            // user deleted some payments
                            let charity = new Charity();
                            charity.isDeleted = 1;
                            charity.id = e;
                            await this.charityService.createOrUpdate(charity);
                        }
                    });

                    await this.charityService.batchCreateOrUpdate(charityArr);
                    
                    return response.status(200).send({charityRoundUp: charityRoundUpArr, charity: charityArr});
                }
                else{
                    return response.status(212).send({
                        message: 'Request body cannot be null'
                    });
                }
            }
        } catch (error) {
            logger.error(`Error Occurred in updateCharity ${currentUser.id}` + error);
            return response.status(500).send({
                message: 'Something went wrong. Please contact administrator'
            });
        }
    }

    @Authorized()
    @Post("/termsandcondition/update")
    async updateTermsAndCondition(
        @HeaderParam("authorization") currentUser: User,
        @UploadedFile("termsAndCondition") termsAndConditionFile: Express.Multer.File,
        @Body() requestBody: any,
        @Res() response: Response
    ){
        try {
            if (currentUser.id) {
                if (requestBody != null) {
                    let organisationId = await this.organisationService.findByUniquekey(requestBody.organisationId);
                    let organisation = new Organisation();
                    organisation.id = organisationId;
                    organisation.termsAndConditionsRefId = requestBody.termsAndConditionsRefId;
                    organisation.termsAndConditions = requestBody.termsAndConditions;
                    organisation.updatedBy = currentUser.id;
                    organisation.updatedOn = new Date();

                    if(termsAndConditionFile!= null){
                        if (isPdf(termsAndConditionFile.mimetype)) {
                            let filename = `/organisation/termsAndCondition_org_${requestBody.organisationId}_${timestamp()}.${fileExt(termsAndConditionFile.originalname)}`;
                            let fileUploaded = await this.firebaseService.upload(filename, termsAndConditionFile);
                            
                            if (fileUploaded) {
                                organisation.termsAndConditions = fileUploaded['url'];
                            }
                        }
                    }

                    await this.organisationService.createOrUpdate(organisation);
                    return response.status(200).send({organisation});
                }
                else{
                    return response.status(212).send({
                        message: 'Request body cannot be null'
                    });
                }
            }
        } catch (error) {
            logger.error(`Error Occurred in updateTermsAndCondition ${currentUser.id}` + error);
            return response.status(500).send({
                message: 'Something went wrong. Please contact administrator'
            });
        }
    }

    @Authorized()
    @Delete('/affiliate/user/delete/:userId')
    async removeAffiliateContact(
        @HeaderParam("authorization") currentUser: User,
        @Param('userId') userId: number,
        @QueryParam("organisationUniqueKey") organisationUniqueKey: string,
        @Res() response: Response) {
        let currentUserId;
        try {
            if (currentUser) {
                currentUserId = currentUser.id
                let organisationId = await this.organisationService.findByUniquekey(organisationUniqueKey);

                await this.ureService.DeleteUre(organisationId, userId, currentUserId);
                return response.status(200).send({ message: "Contact Delete Successfully" });
            }

        } catch (error) {
            logger.error(`Error Occurred in deleteing of contact ${currentUserId}` + error);
            return response.status(500).send({
                message: 'Something went wrong. Please contact administrator'
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
            logger.error(`Error Occurred in affilateslist ${userId}` + error);
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
            logger.error(`Error Occurred in affilatelist ${userId}` + error);
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
            logger.error(`Error Occurred in affilatelist ${userId}` + error);
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
            logger.error(`Error Occurred in affilateslist ${userId}` + error);
            return response.status(500).send({
                message: 'Something went wrong. Please contact administrator'
            });
        }
    }


    @Authorized()
    @Post("/organisationphoto/save")
    async organisationPhotos(
        @HeaderParam("authorization") currentUser: User,
        @UploadedFile("organisationPhoto") organisationPhotoFile: Express.Multer.File,
        @Body() requestBody: any,
        @Res() response: Response) {
        let userId = currentUser.id;
        try {
            if (userId) {
                if (requestBody != null) {

                    let validateOrg = validateReqFilter(requestBody.organisationId, 'organisation');
                    if (validateOrg != null) {
                        return response.status(212).send(validateOrg);
                    }
                    let organisationId = await this.organisationService.findByUniquekey(requestBody.organisationId);

                    if (organisationPhotoFile != null) {
                        if (isPhoto(organisationPhotoFile.mimetype)) {
                            //   let organisation_logo_file = requestBody.organisationLogo ;
                            let filename = `/organisation/photo_${organisationId}_${timestamp()}.${fileExt(organisationPhotoFile.originalname)}`;
                            let fileUploaded = await this.firebaseService.upload(filename, organisationPhotoFile);
                            if (fileUploaded) {
                                let orgPhotoModel = new OrganisationPhoto();
                                if (requestBody.organisationPhotoId == 0 || requestBody.organisationPhotoId == null) {
                                    orgPhotoModel.id = 0;
                                    orgPhotoModel.createdBy = userId;
                                }
                                else {
                                    orgPhotoModel.id = Number(requestBody.organisationPhotoId);
                                    orgPhotoModel.updatedBy = userId
                                    orgPhotoModel.updatedOn = new Date();
                                }
                                orgPhotoModel.organisationId = organisationId;
                                orgPhotoModel.photoUrl = fileUploaded['url'];
                                orgPhotoModel.photoTypeRefId = requestBody.photoTypeRefId;
                                await this.organisationPhotoService.createOrUpdate(orgPhotoModel);
                                return response.status(200).send('File saved successfully');
                            }
                        }
                    }
                    else {
                        if (requestBody.organisationPhotoId != 0) {
                            let orgPhotoModel = new OrganisationPhoto();
                            orgPhotoModel.id = Number(requestBody.organisationPhotoId);
                            orgPhotoModel.updatedBy = userId
                            orgPhotoModel.updatedOn = new Date();
                            orgPhotoModel.organisationId = organisationId;
                            orgPhotoModel.photoUrl = requestBody.photoUrl;
                            orgPhotoModel.photoTypeRefId = requestBody.photoTypeRefId;
                            await this.organisationPhotoService.createOrUpdate(orgPhotoModel);
                            return response.status(200).send('File saved successfully');
                        }
                    }
                }
                else {
                    return response.status(204).send({
                        errorCode: 3,
                        message: 'Empty Body'
                    });
                }


            }
            else {
                return response.status(212).send({
                    errorCode: 3,
                    message: 'Please pass userId to save the file '
                })
            }
        } catch (error) {
            logger.error(`Error Occurred in organisation Photo Save ${userId}` + error);
            return response.status(500).send({
                message: `Something went wrong. Please contact administrator:  ${error}`
            });
        }
    }

    @Authorized()
    @Get("/organisationphoto/list")
    async organisationPhotosList(
        @QueryParam("organisationUniqueKey") organisationUniqueKey: string,
        @HeaderParam("authorization") currentUser: User,
        @Res() response: Response) {
        let userId = currentUser.id;
        try {
            if (userId) {

                let validateOrg = validateReqFilter(organisationUniqueKey, 'organisation');
                if (validateOrg != null) {
                    return response.status(212).send(validateOrg);
                }
                let organisationId = await this.organisationService.findByUniquekey(organisationUniqueKey);

                let res = await this.organisationPhotoService.organisationPhotosList(organisationId);
                return response.status(200).send(res)
            }
            else {
                return response.status(401).send({
                    errorCode: 2,
                    message: 'You are trying to access another user\'s data'
                });
            }

        } catch (error) {
            logger.error(`Error Occurred in organisationPhotosList ${userId}` + error);
            return response.status(500).send({
                message: `Something went wrong. Please contact administrator:  ${error}`
            });
        }
    }

    @Authorized()
    @Delete("/organisationphoto/delete/:organisationPhotoid")
    async organisationPhotosDelete(
        @Param("organisationPhotoid") organisationPhotoid: number,
        @HeaderParam("authorization") currentUser: User,
        @Res() response: Response) {
        let userId = currentUser.id;
        try {
            if (userId) {
                let res = await this.organisationPhotoService.organisationPhotosDelete(organisationPhotoid, userId);
                return response.status(200).send(res)
            }
            else {
                return response.status(401).send({
                    errorCode: 2,
                    message: 'You are trying to access another user\'s data'
                });
            }

        } catch (error) {
            logger.error(`Error Occurred in organisation Photo Delete ${userId}` + error);
            return response.status(500).send({
                message: `Something went wrong. Please contact administrator:  ${error}`
            });
        }
    }

    @Authorized()
    @Post('/affiliatedirectory')
    async affiliateDirectory(
        @HeaderParam("authorization") currentUser: User,
        @Body() requestFilter: any,
        @Res() response: Response) {
        try {
            if (currentUser.id) {
                if (requestFilter != null) {
                    const affiliateListRes = await this.affiliateService.affiliateDirectory(requestFilter);
                    return response.status(200).send(affiliateListRes);
                }
            }
            else {
                return response.status(401).send({
                    errorCode: 2,
                    message: 'You are trying to access another user\'s data'
                });
            }
        } catch (error) {
            logger.error(`Error Occurred in affiliateDirectory ${currentUser.id}` + error);
            return response.status(500).send({
                message: 'Something went wrong. Please contact administrator'
            });
        }
    }

    @Authorized()
    @Post('/export/affiliatedirectory')
    async exportAffiliateDirectory(
        @HeaderParam("authorization") currentUser: User,
        @Body() requestBody: any,
        @Res() response: Response) {
        try {
            if (requestBody != null) {
                const Res = await this.affiliateService.exportAffiliateDirectory(requestBody, currentUser.id);
                response.setHeader('Content-disposition', 'attachment; filename=teamFinal.csv');
                response.setHeader('content-type', 'text/csv');
                fastcsv
                    .write(Res, { headers: true })
                    .on("finish", function () {
                    })
                    .pipe(response);
            }
        } catch (error) {
            logger.error(`Error Occurred in dashboard textual` + error);
            return response.status(500).send({
                message: 'Something went wrong. Please contact administrator'
            });
        }
    }


    private async affiliateAction(affiliatedToOrgId, OrgObject, affiliateRes, userId) {
        try {
            let actionObj = null;
            console.log("--------1")
            if (affiliatedToOrgId == OrgObject.id) {
                console.log("--------2")
                let stateOrg = await this.organisationService.findAffiliatedToOrg(affiliatedToOrgId)
                actionObj = await this.actionsService.createAction10(stateOrg, affiliatedToOrgId, affiliateRes.id, userId)
            }
            else {
                console.log("--------3")
                actionObj = await this.actionsService.createAction10(affiliatedToOrgId, OrgObject.id, affiliateRes.id, userId)
            }
            await this.actionsService.createOrUpdate(actionObj);
        }
        catch (error) {
            throw error;
        }
    }

    private async contactAction(affiliatedToOrgId, OrgObject, organisationRes, contactId, userId) {
        try {
            let actionObj1 = null;
            let actionObj2 = null;
            if (OrgObject.organisationTypeRefId == 4) {
                console.log("--------4")
                let stateOrg = await this.organisationService.findAffiliatedToOrg(affiliatedToOrgId)
                actionObj1 = await this.actionsService.createAction12(stateOrg, organisationRes.id, contactId, userId)
                actionObj2 = await this.actionsService.createAction12(affiliatedToOrgId, organisationRes.id, contactId, userId)
                await this.actionsService.createOrUpdate(actionObj1);
                await this.actionsService.createOrUpdate(actionObj2);

            }
            else if (OrgObject.organisationTypeRefId == 3) {
                if (OrgObject.id == affiliatedToOrgId) {
                    console.log("--------5")
                    let stateOrg = await this.organisationService.findAffiliatedToOrg(affiliatedToOrgId)
                    actionObj1 = await this.actionsService.createAction12(stateOrg, affiliatedToOrgId, contactId, userId)
                    actionObj2 = await this.actionsService.createAction12(organisationRes.id, affiliatedToOrgId, contactId, userId)
                    await this.actionsService.createOrUpdate(actionObj1);
                    await this.actionsService.createOrUpdate(actionObj2);
                }
                else {
                    console.log("--------6")
                    actionObj1 = await this.actionsService.createAction12(affiliatedToOrgId, organisationRes.id, contactId, userId)
                    await this.actionsService.createOrUpdate(actionObj1);
                }
            }
            else if (OrgObject.organisationTypeRefId == 2) {
                console.log("--------7")
                if (organisationRes.organisationTypeRefId == 4) {
                    console.log("--------8")
                    actionObj1 = await this.actionsService.createAction12(affiliatedToOrgId, OrgObject.id, contactId, userId)
                    actionObj2 = await this.actionsService.createAction12(organisationRes.id, OrgObject.id, contactId, userId)
                    await this.actionsService.createOrUpdate(actionObj1);
                    await this.actionsService.createOrUpdate(actionObj2);
                }
                else if (organisationRes.organisationTypeRefId == 3) {
                    console.log("--------9")
                    actionObj1 = await this.actionsService.createAction12(organisationRes.id, affiliatedToOrgId, contactId, userId)
                    await this.actionsService.createOrUpdate(actionObj1);
                }
            }
        }
        catch (error) {
            throw error;
        }
    }

}
