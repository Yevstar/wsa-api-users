import {Get, JsonController, Param, Post} from "routing-controllers";
import {BaseController} from "./BaseController";
import {TC} from "../models/TC";

@JsonController('/organisations/:organisationId/terms-and-conditions')
export class TermsAndConditionsController extends BaseController {

    @Get()
    async index(
        @Param('organisationId') organisationId: number,
    ): Promise<TC[]> {
        return this.termsAndConditionsService.findByOrganisationId(organisationId);
    }

    @Post()
    async createOne(
        @Param('organisationId') organisationId: number,
        body: TC,
    ): Promise<TC> {
        return this.termsAndConditionsService.createForOrganisation(organisationId, body)
    }
}
