import { Service } from 'typedi';
import BaseService from '../services/BaseService';
import { UserRegistration } from '../models/UserRegistration';

@Service()
export default class UserRegistrationService extends BaseService<UserRegistration> {
  modelName(): string {
    return UserRegistration.name;
  }

  public async userMedicalDetailsByCompetition(requestBody: any) {
    try {
      let userId = requestBody.userId;
      let competitionUniqueKey = requestBody.competitionUniqueKey;
      let result = await this.entityManager.query(
        'call wsa_users.usp_user_medical_details_by_competition(?,?)',
        [userId, competitionUniqueKey],
      );
      return result[0];
    } catch (error) {
      throw error;
    }
  }

  public async userTransferRegistration(requsetBody: any) {
    try {
      const {
        userIdTrasferingTo,
        userIdTrasferingFrom,
        userRegUniqueKey,
        competitionUniqueKey,
      } = requsetBody;

      const competitionInfo = await this.entityManager.query(
        `SELECT * FROM wsa_registrations.competition WHERE competitionUniqueKey = "${competitionUniqueKey}"`,
      );
      const userRegistrationInfo = await this.entityManager.query(
        `SELECT * FROM wsa_registrations.userRegistration WHERE userRegUniqueKey = "${userRegUniqueKey}"`,
      );

      const competitionId = competitionInfo[0].id;
      const userRegistrationId = userRegistrationInfo[0].id;

      const allUserRegistrations = await this.entityManager.query(
        `SELECT * FROM wsa_registrations.userRegistration WHERE userId = ${userIdTrasferingFrom}`,
      );

      // update userRegistration
      await this.entityManager.query(
        `UPDATE wsa_registrations.userRegistration SET userId = ${userIdTrasferingTo} WHERE userRegUniqueKey = "${userRegUniqueKey}"`,
      );

      // insert new userRoleEntity
      await this.entityManager.query(
        `INSERT INTO wsa_users.userRoleEntity (roleId, userId, entityTypeId, entityId) VALUES (18, ${userIdTrasferingTo}, 1, ${competitionId})`,
      );

      // update player
      await this.entityManager.query(
        `UPDATE wsa_competitions.player SET userId = ${userIdTrasferingTo} WHERE userRegistrationId = ${userRegistrationId}`,
      );

      // update nonPlayer
      await this.entityManager.query(
        `UPDATE wsa_competitions.nonPlayer SET userId = ${userIdTrasferingTo} WHERE userRegistrationId = ${userRegistrationId}`,
      );

      //   update transactions   //

      if (allUserRegistrations.length === 1) {
        // If the user we are transferring from has no other registrations for this competition - update
        console.log('Current user has only 1 registration.');

        await this.entityManager.query(
          `UPDATE wsa_users.userRoleEntity SET isDeleted = 1 WHERE roleId = 18 and entityTypeId = 1 and entityId = ${competitionId} and userId = ${userIdTrasferingFrom}`,
        );
      }

      return { responseMessage: 'Registration Successfully Transfered' };
    } catch (error) {
      throw error;
    }
  }
}
