import { Service } from "typedi";
import BaseService from "../services/BaseService";
import { OrganisationPhoto } from "../models/OrganisationPhoto";

@Service()
export default class OrganisationPhotoService extends BaseService<OrganisationPhoto> {

    modelName(): string {
        return OrganisationPhoto.name;
    }
}