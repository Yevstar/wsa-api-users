import BaseService from "./BaseService";
import {TC} from "../models/TC";
import {Organisation} from "../models/Organisation";
import {User} from "../models/User";

export class TermsAndConditionsService extends BaseService<TC> {
    modelName(): string {
        return TC.name;
    }

    async findByOrganisationId(organisationId: number): Promise<TC[]> {
        //TODO: Get T&C for current organisation
        return [];
    }

    async createForOrganisation(
        organisationId: number,
        body: TC,
    ): Promise<TC> {
        body.organisation = await this.entityManager.findOneOrFail(Organisation, organisationId);
        return this.createOrUpdate(body)
    }

    async getAcknowledgementListForUser(user: User): Promise<TC[]> {
        //TODO: Get T&C list for logged in user
        return [];
    }

    async batchAcknowledge(user: User, tcIds: number[]): Promise<TC[]> {
        //TODO: Batch acknowledgement of T&C by logged in user
        return [];
    }
}
