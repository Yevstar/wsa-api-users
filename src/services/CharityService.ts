
import { Service } from "typedi";
import BaseService from "../services/BaseService";
import { Charity } from "../models/Charity";

@Service()
export default class CharityService extends BaseService<Charity> {

    modelName(): string {
        return Charity.name;
    }

    public async checkPreviousCharity(organisationId: number): Promise<any> {
        return await this.entityManager.query(
            `select * from charity where organisationId = ? and isDeleted = 0`, [organisationId]);
    }

}