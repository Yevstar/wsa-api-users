import {Service} from "typedi";

import BaseService from "../services/BaseService";
import {Communication} from "../models/Communication";

@Service()
export default class CommunicationService extends BaseService<Communication> {
    modelName(): string {
        return Communication.name;
    }
}