import { Service } from "typedi";
import BaseService from "../services/BaseService";
import { OrganisationLogo } from "../models/OrganisationLogo";

@Service()
export default class OrganisationLogoService extends BaseService<OrganisationLogo> {

    modelName(): string {
        return OrganisationLogo.name;
    }

    public async updateOrganisationLogo(organisationId: number, fileUrl: string): Promise<any> {
        return await this.entityManager.query(
            `UPDATE wsa_users.organisationLogo SET logoUrl = ? WHERE organisationId = ?`, [fileUrl, organisationId]);
    }

    public async findByOrganisationId(organisationId: number){
        return this.entityManager.createQueryBuilder(OrganisationLogo, 'organisationLogo')
        .andWhere('organisationLogo.organisationId = :organisationId', {organisationId: organisationId})
        .addSelect("organisationLogo.id")
        .getOne();
    }
}