import {Authorized, Body, Delete, Get, HeaderParam, JsonController, Param, Post, QueryParam, Res} from 'routing-controllers';
import {UserRoleEntity} from "../models/security/UserRoleEntity";
import {BaseController} from "./BaseController";
import {Response} from "express";
import {User} from "../models/User";
import {logger} from "../logger";
import AppConstants from '../constants/AppConstants';


@JsonController('/ure')
export class UserRoleEntityController extends BaseController {

    @Authorized()
    @Get('/:id')
    async get(@Param("id") id: number) {
        return this.ureService.findById(id);
    }

    @Authorized()
    @Get('/')
    async findByUser(@HeaderParam("authorization") user: User): Promise<UserRoleEntity[]> {
        return this.ureService.findByUser(user.id);
    }

    @Authorized()
    @Post('/')
    async create(
        @HeaderParam("authorization") user: User,
        @Body({required: true}) ure: UserRoleEntity,
        @Res() response: Response) {

        ure.userId = user.id;
        let savedUre = await this.ureService.createOrUpdate(ure);
        await this.notifyChangeRole(ure);
        return this.ureService.findById(savedUre.id);
    }

    @Authorized()
    @Delete('/')
    async delete(@QueryParam("id") id: number, @Res() response: Response) {
        let ure = await this.ureService.findById(id);
        if (ure) {
            let result = await this.ureService.delete(ure);
            if (result) {
                await this.notifyChangeRole(ure);
                return response.status(200).send({delete: true});
            } else {
                return response.status(200).send({delete: false});
            }
        } else {
            return response.status(200).send({delete: false});
        }
    }

    @Authorized()
    @Post('/impersonation')
    async impersonation(
        @QueryParam('userId') userId: number,
        @QueryParam('organisationUniqueKey') organisationUniqueKey: string,
        @QueryParam('access') access: boolean,
        @HeaderParam("authorization") currentUser: User,
        @Res() response: Response) {
            try {
                if (userId === currentUser.id) {
                    const organisationId = await this.organisationService.findByUniquekey(organisationUniqueKey);
                    let userRoleEntity = new UserRoleEntity();

                    if (access) {
                        userRoleEntity.createdBy = userId;
                        userRoleEntity.createdAt = new Date();
                        userRoleEntity.roleId = 10;
                        userRoleEntity.userId = userId;
                        userRoleEntity.entityId = organisationId;
                        userRoleEntity.entityTypeId = 2;
                        userRoleEntity.isDeleted = 0;

                        await this.ureService.createOrUpdate(userRoleEntity);
                    } else {
                        await this.ureService.deleteImpersonationUre(organisationId, userId, currentUser.id);
                    }

                    return response.status(200).send({
                        success: true,
                    });
                }
            } catch (error) {
                logger.error(`Error Occurred in impersonation ${userId}`+error);
                return response.status(500).send({
                    message: process.env.NODE_ENV == AppConstants.development? 'Error Occurred in impersonation access.' + error : 'Error Occurred in impersonation access.',
                    success: false,
                });
            }
    }

    private async notifyChangeRole(ure) {
        let tokens = (await this.deviceService.getUserDevices(ure.userId)).map(device => device.deviceId);
        if (tokens && tokens.length > 0) {
            this.firebaseService.sendMessage({
                tokens: tokens,
                data: {
                    type: 'user_role_updated'
                }
            })
        }
    }
}
