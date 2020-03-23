import {Authorized, Body, Delete, Get, HeaderParam, JsonController, Param, Post, QueryParam, Res} from 'routing-controllers';
import {UserRoleEntity} from "../models/security/UserRoleEntity";
import {BaseController} from "./BaseController";
import {Response} from "express";
import {User} from "../models/User";


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
