import {Service} from "typedi";
import BaseService from "./BaseService";
import {OrganisationHierarchy} from "../models/OrganisationHierarchy";
@Service()

export default class OrganisationHierarchyService extends BaseService<OrganisationHierarchy> {
    modelName(): string {
        return OrganisationHierarchy.name;
    }
}
