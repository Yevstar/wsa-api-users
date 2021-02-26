import { Service } from "typedi";
import BaseService from "./BaseService";
import { Competition } from "../models/Competition";
import { Brackets } from "typeorm-plus";
import { logger } from "../logger";
import { isArrayPopulated } from "../utils/Utils";

@Service()
export default class CompetitionService extends BaseService<Competition> {

    modelName(): string {
        return Competition.name;
    }
}