import { Service } from "typedi";
import BaseService from "../services/BaseService";
import { CompetitionLS } from "../models/CompetitionLS";


@Service()
export default class CompetitionLSService extends BaseService<CompetitionLS> {
    modelName(): string {
        return CompetitionLS.name;
    }
}