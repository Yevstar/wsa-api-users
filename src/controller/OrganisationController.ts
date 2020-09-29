import {Get, JsonController, QueryParam, Authorized, HeaderParam, Res} from 'routing-controllers';
import {BaseController} from "./BaseController";
import { User } from '../models/User';
import { Response, response } from 'express';
import { logger } from '../logger';
import AppConstants from '../constants/AppConstants';
import { isArrayPopulated } from "../utils/Utils";

@JsonController('/api')
export class OrganisationController extends BaseController {

    @Authorized()
    @Get('/organisation')
    async organisation(
        @QueryParam('userId') userId: number,
        @QueryParam('organisationUniqueKey') organisationUniqueKey: string,
        @HeaderParam("authorization") currentUser: User,
        @Res() response: Response) {
        try {
            if (userId) {
                if (userId && userId == currentUser.id) {

                    const organisationRes = await this.organisationService.organisation(organisationUniqueKey);
                    return response.status(200).send(organisationRes);

                }
            }
        } catch (error) {
            logger.error(`Error Occurred in organisation list ${userId}`+error);
            return response.status(500).send({
                message: process.env.NODE_ENV == AppConstants.development ? AppConstants.errMessage + error : AppConstants.errMessage
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
                    const roles = await this.ureService.findByUser(userId);
                    const impersonationRole = roles.find((role) => role.roleId === 10);
                    let organisationRes = await this.organisationService.userOrganisation(userId);

                    if (impersonationRole) {
                        const organisation = await this.organisationService.findById(impersonationRole.entityId);
                        const {organisationTypes} = await this.affiliateService.affiliateToOrg(impersonationRole.entityId);
                        const organisationType = organisationTypes && organisationTypes.length > 0
                            ? organisationTypes.find((type) => type.id === organisation.organisationTypeRefId)
                            : null;

                        organisationRes = [{
                            ...organisationRes[0],
                            email: organisation.email || '',
                            name: organisation.name,
                            organisationId: organisation.id,
                            mobileNumber: organisation.phoneNo || '',
                            organisationType: organisationType ? organisationType.name : '',
                            organisationTypeRefId: organisation.organisationTypeRefId,
                            organisationUniqueKey: organisation.organisationUniqueKey,
                        }];

                        return response.status(200).send(organisationRes);
                    }


                    return response.status(200).send(organisationRes);
                }
            }

            return response.status(400).send({
                message: 'Invalid request'
            });
        } catch (error) {
            logger.error(`Error Occurred in organisation list ${userId}`+error);
            return response.status(500).send({
                message: process.env.NODE_ENV == AppConstants.development ? AppConstants.errMessage + error : AppConstants.errMessage
            });
        }
    }

    @Authorized()
    @Get('/organisationsByIds')
    async organisationsByIds(
        @QueryParam('ids') ids: number[],
        @Res() response: Response
    ) {
        if (isArrayPopulated(ids)) {
            return this.organisationService.findByIds(ids);
        } else {
          return response.status(400).send({
                    name: 'validation_error',
                    message: `Organisation id not provided`
                });
        }
    }
}
