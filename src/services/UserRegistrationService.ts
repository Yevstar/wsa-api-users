import { Service } from "typedi";
import BaseService from "../services/BaseService";
import { UserRegistration } from "../models/UserRegistration";

@Service()
export default class UserRegistrationService extends BaseService<UserRegistration> {

    modelName(): string {
        return UserRegistration.name;
    }

    public async userMedicalDetailsByCompetition(requestBody: any){
        try{
            
            let userId = requestBody.userId;
            let competitionUniqueKey = requestBody.competitionUniqueKey;
            let result = await this.entityManager.query("call wsa_users.usp_user_medical_details_by_competition(?,?)",
            [userId, competitionUniqueKey]);
            return result[0];
        }catch(error){
            throw error;
        }
    }
}