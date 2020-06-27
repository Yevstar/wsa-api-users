import { Service } from "typedi";
import BaseService from "../services/BaseService";
import { Actions } from "../models/Actions";
import { isArrayPopulated } from "../utils/Utils";

@Service()
export default class ActionsService extends BaseService<Actions> {
    modelName(): string {
        return Actions.name;
    }

    public async createAction10(organisationId,  affiliateOrgId, affiliateId,userId){
        try{
            let action = new Actions()
            action.id = 0;
            action.actionMasterId = 10;
            action.affiliateId = affiliateId
            action.organisationId = organisationId;
            action.statusRefId = 1;
            action.competitionOrgId = affiliateOrgId;
            action.createdBy = userId;

            return action;
        }
        catch(error){
            throw error;
        }
    }

    public async createAction12(organisationId, compOrgId,contactId, userId){
        try{
            let action = new Actions()
            action.id = 0;
            action.actionMasterId = 12;
            action.userId = contactId;
            action.organisationId = organisationId;
            action.statusRefId = 1;
            action.competitionOrgId = compOrgId;
            action.createdBy = userId;

            return action;
        }
        catch(error){
            throw error;
        }
    }
}