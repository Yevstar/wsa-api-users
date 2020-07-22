
import { Service } from "typedi";
import BaseService from "../services/BaseService";
import { CharityRoundUp } from "../models/CharityRoundUp";

@Service()
export default class CharityRoundUpService extends BaseService<CharityRoundUp> {

    modelName(): string {
        return CharityRoundUp.name;
    }

    public async checkPreviousCharityRoundUp(organisationId: number): Promise<any> {
        return await this.entityManager.query(
            `select * from charityRoundUp where organisationId = ? and isDeleted = 0`, [organisationId]);
    }

}