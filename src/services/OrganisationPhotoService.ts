import { Service } from "typedi";
import BaseService from "../services/BaseService";
import { OrganisationPhoto } from "../models/OrganisationPhoto";

@Service()
export default class OrganisationPhotoService extends BaseService<OrganisationPhoto> {

    modelName(): string {
        return OrganisationPhoto.name;
    }

    public async organisationPhotosList(organisationId: number){
        try{
            let result =  await this.entityManager.query("call wsa_users.usp_organisation_photos(?)",
            [organisationId]);

            return result[0];
        }
        catch(error){
            throw error;
        }
    }

    public async organisationPhotosDelete(organisationPhotoid: number, userId: number){
        try{
            await this.entityManager.createQueryBuilder(OrganisationPhoto, 'organisationPhoto')
            .update(OrganisationPhoto)
            .set({ isDeleted: 1,updatedBy: userId, updatedOn: new Date() })
            .andWhere(" organisationPhoto.id = :id ", { id: organisationPhotoid })
            .execute();
        }
        catch(error){
            throw error;
        }
    }
}