import {
    Authorized,
    Body,
    Delete,
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
import {User} from '../models/User';
import {Request, Response} from 'express';
import {decode as atob} from 'base-64';
import {authToken, fileExt, isNullOrEmpty, isPhoto, timestamp} from "../utils/Utils";
import {LoginError} from "../exceptions/LoginError";
import {BaseController} from "./BaseController";
import { logger } from '../logger';

@JsonController('/users')
export class UserController extends BaseController {

    @Get('/loginWithEmailPassword')
    async login(
        @Req() request: Request,
        @Res() response: Response
    ) {
        const auth = request.headers.authorization || "";
        if (auth.startsWith('BWSA')) {
            const token = atob(auth.replace('BWSA ', '')).split(':');
            const email = token[0].toLowerCase();
            const password = token[1];
            const user = await this.userService.findByCredentials(email, password);
            if (user) {
                return this.responseWithTokenAndUser(email, password, user);
            } else {
                throw new LoginError();
            }
        } else {
            throw new LoginError();
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
    public async uploadUserPhoto(@HeaderParam("authorization") user: User,
                                 @UploadedFile("profile_photo") file: Express.Multer.File,
                                 @Res() response: Response) {
        try {
            if (user) {
                if (!file) {
                    return response
                        .status(400).send({name: 'validation_error', message: 'File can not be null'});
                } else if (isPhoto(file.mimetype)) {
                    let filename = `/photos/user_${user.id}_${timestamp()}.${fileExt(file.originalname)}`;
                    let result = await this.firebaseService.upload(filename, file);
                    if (result) {
                        user.photoUrl = result['url'];
                        this.checkFirestoreDatabase(user, true);
                        await this.userService.createOrUpdate(user);
                        return user;
                    } else {
                        return response
                            .status(400).send(
                                {name: 'save_error', message: 'Image not saved, try again later.'});
                    }
                } else {
                    return response
                        .status(400).send(
                            {name: 'validation_error', message: 'File mime type not supported'});
                }
            } else {
                return response
                    .status(400).send({name: 'validation_error', message: 'User does not exist.'});
            }
        } catch (e) {
            return response
                .status(500).send({
                    name: 'upload_error',
                    message: 'Unexpectable error on load image. Try again later.'
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
    async getUsersbyIds(
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
        let result = await this.userService.getUsersBySecurity(entityTypeId, entityId, userName,
            {functionId: functionId});

        if (result) {
          // Here we are checking every user with firestore inorder to make sure
          // we have proper firebaseUID and firestore database set for the user.
          const promises = result.map(async user => {
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
        @QueryParam('roleId', {required: true}) roleId: number,
        @QueryParam('entityTypeId', {required: true}) entityTypeId: number,
        @QueryParam('entityId', {required: true}) entityId: number,
        @QueryParam('userName') userName: string,
        @Res() response: Response
    ) {
        let result = await this.userService.getUsersBySecurity(entityTypeId, entityId, userName, {roleId: roleId});
        for (let u of result) {
            u['linkedEntity'] = JSON.parse(u['linkedEntity']);
        }
        return result;
    }

    @Authorized()
    @Patch('/profile')
    async updateUser(
        @HeaderParam("authorization") currentUser: User,
        @Body() user: User,
        @Res() response: Response
    ) {
        const result = await this.userService.findUserFullDetailsById(currentUser.id);
        let userDetails = result[0];

        if (user.id && user.id != userDetails.id) {
            return response.status(400).send({
                name: 'validation_error',
                message: 'You are trying to change another user\'s data'
            });
        }
        try {
            if (userDetails.email != user.email) {
                let exist = await this.userService.userExist(user.email);
                if (exist) {
                    logger.debug(`User with email ${user.email} already exist`);
                    return response.status(400).send({
                        name: 'validation_error', message: `User with email ${user.email} already exists`
                    });
                }
            }
            await this.userService.update(userDetails.email, user);
            await this.updateFirebaseData(user, userDetails.password);
            logger.info(`Current user data updated ${user.email}`);
            return this.responseWithTokenAndUser(user.email, userDetails.password, user, false);
        } catch (err) {
            logger.error(`Unable to patch user ${userDetails.email}`, err);
            return response.status(400).send({
                name: 'unexpected_error', message: 'Failed to update the user.'
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
        }
        else {
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
        return response.status(500).send({verified: false, message: error});
      }
    }

    private async responseWithTokenAndUser(login, password, user: User, checkFirebase = true) {
      if (checkFirebase) await this.checkFirebaseUser(user, password);
        user.password = undefined;
        user.reset = undefined;
        return {
            authToken: authToken(login, password),
            user: user
        };
    }

    private async checkFirebaseUser(user, password: string) {
        if (!user.firebaseUID) {
            let fbUser = await this.firebaseService.loadUserByEmail(user.email);
            if (!fbUser || !fbUser.uid) {
                fbUser = await this.firebaseService.createUser(user.email, password);
            }
            if (fbUser.uid) {
                user.firebaseUID = fbUser.uid;
                await User.save(user);
            }
        }
        await this.checkFirestoreDatabase(user);
    }

    /// First we will check if user is having firebaseUID or not. If not we
    /// will create one and then verify for firestore database for the user.
    private async checkUserForFirestore(user: User) {
      user['linkedEntity'] = JSON.parse(user['linkedEntity']);
      if (isNullOrEmpty(user.firebaseUID)) {
        // Commenting this code will have issues in the messages chat flows
        const userDetails = await this.userService.findUserFullDetailsById(user.id);
        await this.checkFirebaseUser(user, userDetails.password);
      } else {
        await this.checkFirestoreDatabase(user);
      }
    }
}
