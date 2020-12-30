import {
    Authorized,
    Body, ForbiddenError,
    Get,
    HeaderParam,
    JsonController,
    Patch,
    Post,
    QueryParam,
    Req,
    Res,
    UploadedFile
} from 'routing-controllers';
import {Request, Response} from 'express';
import {decode as atob} from 'base-64';
import * as fastcsv from 'fast-csv';
import QRcode from 'qrcode';

import {User} from '../models/User';
import {
    authToken,
    fileExt,
    isPhoto,
    timestamp,
    isArrayPopulated,
    md5,
    paginationData,
    stringTONumber,
    isObjectNotNullAndUndefined
} from '../utils/Utils';
import {LoginError} from '../exceptions/LoginError';
import {BaseController} from './BaseController';
import {logger} from '../logger';
import AppConstants from '../constants/AppConstants';
import {LinkedEntities} from "../models/views/LinkedEntities";
import { Role } from "../models/security/Role";

const tfaOptionEnabled = parseInt(process.env.TFA_ENABLED, 10);

@JsonController('/users') 
export class UserController extends BaseController {

    @Get('/loginWithEmailPassword')
    async login(
        @Req() request: Request,
        @Res() response: Response
    ) {
        const auth = request.headers.authorization || "";
        if (auth.startsWith(AppConstants.bwsa)) {
            const token = atob(auth.replace('BWSA ', '')).split(':');
            const email = token[0].toLowerCase();
            const password = token[1];

            let user;
            let sourcesystem = request.headers.sourcesystem;
            if (sourcesystem == AppConstants.sourceSystem) {
                user = await this.userService.findByCredentials(email, password);
                if (!user) {
                    throw new LoginError(AppConstants.loginUnsuccessfulMsg);
                } else {
                    user = await this.userService.findByCredentialsForWeb(email, password);
                    if (!user) {
                        throw new LoginError(AppConstants.loginErrMsg);
                    }
                }
            } else {
                user = await this.userService.findByCredentials(email, password);
            }

            if (user) {
                return this.responseWithTokenAndUser(email, password, user);
            } else {
                throw new LoginError(AppConstants.loginUnsuccessfulMsg);
            }
        } else {
            throw new LoginError(AppConstants.loginUnsuccessfulMsg);
        }
    }

    @Get('/loginWithTfa')
    async loginWithTfa(
        @Req() request: Request,
        @Res() response: Response
    ) {
        const auth = request.headers.authorization || "";
        if (auth.startsWith(AppConstants.bwsa)) {
            const token = atob(auth.replace('BWSA ', '')).split(':');
            const email = token[0].toLowerCase();
            const password = token[1];

            let user;
            let sourcesystem = request.headers.sourcesystem;
            if (sourcesystem !== AppConstants.sourceSystem) {
                throw new LoginError(AppConstants.loginAccessErrMsg);
            }

            user = await this.userService.findByCredentials(email, password);
            if (!user) {
                throw new LoginError(AppConstants.loginUnsuccessfulMsg);
            } else {
                user = await this.userService.findByCredentialsForTFA(email, password);
                if (!user) {
                    throw new LoginError(AppConstants.loginErrMsg);
                }

                if (tfaOptionEnabled === 1) {
                    if (user.tfaEnabled && user.tfaSecret) {
                        return {
                            tfaEnabled: true,
                        };
                    }

                    const qrCode = await this.userService.generateTfaSecret(user);
                    return {
                        tfaEnabled: false,
                        qrCode,
                    };
                }

                user = await this.userService.findByCredentialsForWeb(email, password);
                return this.responseWithTokenAndUser(email, password, user);
            }
        } else {
            throw new LoginError(AppConstants.loginUnsuccessfulMsg);
        }
    }

    @Get('/confirmTfa')
    async confirmTfa(
        @Req() request: Request,
        @Res() response: Response
    ) {
        const auth = request.headers.authorization || "";
        if (auth.startsWith(AppConstants.bwsa)) {
            const token = atob(auth.replace('BWSA ', '')).split(':');
            const email = token[0].toLowerCase();
            const password = token[1];
            const code = token[2];

            let user;
            let sourcesystem = request.headers.sourcesystem;
            if (sourcesystem !== AppConstants.sourceSystem) {
                throw new LoginError(AppConstants.loginAccessErrMsg);
            }

            user = await this.userService.findByCredentialsForTFA(email, password);
            if (!user) {
                throw new LoginError(AppConstants.tfaUnsuccessfulMsg);
            } else {
                const log = {
                    id: user.id,
                    firstName: user.firstName,
                    middleName: user.middleName,
                    lastName: user.lastName,
                    mobileNumber: user.mobileNumber,
                    email: user.email,
                    tfaEnabled: user.tfaEnabled,
                    tfaSecret: user.tfaSecret,
                    tfaSecretUrl: user.tfaSecretUrl,
                }
                logger.info(`Confirm TFA: ${new Date()}`);
                logger.info(JSON.stringify(log));

                const isConfirmed = this.userService.confirmTfaSecret(user, code);
                if (!isConfirmed) {
                    logger.info('Failed to confirm TFA');
                    throw new LoginError(AppConstants.tfaUnsuccessfulMsg);
                }

                const userWithRoles = await this.userService.findByCredentialsForWeb(email, password);
                if (!userWithRoles) {
                    throw new LoginError(AppConstants.loginErrMsg);
                }

                if (userWithRoles) {
                    let tfaStatus = {
                        tfaEnabled: true,
                        qrCode: null,
                    };

                    if (!user.tfaEnabled) {
                        await this.userService.updateTfaStatus(user);

                        const qrCode = await QRcode.toDataURL(user.tfaSecretUrl);
                        tfaStatus = {
                            tfaEnabled: false,
                            qrCode,
                        }
                    }

                    userWithRoles.tfaEnabled = 1;
                    const result = await this.responseWithTokenAndUser(email, password, userWithRoles);
                    return {
                        ...result,
                        ...tfaStatus,
                    }
                } else {
                    throw new LoginError(AppConstants.loginUnsuccessfulMsg);
                }
            }
        } else {
            throw new LoginError(AppConstants.tfaUnsuccessfulMsg);
        }
    }

    @Authorized()
    @Get('/logout')
    async logout(
        @HeaderParam("authorization") user: User,
        @Res() response: Response
    ) {
        return response.status(200).send({name: 'logout', message: 'success'});
    }

    @Authorized('assign_scorer')
    @Get('/')
    async getUsers(@QueryParam('query') query: string): Promise<User[]> {
        return await this.userService.findByFullName(query);
    }

    @Authorized()
    @Post('/photo')
    public async uploadUserPhoto(
        @HeaderParam("authorization") currentUser: User,
        @QueryParam("userId") userId: number,
        @UploadedFile("profile_photo") file: Express.Multer.File,
        @Res() response: Response
    ) {
        const user = userId ? await this.userService.findById(userId) : currentUser;

        if (userId) {
            if (! await this.userService.isChildUser(currentUser.id, userId)) {
                throw new ForbiddenError("You are not allowed set profile image for this user!");
            }
        }

        try {
            if (user) {
                if (!file) {
                    return response.status(400).send({
                        name: 'validation_error',
                        message: 'File can not be null'
                    });
                } else if (isPhoto(file.mimetype)) {
                    let filename = `/photos/user_${user.id}_${timestamp()}.${fileExt(file.originalname)}`;
                    let result = await this.firebaseService.upload(filename, file);
                    if (result) {
                        user.photoUrl = result['url'];
                        this.checkFirestoreDatabase(user, true);
                        await this.userService.updatePhoto(user.id, user.photoUrl);
                        return this.userService.findById(user.id);
                    }

                    return response.status(400).send({
                        name: 'save_error',
                        message: 'Image not saved, try again later.'
                    });
                }

                return response.status(400).send({
                    name: 'validation_error',
                    message: 'File mime type not supported'
                });
            }

            return response.status(400).send({
                name: 'validation_error',
                message: 'User does not exist.'
            });
        } catch (e) {
            return response.status(500).send({
                name: 'upload_error',
                message: process.env.NODE_ENV == AppConstants.development?'Unexpected error on load image. Try again later.' + e : 'Unexpected error on load image. Try again later.'
            });
        }
    }

    @Authorized()
    @Get('/permission')
    async getPermission(@HeaderParam("authorization") user: User): Promise<any[]> {
        let permission = await this.userService.getUserPermission(user.id);
        for (let p of permission) {
            p['functions'] = JSON.parse(p['functions']);
        }
        return permission;
    }

    @Authorized()
    @Get('/byIds')
    async getUsersByIds(
        @QueryParam('ids', {required: true}) ids: number[],
        @Res() response: Response
    ) {
        return await this.userService.getUserListByIds(ids);
    }

    @Authorized()
    @Get('/linkedEntity')
    async loadUserByIdWithLinkedEntity(
        @QueryParam('userId', {required: true}) userId: number,
        @Res() response: Response
    ) {
        let result = await this.userService.getUsersByIdWithLinkedEntity(userId);
        if (result) {
            result['linkedEntity'] = JSON.parse(result['linkedEntity']);
            return result;
        } else {
            return {};
        }
    }

    @Authorized()
    @Get('/byFunction')
    async loadUserByFunction(
        @QueryParam('functionId', {required: true}) functionId: number,
        @QueryParam('entityTypeId', {required: true}) entityTypeId: number,
        @QueryParam('entityId', {required: true}) entityId: number,
        @QueryParam('userName') userName: string,
        @Res() response: Response
    ) {
        let result = await this.userService.getUsersBySecurity(
            entityTypeId,
            entityId,
            userName,
            { functionId },
            null,
            null,
            null,
            null
        );

        if (result && result.userData && Array.isArray(result.userData)) {
            // Here we are checking every user with firestore inorder to make sure
            // we have proper firebaseUID and firestore database set for the user.
            const promises = result.userData.map(async user => {
                await this.checkUserForFirestore(user);
                return user;
            });

            return await Promise.all(promises);
        } else {
            return [];
        }
    }

    @Authorized()
    @Get('/byRole')
    async loadUserByRole(
        @QueryParam('roleId', { required: true }) roleId: number,
        @QueryParam('entityTypeId', { required: true }) entityTypeId: number,
        @QueryParam('entityId', { required: true }) entityId: number,
        @QueryParam('userName') userName: string,
        @Res() response: Response,
        @QueryParam('sortBy', { required: false }) sortBy?: string,
        @QueryParam('sortOrder', { required: false }) sortOrder?: "ASC" | "DESC",
        @QueryParam('offset') offset?: string,
        @QueryParam('limit') limit?: string,
        @QueryParam('needUREs') needUREs: boolean = false
    ) {
        if (!isObjectNotNullAndUndefined(roleId) ||
            !isObjectNotNullAndUndefined(entityTypeId) ||
            !isObjectNotNullAndUndefined(entityId)
        ) {
            return response.status(400).send({
                name: 'search_error',
                message: `Required parameters not filled`
            });
        }

        return await this.loadUserByRoles(
            [roleId],
            entityTypeId,
            entityId,
            userName,
            response,
            sortBy,
            sortOrder,
            offset,
            limit,
            needUREs
        );
    }

    @Authorized()
    @Get('/byRoles')
    async loadUserByRoles(
        @QueryParam('roleIds', { required: true }) roleIds: number[],
        @QueryParam('entityTypeId', { required: true }) entityTypeId: number,
        @QueryParam('entityId', { required: true }) entityId: number,
        @QueryParam('userName') userName: string,
        @Res() response: Response,
        @QueryParam('sortBy', { required: false }) sortBy?: string,
        @QueryParam('sortOrder', { required: false }) sortOrder?: "ASC" | "DESC",
        @QueryParam('offset') offset?: string,
        @QueryParam('limit') limit?: string,
        @QueryParam('needUREs') needUREs: boolean = false,
        @QueryParam('individualLinkedEntityRequired') individualLinkedEntityRequired: boolean = false
    ) {
        if (!isArrayPopulated(roleIds) ||
            !isObjectNotNullAndUndefined(entityTypeId) ||
            !isObjectNotNullAndUndefined(entityId)
        ) {
            return response.status(400).send({
                name: 'search_error',
                message: `Required parameters not filled`
            });
        }

        let result = await this.userService.getUsersBySecurity(
            entityTypeId,
            entityId,
            userName,
            { roleIds },
            sortBy,
            sortOrder,
            offset,
            limit,
            individualLinkedEntityRequired
        );

        return await this.getUsersByRoles(
            result,
            roleIds,
            needUREs,
            offset,
            limit
        );
    }

    @Authorized()
    @Get('/umpiresAvailable')
    async loadUsersOfUmpiresAvailable(
        @QueryParam('entityTypeId', { required: true }) entityTypeId: number,
        @QueryParam('entityId', { required: true }) entityId: number,
        @QueryParam('matchStartTime', { required: true }) matchStartTime: Date,
        @QueryParam('matchEndTime', { required: true }) matchEndTime: Date,
        @QueryParam('userName') userName: string,
        @Res() response: Response,
        @QueryParam('sortBy', { required: false }) sortBy?: string,
        @QueryParam('sortOrder', { required: false }) sortOrder?: "ASC" | "DESC",
        @QueryParam('offset') offset?: string,
        @QueryParam('limit') limit?: string,
        @QueryParam('needUREs') needUREs: boolean = false,
        @QueryParam('individualLinkedEntityRequired') individualLinkedEntityRequired: boolean = false
    ) {
        if (!isObjectNotNullAndUndefined(entityTypeId) ||
            !isObjectNotNullAndUndefined(entityId)
        ) {
            return response.status(400).send({
                name: 'search_error',
                message: `Required parameters not filled`
            });
        }

        let roleIds = [ Role.UMPIRE ];
        let result = await this.userService.getUsersBySecurity(
            entityTypeId,
            entityId,
            userName,
            { roleIds },
            sortBy,
            sortOrder,
            offset,
            limit,
            individualLinkedEntityRequired,
            true,
            matchStartTime,
            matchEndTime
        );

        return await this.getUsersByRoles(
            result,
            roleIds,
            needUREs,
            offset,
            limit
        );
    }

    private async getUsersByRoles(
        result: any,
        roleIds: number[],
        needUREs: boolean,
        offset?: string,
        limit?: string
    ): Promise<any> {
        var userIdsArray: number[] = new Array();
        var linkedEntitiesArray: LinkedEntities[] = new Array();
        for (let u of result.userData) {
            u['linkedEntity'] = JSON.parse(u['linkedEntity']);
            userIdsArray.push(u.id);
            for (let obj of u['linkedEntity']) {
                let linkedEntity: LinkedEntities = new LinkedEntities();
                linkedEntity.linkedEntityId = obj.entityId;
                linkedEntity.linkedEntityTypeId = obj.entityTypeId;
                linkedEntitiesArray.push(linkedEntity);
            }
        }

        if (needUREs) {
            if(isArrayPopulated(userIdsArray)){
                let ures = await this.ureService.findByParams(
                    userIdsArray,
                    roleIds,
                    linkedEntitiesArray
                );
                for (let u of result.userData) {
                    let filterUREs = ures.filter(x => x.userId == u.id);
                    u['userRoleEntities'] = filterUREs;
                }
            }
        }

        if(isObjectNotNullAndUndefined(offset) &&
            isObjectNotNullAndUndefined(limit)
        ) {
                let totalCount = result.userCount;
                let responseObject = paginationData(stringTONumber(totalCount), +limit, +offset);
                responseObject["userData"] = result.userData;

                return responseObject;
        } else {

            return result.userData;
        }
    }

    @Authorized()
    @Get('/profile')
    async getUser(
        @HeaderParam("authorization") currentUser: User,
        @Res() response: Response
    ) {
        try {
            let userDetails = await this.userService.findById(currentUser.id);
            logger.info(`Current user data fetched ${userDetails.email}`);
            return userDetails;
        } catch (err) {
            logger.error(`Unable to fetch user ${currentUser.email}` + err);
            return response.status(400).send({
                name: 'unexpected_error',
                message: process.env.NODE_ENV == AppConstants.development? 'Failed to get the user.' + err : 'Failed to get the user.'
            });
        }
    }

    @Authorized()
    @Patch('/profile')
    async updateUser(
        @HeaderParam("authorization") currentUser: User,
        @Body() user: User,
        @Res() response: Response
    ) {
        user.email = user.email.toLowerCase();
        const result = await this.userService.findUserFullDetailsById(currentUser.id);
        let userDetails = result[0];

        if (user.id && user.id != userDetails.id) {
            return response.status(400).send({
                name: 'validation_error',
                message: 'You are trying to change another user\'s data'
            });
        }

        try {
            if (userDetails.email.toLowerCase() != user.email) {
                let exist = await this.userService.userExist(user.email);
                if (exist) {
                    logger.debug(`User with email ${user.email} already exist`);
                    return response.status(400).send({
                        name: 'validation_error',
                        message: `User with email ${user.email} already exists`
                    });
                }
            }

            await this.userService.update(userDetails.email.toLowerCase(), user);

            logger.info(`Current user data updated ${user.email}`);
            return this.responseWithTokenAndUser(user.email, userDetails.password, user);
        } catch (err) {
            logger.error(`Unable to patch user ${userDetails.email}` + err);
            return response.status(400).send({
                name: 'unexpected_error',
                message: process.env.NODE_ENV == AppConstants.development?'Failed to update the user.' + err : 'Failed to update the user.'
            });
        }
    }

    @Authorized()
    @Patch('/updatePassword')
    async updatePassword(
        @HeaderParam("authorization") currentUser: User,
        @Body() requestBody: any,
        @Res() response: Response
    ) {
        if (!requestBody.password) {
            return response.status(400).send({
                name: 'validation_error',
                message: 'Password is required'
            });
        }

        if (!requestBody.newPassword) {
            return response.status(400).send({
                name: 'validation_error',
                message: 'New password is required'
            });
        }

        try {
            const user = await this.userService.findByCredentials(currentUser.email, md5(requestBody.password));
            if (!user) {
                return response.status(400).send({
                    name: 'validation_error',
                    message: 'Password is incorrect'
                });
            }

            user.password = md5(requestBody.newPassword);
            await this.userService.createOrUpdate(user);

            let updatedUser = await this.userService.findById(currentUser.id);
            logger.info(`Current user password updated ${user.email}`);
            return this.responseWithTokenAndUser(updatedUser.email, user.password, updatedUser);
        } catch (e) {
            return response.status(500).send({
                name: 'upload_error',
                message: process.env.NODE_ENV == AppConstants.development? 'Failed to update password.' + e : 'Failed to update password.'
            });
        }
    }

    @Authorized()
    @Get('/childProfiles')
    async getChildProfile(
        @QueryParam('ids', {required: true}) ids: number[], // Here ids should be user id's
        @Res() response: Response
    ) {
        let childUserList = await this.userService.findChildPlayerUserDetails(ids);
        if (childUserList) {
            const promises = childUserList.map(async user => {
                let userPass = user.password;
                await this.checkFirestoreDatabase(user);
                return await this.responseWithTokenAndUser(user.email.toLowerCase(), userPass, user);
            });

            return await Promise.all(promises);
        } else {
            return response.status(400).send({
                name: 'validation_error',
                message: 'Could not find any user'
            });
        }
    }

    @Authorized()
    @Get('/verifyUserForChat')
    async verifyUserForChat(
        @HeaderParam("authorization") user: User,
        @Res() response: Response
    ) {
        try {
            await this.checkFirestoreDatabase(user);
            return response.status(200).send({verified: true});
        } catch (error) {
            return response.status(500).send({verified: false, message: process.env.NODE_ENV == AppConstants.development? error : error});
        }
    }

    private async responseWithTokenAndUser(login, password, user: User) {
        await this.updateFirebaseData(user, password);
        user.password = undefined;
        user.reset = undefined;
        return {
            authToken: authToken(login, password),
            user: user
        };
    }

    // First we will check if user is having firebaseUID or not. If not we
    // will create one and then verify for firestore database for the user.
    private async checkUserForFirestore(user: User) {
        user.email = user.email.toLowerCase();
        user['linkedEntity'] = JSON.parse(user['linkedEntity']);
        if (user.email !== null && user.email !== undefined &&
            (user.firebaseUID === null || user.firebaseUID === undefined)) {
            // Commenting this code will have issues in the messages chat flows
            const result = await this.userService.findUserFullDetailsById(user.id);
            let userDetails = result[0];
            if (userDetails.email !== null && userDetails.email !== undefined) {
                await this.updateFirebaseData(user, userDetails.password);
            }
        } else {
            await this.checkFirestoreDatabase(user);
        }
    }

    @Authorized()
    @Post('/dashboard/friend')
    async friendDashboard(
        @Body() requestBody: any,
        @HeaderParam("authorization") user: User,
        @Res() response: Response,
        @QueryParam('sortBy') sortBy?: string,
        @QueryParam('sortOrder') sortOrder?: "ASC" | "DESC"
    ) {
        try {
            let res = await this.userService.friendDashboard(requestBody, sortBy, sortOrder)
            return response.status(200).send(res)
        } catch (error) {
            logger.error(`Unable to get Friend details `, error)
            return response.status(500).send({ message: process.env.NODE_ENV == AppConstants.development? 'Something went wrong' + error : 'Something went wrong'});
        }
    }

    @Authorized()
    @Post('/dashboard/referfriend')
    async referFriendDashboard(
        @Body() requestBody: any,
        @HeaderParam("authorization") user: User,
        @Res() response: Response,
        @QueryParam('sortBy') sortBy?: string,
        @QueryParam('sortOrder') sortOrder?: "ASC" | "DESC"
    ) {
        try {
            let res = await this.userService.referFriendDashboard(requestBody, sortBy, sortOrder)
            return response.status(200).send(res)
        } catch (error) {
            logger.error(`Unable to get Refer friend details `, error)
            return response.status(500).send({message: process.env.NODE_ENV == AppConstants.development? 'Something went wrong' + error : 'Something went wrong'})
        }
    }

    @Authorized()
    @Post('/dashboard/spectator')
    async spectatorDashboard(
        @Body() requestBody: any,
        @HeaderParam("authorization") user: User,
        @Res() response: Response,
        @QueryParam('sortBy') sortBy?: string,
        @QueryParam('sortOrder') sortOrder?: "ASC" | "DESC"
    ) {
        try {
            let res = await this.userService.spectatorDashboard(requestBody, sortBy, sortOrder)
            return response.status(200).send(res)
        } catch (error) {
            logger.error(`Unable to get Refer friend details `, error)
            return response.status(500).send({message: process.env.NODE_ENV == AppConstants.development? 'Something went wrong' + error : 'Something went wrong'})
        }
    }

    @Authorized()
    @Get('/byRole/export')
    async exportUserByRole(
        @QueryParam('roleId', {required: true}) roleId: number,
        @QueryParam('entityTypeId', {required: true}) entityTypeId: number,
        @QueryParam('entityId', {required: true}) entityId: number,
        @QueryParam('userName') userName: string,
        @Res() response: Response
    ) {
        let getManagersData: any = await this.loadUserByRole(
            roleId,
            entityTypeId,
            entityId,
            userName,
            response,
            undefined,
            undefined
        );
        if (isArrayPopulated(getManagersData)) {
            getManagersData.map(e => {
                e['First Name'] = e['firstName'];
                e['Last Name'] = e['lastName'];
                e['Email'] = e['email'];
                e['Contact No'] = e['mobileNumber'];
                const teamName = [];
                const affiliateName = [];
                if (isArrayPopulated(e['linkedEntity'])) {
                    for (let r of e['linkedEntity']) {
                        teamName.push(r['name']);
                        if (r['parentName'] != null) {
                            affiliateName.push(r['parentName']);
                        }
                    }
                }
                e['Organisation'] = affiliateName.toString();
                e['Team'] = teamName.toString();

                delete e['id'];
                delete e['email'];
                delete e['firstName'];
                delete e['lastName'];
                delete e['mobileNumber'];
                delete e['genderRefId'];
                delete e['marketingOptIn'];
                delete e['photoUrl'];
                delete e['firebaseUID'];
                delete e['statusRefId'];
                delete e['linkedEntity'];
                delete e['accreditationLevelUmpireRefId'];
                delete e['accreditationUmpireExpiryDate'];
                delete e['associationLevelInfo'];
                delete e['accreditationLevelCoachRefId'];
                delete e['isPrerequestTrainingComplete'];
                delete e['accreditationCoachExpiryDate'];

                return e;
            });
        } else {
            getManagersData.push({
                ['First Name']: 'N/A',
                ['Last Name']: 'N/A',
                ['Email']: 'N/A',
                ['Contact No']: 'N/A',
                ['Organisation']: 'N/A',
                ['Team']: 'N/A'
            });
        }

        response.setHeader('Content-disposition', 'attachment; filename=file.csv');
        response.setHeader('content-type', 'text/csv');
        fastcsv.write(getManagersData, {headers: true})
            .on("finish", function () {
            })
            .pipe(response);
    }

    @Authorized()
    @Get('/byRole/export/org')
    async exportUserByRoleOrgs(
        @QueryParam('roleId', {required: true}) roleId: number,
        @QueryParam('entityTypeId', {required: true}) entityTypeId: number,
        @QueryParam('entityId', {required: true}) entityId: number,
        @QueryParam('userName') userName: string,
        @Res() response: Response
    ) {
        let userData: any = await this.loadUserByRole(
            roleId,
            entityTypeId,
            entityId,
            userName,
            response,
            undefined,
            undefined
        );
        if (isArrayPopulated(userData)) {
            userData.map(e => {
                e['ID'] = e['id'];
                e['First Name'] = e['firstName'];
                e['Last Name'] = e['lastName'];
                e['Email'] = e['email'];
                e['Contact No'] = e['mobileNumber'];
                const organisationName = [];
                if (isArrayPopulated(e['linkedEntity'])) {
                    for (let r of e['linkedEntity']) {
                        organisationName.push(r['name']);
                    }
                }
                e['Organisation'] = organisationName.toString();
                delete e['id'];
                delete e['email'];
                delete e['firstName'];
                delete e['lastName'];
                delete e['mobileNumber'];
                delete e['genderRefId'];
                delete e['marketingOptIn'];
                delete e['photoUrl'];
                delete e['firebaseUID'];
                delete e['statusRefId'];
                delete e['linkedEntity'];
                return e;
            });
        } else {
            userData.push({
                ['ID']: 'N/A',
                ['First Name']: 'N/A',
                ['Last Name']: 'N/A',
                ['Email']: 'N/A',
                ['Contact No']: 'N/A',
                ['Organisation']: 'N/A'
            });
        }

        response.setHeader('Content-disposition', 'attachment; filename=file.csv');
        response.setHeader('content-type', 'text/csv');
        fastcsv.write(userData, {headers: true})
            .on("finish", function () {
            })
            .pipe(response);
    }

    @Authorized('web_users')
    @Post('/profile/reset/tfa')
    async userResetTFA(
        @QueryParam('userId', {required: true}) userId: number,
        @Res() response: Response
    ) {
        if (isObjectNotNullAndUndefined(userId)) {
            await this.userService.resetTFA(userId);

            return this.userService.findById(userId);
        } else {
            return response.status(400).send({
                name: 'param_error',
                message: `Required parameter not passed`
            });
        }
    }
}
