import {Get, JsonController, QueryParam, Authorized, HeaderParam, Res} from 'routing-controllers';
import {BaseController} from "./BaseController";
import { User } from '../models/User';
import { Response, response } from 'express';
import { logger } from '../logger';

@JsonController('/api')
export class OrganisationController extends BaseController {

    @Authorized()
    @Get('/organisation')
    async organisation(
        @QueryParam('userId') userId: number,
        @HeaderParam("authorization") currentUser: User,
        @Res() response: Response) {
        try {
            if (userId) {
                if (userId && userId == currentUser.id) {

                    const organisationRes = await this.organisationService.organisation();
                    return response.status(200).send(organisationRes);

                }
            }
        } catch (error) {
            logger.error(`Error Occurred in organisation list ${userId}`+error);
            return response.status(500).send({
                message: 'Something went wrong. Please contact administrator'
            });
        }
    }

    @Authorized()
    @Get('/userorganisation')
    async userOrganisation(
        @QueryParam('userId') userId: number,
        @HeaderParam("authorization") currentUser: User,
        @Res() response: Response,
    ) {
        try {
            if (userId) {
                if (userId && userId == currentUser.id) {
                    const organisationRes = await this.organisationService.userOrganisation(userId);
                    return response.status(200).send(organisationRes);
                }
            }

            return response.status(400).send({
                message: 'Invalid request'
            });
        } catch (error) {
            logger.error(`Error Occurred in organisation list ${userId}`+error);
            return response.status(500).send({
                message: 'Something went wrong. Please contact administrator'
            });
        }
    }
}
