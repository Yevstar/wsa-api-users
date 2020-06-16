import { BaseController } from "./BaseController";
import { Post, JsonController, HeaderParam, QueryParam, Body, Res, Authorized, Param, Get, UploadedFile, Delete } from "routing-controllers";
import { isArrayPopulated, uuidv4, timestamp, fileExt, md5, stringTONumber, isPhoto, isStringNullOrEmpty } from "../utils/Utils";
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
                            if (isArrayPopulated(requestBody.contacts)) {
                                let arr = [];
                                for (let contact of requestBody.contacts) {

                                    if (contact.userId == 0) {
                                        let userDb = await this.userService.findByEmail(contact.email.toLowerCase())
                                        if (userDb) {
                                            if (contact.firstName == userDb.firstName && contact.lastName == userDb.lastName && contact.mobileNumber == userDb.mobileNumber) {
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
                                            if (userDb1.email.toLowerCase() != contact.email.toLowerCase()) {
                                                return response.status(212).send({
                                                    errorCode: 7,
                                                    message: 'Email address cannot be modified'
                                                });
                                            }
                                        } else {
                                            let userDb = await this.userService.findByEmail(contact.email.toLowerCase())
                                            if (userDb.id != contact.userId) {
                                                if (contact.firstName == userDb.firstName && contact.lastName == userDb.lastName && contact.mobileNumber == userDb.mobileNumber) {
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
                        let orgLogoDb = await this.organisationLogoService.findByOrganisationId(affiliateRes.affiliateOrgId)
                        if (organisationLogoFile != null) {
                            if (isPhoto(organisationLogoFile.mimetype)) {
                                //   let organisation_logo_file = requestBody.organisationLogo ;
                                let filename = `/organisation/logo_org_${affiliateRes.affiliateOrgId}_${timestamp()}.${fileExt(organisationLogoFile.originalname)}`;
                                let fileUploaded = await this.firebaseService.upload(filename, organisationLogoFile);
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
                        else{
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
                                user.firstName = contact.firstName;
                                user.middleName = contact.middleName;
                                user.lastName = contact.lastName;
                                user.mobileNumber = contact.mobileNumber;
                                user.email = contact.email.toLowerCase();
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
                                    }
                                }
                                if (contact.userId == 0) {
                                    await this.updateFirebaseData(userRes,userRes.password);
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
    @Delete('/affiliate/user/delete/:userId')
    async removeAffiliateContact(
        @HeaderParam("authorization") currentUser: User,
        @Param('userId') userId: number,
        @QueryParam("organisationUniqueKey") organisationUniqueKey: string,
        @Res() response: Response) {
            let currentUserId ;
        try {
           if(currentUser){
               currentUserId  = currentUser.id
            let organisationId = await this.organisationService.findByUniquekey(organisationUniqueKey);

            await this.ureService.DeleteUre(organisationId, userId, currentUserId);
            return response.status(200).send({message: "Contact Delete Successfully"});
           }
               
        } catch (error) {
            logger.error(`Error Occurred in deleteing of contact ${currentUserId}`+error);
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
            else{
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
            logger.error(`Error Occurred in dashboard textual`+error);
            return response.status(500).send({
                message: 'Something went wrong. Please contact administrator'
            });
        }
    }
}
