import { Authorized, Body, Get, JsonController, Param, Post } from 'routing-controllers';
import { BaseController } from './BaseController';
import { TC } from '../models/TC';

@JsonController('/organisations/:organisationId/terms-and-conditions')
@Authorized('web_users')
export class TermsAndConditionsController extends BaseController {
  @Get()
  async index(@Param('organisationId') organisationId: number): Promise<TC[]> {
    return this.termsAndConditionsService.findByOrganisationId(organisationId);
  }

  @Post()
  async createOne(@Param('organisationId') organisationId: number, @Body() body: TC): Promise<TC> {
    return this.termsAndConditionsService.createForOrganisation(organisationId, body);
  }
}
