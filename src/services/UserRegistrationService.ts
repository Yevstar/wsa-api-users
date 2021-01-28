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

    public async userTransferRegistration(requsetBody: any) {
        try {
            const { userIdTrasferingTo, userIdTrasferingFrom ,userRegUniqueKey, competitionUniqueKey } = requsetBody
            console.log('='.repeat(20));
            console.log(userIdTrasferingTo);
            console.log(userIdTrasferingFrom);
            console.log(userRegUniqueKey);
            console.log(competitionUniqueKey);
            console.log('='.repeat(20));

            const competitionInfo = await this.entityManager.query(`SELECT * FROM wsa_registrations.competition WHERE competitionUniqueKey = "${competitionUniqueKey}"`);

            const competitionId = competitionInfo[0].id;

            const allUserRegistrations = await this.entityManager.query(`SELECT * FROM wsa_registrations.userRegistration WHERE userId = ${userIdTrasferingFrom}`);

            await this.entityManager.query(`UPDATE wsa_registrations.userRegistration SET userId = ${userIdTrasferingTo} WHERE userRegUniqueKey = "${userRegUniqueKey}"`)

            if (allUserRegistrations.length === 1) {
                // If the user we are transferring from has no other registrations for this competition - update
                console.log('Current user has only 1 registration.');

                await this.entityManager.query(`UPDATE wsa_users.userRoleEntity SET isDeleted = 1 WHERE roleId = 18 and entityTypeId = 1 and entityId = ${competitionId} and userId = ${userIdTrasferingFrom}`);

            } else {
                console.log(allUserRegistrations.length);
                console.log('Do nothing');
                console.log(JSON.stringify(allUserRegistrations));
            }

            await this.entityManager.query(`INSERT INTO wsa_users.userRoleEntity (roleId, userId, entityTypeId, entityId) VALUES (18, ${userIdTrasferingTo}, 1, ${competitionId})`);

            return requsetBody
        } catch (error) {
            throw error
        }
    }
}