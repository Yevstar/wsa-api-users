import {
  Authorized,
  BodyParam,
  Get,
  HeaderParam,
  JsonController,
  Post,
  QueryParam,
  Res,
} from 'routing-controllers';
import { Response } from 'express';

import { BaseController } from './BaseController';
import { User } from '../models/User';
import { logger } from '../logger';
import AppConstants from '../constants/AppConstants';
import { isArrayPopulated } from '../utils/Utils';
import { RequiredQueryParam } from '../decorators/RequiredQueryParamDecorator';

@JsonController('/api')
export class OrganisationController extends BaseController {
  @Authorized()
  @Get('/organisation')
  async organisation(
    @QueryParam('userId') userId: number,
    @QueryParam('organisationUniqueKey') organisationUniqueKey: string,
    @HeaderParam('authorization') currentUser: User,
    @Res() response: Response,
  ) {
    try {
      if (userId) {
        if (userId && userId == currentUser.id) {
          const organisationRes = await this.organisationService.organisation(
            organisationUniqueKey,
          );
          return response.status(200).send(organisationRes);
        }
      }
    } catch (error) {
      logger.error(`Error Occurred in organisation list ${userId}` + error);
      return response.status(500).send({
        message:
          process.env.NODE_ENV == AppConstants.development
            ? AppConstants.errMessage + error
            : AppConstants.errMessage,
      });
    }
  }

  @Authorized()
  @Get('/organisation-details')
  async organisationDetails(
    @RequiredQueryParam('organisationUniqueKey') organisationUniqueKey: string,
    @Res() response: Response,
  ) {
    return await this.organisationService.findOrgByUniquekey(organisationUniqueKey);
  }

  @Authorized()
  @Get('/userorganisation')
  async userOrganisation(
    @QueryParam('userId') userId: number,
    @HeaderParam('authorization') currentUser: User,
    @Res() response: Response,
  ) {
    try {
      if (userId) {
        if (userId && userId == currentUser.id) {
          const roles = await this.ureService.findByUser(userId);
          const impersonationRole = roles.find(role => role.roleId === 10);
          let organisationRes = await this.organisationService.userOrganisation(userId);

          if (impersonationRole) {
            const organisation = await this.organisationService.findById(
              impersonationRole.entityId,
            );
            const { organisationTypes } = await this.affiliateService.affiliateToOrg(
              impersonationRole.entityId,
            );
            const organisationType =
              organisationTypes && organisationTypes.length > 0
                ? organisationTypes.find(type => type.id === organisation.organisationTypeRefId)
                : null;

            organisationRes = [
              {
                ...organisationRes[0],
                email: organisation.email || '',
                name: organisation.name,
                organisationId: organisation.id,
                mobileNumber: organisation.phoneNo || '',
                organisationType: organisationType ? organisationType.name : '',
                organisationTypeRefId: organisation.organisationTypeRefId,
                organisationUniqueKey: organisation.organisationUniqueKey,
              },
            ];

            return response.status(200).send(organisationRes);
          }

          return response.status(200).send(organisationRes);
        }
      }

      return response.status(400).send({
        message: 'Invalid request',
      });
    } catch (error) {
      logger.error(`Error Occurred in organisation list ${userId}` + error);
      return response.status(500).send({
        message:
          process.env.NODE_ENV == AppConstants.development
            ? AppConstants.errMessage + error
            : AppConstants.errMessage,
      });
    }
  }

  @Authorized()
  @Get('/organisationsByIds')
  async organisationsByIds(@QueryParam('ids') ids: number[], @Res() response: Response) {
    if (isArrayPopulated(ids)) {
      return this.organisationService.findByIds(ids);
    } else {
      return response.status(400).send({
        name: 'validation_error',
        message: `Organisation id not provided`,
      });
    }
  }

  @Authorized()
  @Post('/bannerCount')
  async updateBannerCount(
    @HeaderParam('authorization') currentUser: User,
    @QueryParam('organisationId', { required: true }) organisationId: number,
    @BodyParam('numStateBanner') numStateBanner: number,
    @BodyParam('numCompBanner') numCompBanner: number,
    @Res() response: Response,
  ) {
    if (numStateBanner + numCompBanner <= 8) {
      return this.organisationSettingsService.updateBannerCount(
        currentUser,
        organisationId,
        numStateBanner,
        numCompBanner,
      );
    } else {
      return response.status(400).send({
        name: 'validation_error',
        message: `The sum must be always 8.`,
      });
    }
  }

  @Authorized()
  @Get('/bannerCount')
  async getBannerCount(
    @QueryParam('organisationId', { required: true }) organisationId: number,
    @Res() response: Response,
  ) {
    return this.organisationSettingsService.getBannerCount(organisationId);
  }

  @Get('/organisations/all')
  async allOrganisations() {
    return this.organisationService.getAllOrganisations();
  }

  @Authorized()
  @Get('/organisationsByName')
  async getOrganisationByName(
    @QueryParam('name') name: string,
    @Res() response: Response
  ) {
    return this.organisationService.getOrganisationByName((name || '').trim());
  }
}
