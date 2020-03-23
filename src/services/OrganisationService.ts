import { Service } from "typedi";
import BaseService from "../services/BaseService";
import { Organisation } from "../models/Organisation";
import { logger } from "../logger";
import { isArrayEmpty } from "../utils/Utils";

@Service()
export default class OrganisationService extends BaseService<Organisation> {
    modelName(): string {
        return Organisation.name;
    }

    public async findByUniquekey(organisationUniquekey: string): Promise<number> {
        let query = this.entityManager.createQueryBuilder(Organisation, 'organisation')
        query.where('organisation.organisationUniquekey= :organisationUniquekey and isDeleted = 0', {organisationUniquekey})
        return (await query.getOne()).id;
    }
    public async findOrgByUniquekey(organisationUniquekey: string): Promise<Organisation> {
        let query = this.entityManager.createQueryBuilder(Organisation, 'organisation')
        query.where('organisation.organisationUniquekey= :organisationUniquekey and isDeleted = 0', {organisationUniquekey})
        return (await query.getOne());
    }

    public async organisation(){
        try{
            let query = this.entityManager.createQueryBuilder(Organisation, 'org')
           .select(['org.id','org.name','org.organisationUniqueKey','org.organisationTypeRefId'])
            query.where('org.isDeleted = 0')
            return (await query.getMany());
        }catch(error){
            throw(error);
        }
    }

    public async userOrganisation(userId){
        try{
            let result = await this.entityManager.query("call wsa_users.usp_user_organisation(?)",[userId]);
            return result[0];
        }catch(error){
            throw error;
        }
    }
}