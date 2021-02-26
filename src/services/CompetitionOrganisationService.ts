import { Service } from "typedi";
import BaseService from "./BaseService";
import { CompetitionOrganisation } from "../models/CompetitionOrganisation";

@Service()
export default class CompetitionOrganisationService extends BaseService<CompetitionOrganisation> {

    modelName(): string {
        return CompetitionOrganisation.name;
    }
    
}