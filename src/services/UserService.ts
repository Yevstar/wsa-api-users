import { round } from 'lodash';
import nodeMailer from 'nodemailer';
import QRcode from 'qrcode';
import speakeasy from 'speakeasy';
import twilio from 'twilio';
import { Inject, Service } from 'typedi';
import { Brackets, In } from 'typeorm-plus';
import AppConstants from '../constants/AppConstants';
import EmailConstants from '../constants/EmailConstants';
import { LookForExistingUserBody } from '../controller/types';
import { logger } from '../logger';
import { Booking } from '../models/Booking';
import { CommunicationTrack } from '../models/CommunicationTrack';
import { EntityType } from '../models/security/EntityType';
import { Function } from '../models/security/Function';
import { Role } from '../models/security/Role';
import { RoleFunction } from '../models/security/RoleFunction';
import { UserRoleEntity } from '../models/security/UserRoleEntity';
import { Team } from '../models/Team';
import { User } from '../models/User';
import { LinkedEntities } from '../models/views/LinkedEntities';
import {
  feeIsNull,
  getParentEmail,
  isArrayPopulated,
  isNotNullAndUndefined,
  isObjectNotNullAndUndefined,
  paginationData,
  stringTONumber,
  timestamp,
} from '../utils/Utils';
import BaseService from './BaseService';
import UserRoleEntityService from './UserRoleEntityService';
import aws from 'aws-sdk';

import HelperService from './HelperService';
import { CompetitionOrganisation } from '../models/CompetitionOrganisation';
import { Roster } from '../models/security/Roster';
import { Match } from '../models/Match';
@Service()
export default class UserService extends BaseService<User> {
  s3: aws.S3;

  constructor() {
    super();
    aws.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });
    this.s3 = new aws.S3();
  }

  @Inject()
  userRoleEntityService: UserRoleEntityService;

  @Inject()
  helperService: HelperService;

  modelName(): string {
    return User.name;
  }

  public async getRegistrationFormDetails(requestBody) {
    const userRegistrationDraftResponse = await this.entityManager.query(
      `SELECT * FROM wsa_registrations.userRegistrationDraft WHERE participantData->'$.registrationId' = "${requestBody.registrationId}"`,
    );

    const registrationTrackResponse = await this.entityManager.query(
      `SELECT * FROM wsa_registrations.registrationTrack WHERE registrationId = ${userRegistrationDraftResponse[0].registrationId} AND stepsId = 2`,
    );

    userRegistrationDraftResponse.push(registrationTrackResponse[0]);

    return userRegistrationDraftResponse;
  }

  public async findByEmail(email: string): Promise<User> {
    return this.entityManager
      .createQueryBuilder(User, 'user')
      .andWhere('LOWER(user.email) = :email and user.isDeleted = 0', {
        email: email.toLowerCase().trim(),
      })
      .addSelect('user.password')
      .addSelect('user.reset')
      .getOne();
  }

  public async deleteUser(userId: number, loginUserId: number) {
    return this.entityManager
      .createQueryBuilder(User, 'user')
      .update(User)
      .set({ isDeleted: 1, updatedBy: loginUserId, updatedOn: new Date() })
      .andWhere('user.id = :userId', { userId })
      .execute();
  }

  public async findByCredentials(email: string, password: string): Promise<User> {
    return this.entityManager
      .createQueryBuilder(User, 'user')
      .andWhere('LOWER(user.email) = :email and user.password = :password and isDeleted = 0', {
        email: email.toLowerCase(),
        password: password,
      })
      .getOne();
  }

  public async findByCredentialsForTFA(email: string, password: string): Promise<User> {
    return this.entityManager
      .createQueryBuilder(User, 'user')
      .andWhere('LOWER(user.email) = :email and user.password = :password and isDeleted = 0', {
        email: email.toLowerCase(),
        password: password,
      })
      .addSelect('user.tfaEnabled')
      .addSelect('user.tfaSecret')
      .addSelect('user.tfaSecretUrl')
      .getOne();
  }

  public async findByCredentialsForWeb(email: string, password: string): Promise<User> {
    return this.entityManager
      .createQueryBuilder(User, 'user')
      .innerJoin(
        UserRoleEntity,
        'ure',
        'user.id = ure.userId and ure.entityType = 2 and ure.isDeleted = 0',
      )
      .innerJoin(
        Role,
        'role',
        'role.id = ure.roleId and role.applicableToWeb = 1 and role.isDeleted = 0',
      )
      .andWhere('LOWER(user.email) = :email and user.password = :password and user.isDeleted = 0', {
        email: email.toLowerCase(),
        password: password,
      })
      .getOne();
  }

  public async findByFullName(name: string): Promise<User[]> {
    let builder = this.entityManager
      .createQueryBuilder(User, 'user')
      .where('LOWER(user.firstName) like :query', { query: `${name.toLowerCase()}%` })
      .orWhere('LOWER(user.lastName) like :query', { query: `${name.toLowerCase()}%` });
    return builder.getMany();
  }

  public async findByTeamId(teamId: number): Promise<User[]> {
    return this.entityManager
      .createQueryBuilder(User, 'user')
      .innerJoin('scorers', 'scorers', 'scorers.userId = user.id')
      .innerJoin('team', 'team', 'team.id = scorers.teamId')
      .where('scorers.teamId = :teamId', { teamId })
      .getMany();
  }

  public async findByToken(token: string): Promise<User> {
    return this.entityManager
      .createQueryBuilder(User, 'user')
      .andWhere('user.reset = :token', { token: token })
      .addSelect('user.reset')
      .getOne();
  }

  public async findChildPlayerUserDetails(ids: number[]): Promise<User[]> {
    return await this.entityManager.query(
      'select u.id as id, LOWER(u.email) as email, u.firstName as firstName,\n' +
        'u.lastName as lastName, u.mobileNumber as mobileNumber,\n' +
        'u.genderRefId as genderRefId, u.marketingOptIn as marketingOptIn,\n' +
        'u.photoUrl as photoUrl, u.password as password,\n' +
        'u.dateOfBirth as dateOfBirth, u.firebaseUID as firebaseUID,\n' +
        'u.statusRefId as statusRefId\n' +
        'from wsa_users.user u \n' +
        'where u.id in (?);',
      [ids],
    );
  }

  public async findUserFullDetailsById(id: number): Promise<User> {
    return await this.entityManager.query('select * from wsa_users.user user where user.id = ?;', [
      id,
    ]);
  }

  public async userExist(email: string): Promise<number> {
    return this.entityManager
      .createQueryBuilder(User, 'user')
      .where('LOWER(user.email) = :email', { email: email.toLowerCase() })
      .getCount();
  }

  public async update(email: string, user: User) {
    return this.entityManager
      .createQueryBuilder(User, 'user')
      .update(User)
      .set(user)
      .andWhere('LOWER(user.email) = :email', { email: email.toLowerCase() })
      .execute();
  }

  public async updateUserDetail(userId: number, user: User) {
    return this.entityManager
      .createQueryBuilder(User, 'user')
      .update(User)
      .set({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        mobileNumber: user.mobileNumber,
      })
      .andWhere('user.id = :userId', { userId })
      .execute();
  }

  public async updatePhoto(userId: number, photoUrl: string) {
    return this.entityManager
      .createQueryBuilder(User, 'user')
      .update(User)
      .set({ photoUrl: photoUrl })
      .andWhere('user.id = :userId', { userId })
      .execute();
  }

  public async friendDashboard(
    requestBody: any,
    sortBy: string = undefined,
    sortOrder: 'ASC' | 'DESC' = undefined,
  ) {
    try {
      let limit = requestBody.paging.limit;
      let offset = requestBody.paging.offset;
      let result = await this.entityManager.query(
        'call wsa_users.usp_friend_dashboard(?,?,?,?,?,?)',
        [
          requestBody.yearRefId,
          requestBody.organisationUniqueKey,
          limit,
          offset,
          sortBy,
          sortOrder,
        ],
      );

      if (isArrayPopulated(result[1])) {
        let totalCount = result[0].find(x => x).totalCount;
        let responseObject = paginationData(stringTONumber(totalCount), limit, offset);
        responseObject['friends'] = result[1];
        return responseObject;
      } else return [];
    } catch (error) {
      throw error;
    }
  }

  public async friendExportData(
    requestBody: any,
    sortBy: string = undefined,
    sortOrder: 'ASC' | 'DESC' = undefined,
  ) {
    try {
      let limit = requestBody.paging.limit;
      let offset = requestBody.paging.offset;
      let result = await this.entityManager.query(
        'call wsa_users.usp_friend_dashboard(?,?,?,?,?,?)',
        [
          requestBody.yearRefId,
          requestBody.organisationUniqueKey,
          limit,
          offset,
          sortBy,
          sortOrder,
        ],
      );

      if (isArrayPopulated(result[1])) {
        return result[1];
      } else return [];
    } catch (error) {
      throw error;
    }
  }

  public async referFriendDashboard(
    requestBody: any,
    sortBy: string = undefined,
    sortOrder: 'ASC' | 'DESC' = undefined,
  ) {
    try {
      let limit = requestBody.paging.limit;
      let offset = requestBody.paging.offset;
      let result = await this.entityManager.query(
        'call wsa_users.usp_refer_friend_dashboard(?,?,?,?,?,?)',
        [
          requestBody.yearRefId,
          requestBody.organisationUniqueKey,
          limit,
          offset,
          sortBy,
          sortOrder,
        ],
      );

      if (isArrayPopulated(result[1])) {
        let totalCount = result[0].find(x => x).totalCount;
        let responseObject = paginationData(stringTONumber(totalCount), limit, offset);
        responseObject['referFriends'] = result[1];
        return responseObject;
      }

      return [];
    } catch (error) {
      throw error;
    }
  }

  public async referFriendExportData(
    requestBody: any,
    sortBy: string = undefined,
    sortOrder: 'ASC' | 'DESC' = undefined,
  ) {
    try {
      let limit = requestBody.paging.limit;
      let offset = requestBody.paging.offset;
      let result = await this.entityManager.query(
        'call wsa_users.usp_refer_friend_dashboard(?,?,?,?,?,?)',
        [
          requestBody.yearRefId,
          requestBody.organisationUniqueKey,
          limit,
          offset,
          sortBy,
          sortOrder,
        ],
      );

      if (isArrayPopulated(result[1])) {
        return result[1];
      } else return [];
    } catch (error) {
      throw error;
    }
  }

  public async spectatorDashboard(
    requestBody: any,
    sortBy: string = undefined,
    sortOrder: 'ASC' | 'DESC' = undefined,
  ) {
    try {
      let limit = requestBody.paging.limit;
      let offset = requestBody.paging.offset;
      let result = await this.entityManager.query(
        'call wsa_users.usp_spectator_dashboard(?,?,?,?)',
        [requestBody.yearRefId, requestBody.organisationUniqueKey, limit, offset],
      );

      if (isArrayPopulated(result[1])) {
        let totalCount = result[0].find(x => x).totalCount;
        let responseObject = paginationData(stringTONumber(totalCount), limit, offset);
        responseObject['spectator'] = result[1];
        return responseObject;
      }

      return [];
    } catch (error) {
      throw error;
    }
  }

  public async getUserPermission(userId: number): Promise<any[]> {
    return this.entityManager.query(
      'select distinct r.id as id,\n' +
        '       r.name as name,\n' +
        "       (select concat('[', group_concat(JSON_OBJECT('id', fn.id, 'name', fn.name)),']')\n" +
        '         from functionRole rf2 inner join `function` fn on rf2.functionId = fn.id ' +
        '           where rf2.roleId = r.id) as functions\n' +
        'from userRoleEntity ure\n' +
        '         inner join functionRole rf on ure.roleId = rf.roleId\n' +
        '         inner join role r on rf.roleId = r.id\n' +
        '         inner join `function` f on rf.functionId = f.id\n' +
        'where ure.userId = ? group by id, name, functions;',
      [userId],
    );
  }

  public async getRoles(): Promise<any[]> {
    return this.entityManager
      .createQueryBuilder(Role, 'r')
      .select([
        'r.id as id',
        'r.name as name',
        'r.description as description',
        'r.applicableToWeb as applicableToWeb',
      ])
      .where('r.isDeleted = 0')
      .getRawMany();
  }

  public async getRole(roleName: string): Promise<any> {
    return this.entityManager
      .createQueryBuilder(Role, 'r')
      .select(['r.id as id', 'r.name as name'])
      .where('r.name = :roleName', { roleName })
      .getRawOne();
  }

  public async getFunctions(): Promise<any[]> {
    return this.entityManager
      .createQueryBuilder(Function, 'f')
      .select(['f.id as id', 'f.name as name'])
      .getRawMany();
  }

  public async getFunctionsByRole(roleId: number): Promise<any[]> {
    return this.entityManager
      .createQueryBuilder(Function, 'f')
      .select(['f.id as id', 'f.name as name'])
      .innerJoin(RoleFunction, 'rf', 'rf.functionId = f.id')
      .where('rf.roleId = :roleId', { roleId })
      .getRawMany();
  }

  public async getRoleFunctions(): Promise<any[]> {
    let result = await this.entityManager.query(
      'select r.id as id,\n' +
        '       r.name as name,\n' +
        "       (select concat('[', group_concat(JSON_OBJECT('id', fn.id, 'name', fn.name)),']')\n" +
        '         from functionRole rf2 inner join `function` fn on rf2.functionId = fn.id ' +
        '           where rf2.roleId = r.id) as functions\n' +
        'from functionRole rf\n' +
        '         inner join role r on rf.roleId = r.id\n' +
        '         inner join `function` f on rf.functionId = f.id\n' +
        'group by id, name, functions;',
    );

    for (let p of result) {
      p['functions'] = JSON.parse(p['functions']);
    }
    return result;
  }

  public async getEntityTypes(): Promise<any[]> {
    return this.entityManager
      .createQueryBuilder(EntityType, 'et')
      .select(['et.id as id', 'et.name as name'])
      .getRawMany();
  }

  public async getEntityType(entityTypeName: string): Promise<any> {
    return this.entityManager
      .createQueryBuilder(EntityType, 'et')
      .select(['et.id as id', 'et.name as name'])
      .where('et.name = :entityTypeName', { entityTypeName })
      .getRawOne();
  }

  public async getUserListByIds(ids: number[]): Promise<User[]> {
    return this.entityManager
      .createQueryBuilder(User, 'u')
      .select(['u.id as id', 'u.firstName as firstName', 'u.lastName as lastName'])
      .andWhere('u.id in (:ids)', { ids })
      .getRawMany();
  }

  public async getUsersByIdWithLinkedEntity(userId: number): Promise<any> {
    return this.entityManager
      .createQueryBuilder(User, 'u')
      .select([
        'u.id as id',
        'LOWER(u.email) as email',
        'u.firstName as firstName',
        'u.lastName as lastName',
        'u.mobileNumber as mobileNumber',
        'u.genderRefId as genderRefId',
        'u.marketingOptIn as marketingOptIn',
        'u.photoUrl as photoUrl',
        'u.statusRefId as statusRefId',
      ])
      .addSelect(
        "concat('[', group_concat(distinct JSON_OBJECT('entityTypeId', " +
          "le.linkedEntityTypeId, 'entityId', le.linkedEntityId, 'competitionId', le.inputEntityId, 'name', le.linkedEntityName)),']') " +
          'as linkedEntity',
      )
      .innerJoin(UserRoleEntity, 'ure', 'u.id = ure.userId')
      .innerJoin(RoleFunction, 'fr', 'fr.roleId = ure.roleId')
      .innerJoin(
        LinkedEntities,
        'le',
        'le.linkedEntityTypeId = ure.entityTypeId AND ' + 'le.linkedEntityId = ure.entityId',
      )
      .andWhere('ure.userId = :userId', { userId })
      .andWhere('le.inputEntityTypeId = 1')
      .getRawOne();
  }

  public async getUsersBySecurity(
    entityTypeId: number,
    entityId: number,
    userName: string,
    sec: { functionId?: number; roleIds?: number[] },
    sortBy?: string,
    sortOrder?: 'ASC' | 'DESC',
    offset: string = undefined,
    limit: string = undefined,
    individualLinkedEntityRequired: boolean = false,
    basedOnAvailability: boolean = false,
    startTime: Date = undefined,
    endTime: Date = undefined,
    basedOnLinkedEntities: boolean = true,
    competitionId: number = null,
    organisationId: number = null,
  ): Promise<any> {
    let query = this.entityManager
      .createQueryBuilder(User, 'u')
      .select([
        'u.id as id',
        'LOWER(u.email) as email',
        'u.firstName as firstName',
        'u.lastName as lastName',
        'u.mobileNumber as mobileNumber',
        'u.genderRefId as genderRefId',
        'u.marketingOptIn as marketingOptIn',
        'u.photoUrl as photoUrl',
        'u.firebaseUID as firebaseUID',
        'u.statusRefId as statusRefId',
        'u.accreditationLevelUmpireRefId as accreditationLevelUmpireRefId',
        'u.accreditationUmpireExpiryDate as accreditationUmpireExpiryDate',
        'u.associationLevelInfo as associationLevelInfo',
        'u.accreditationLevelCoachRefId as accreditationLevelCoachRefId',
        'u.isPrerequestTrainingComplete as isPrerequestTrainingComplete',
        'u.accreditationCoachExpiryDate as accreditationCoachExpiryDate',
      ]);

    if (individualLinkedEntityRequired) {
      query.addSelect(
        "concat('[',JSON_OBJECT('entityTypeId', " +
          "le.linkedEntityTypeId, 'entityId', le.linkedEntityId, " +
          "'name', le.linkedEntityName, 'parentName', " +
          "le.linkedParentName, 'competitionOrganisationId', " +
          "team.competitionOrganisationId),']') as linkedEntity",
      );
    } else if (basedOnLinkedEntities) {
      query.addSelect(
        "concat('[', group_concat(distinct JSON_OBJECT('entityTypeId', " +
          "le.linkedEntityTypeId, 'entityId', le.linkedEntityId, 'name', le.linkedEntityName, " +
          "'parentName', le.linkedParentName, 'competitionOrganisationId', team.competitionOrganisationId)),']') " +
          'as linkedEntity',
      );
    }

    query
      .innerJoin(UserRoleEntity, 'ure', 'u.id = ure.userId')
      .innerJoin(RoleFunction, 'fr', 'fr.roleId = ure.roleId');
    if (basedOnLinkedEntities) {
      query
        .innerJoin(
          LinkedEntities,
          'le',
          'le.linkedEntityTypeId = ure.entityTypeId AND le.linkedEntityId = ure.entityId',
        )
        .leftJoin(
          Team,
          'team',
          '(team.id = le.linkedEntityId and le.linkedEntityTypeId = :teamEntityId)',
          { teamEntityId: EntityType.TEAM },
        );
    }

    if (isObjectNotNullAndUndefined(sec) && isObjectNotNullAndUndefined(sec.functionId)) {
      let id = sec.functionId;
      query.innerJoin(Function, 'f', 'f.id = fr.functionId').andWhere('f.id = :id', { id });
    }

    if (isArrayPopulated(sec.roleIds)) {
      let ids = sec.roleIds;
      query.innerJoin(Role, 'r', 'r.id = fr.roleId').andWhere('r.id in (:ids)', { ids });
    }

    if (
      basedOnAvailability &&
      isObjectNotNullAndUndefined(startTime) &&
      isObjectNotNullAndUndefined(endTime)
    ) {
      query.leftJoin(
        Booking,
        'bk',
        'bk.userId = u.id and ((bk.startTime ' +
          '<= :startTime and bk.endTime > :startTime) or (bk.startTime ' +
          '>= :startTime and bk.startTime < :endTime))',
        {
          startTime: startTime,
          endTime: endTime,
        },
      );
      query.leftJoin(Roster, 'ros', 'ros.userId = u.id');
      query.leftJoin(
        subQuery => {
          const query = subQuery
            .select([
              'id',
              'startTime',
              'matchDuration',
              'DATE_ADD(startTime, INTERVAL matchDuration MINUTE) AS approxEndTime',
            ])
            .from(Match, 'm');
          return query;
        },
        'match',
        'match.id = ros.matchId and ((match.startTime ' +
          '<= :startTime and match.approxEndTime > :startTime) or (match.startTime ' +
          '>= :startTime and match.startTime < :endTime))',
        {
          startTime: startTime,
          endTime: endTime,
        },
      );
      query.andWhere('bk.userId is null');
      query.andWhere('match.id is null');
    }

    if (
      basedOnLinkedEntities &&
      isObjectNotNullAndUndefined(entityTypeId) &&
      isObjectNotNullAndUndefined(entityId) &&
      entityId != 0
    ) {
      query
        .andWhere('le.inputEntityTypeId = :entityTypeId', { entityTypeId })
        .andWhere('le.inputEntityId = :entityId', { entityId });
    } else {
      query
        .andWhere('ure.entityTypeId = :entityTypeId', { entityTypeId })
        .andWhere('ure.entityId = :entityId', { entityId });
    }

    if (userName) {
      query.andWhere('LOWER(CONCAT(u.firstName, " ", u.lastName)) like :query', {
        query: `%${userName.toLowerCase()}%`,
      });
    }

    if (sortBy) {
      if (sortBy.indexOf('linkedEntity') > -1) {
        const sortStr = sortBy.split('.')[1];
        if (sortStr === 'name') {
          query.orderBy('le.linkedEntityName', sortOrder);
        } else if (sortStr === 'parentName') {
          query.orderBy('le.linkedParentName', sortOrder);
        }
      } else {
        query.orderBy(`u.${sortBy}`, sortOrder);
      }
    }

    if (individualLinkedEntityRequired) {
      query.groupBy('u.id, le.linkedEntityId, le.linkedEntityTypeId');
    } else {
      query.groupBy('u.id');
    }

    if (sortBy) {
      if (sortBy === 'firstName') {
        query.orderBy('firstName', sortOrder);
      } else if (sortBy === 'lastName') {
        query.orderBy('lastName', sortOrder);
      } else if (sortBy === 'email') {
        query.orderBy('email', sortOrder);
      } else if (sortBy === 'mobileNumber') {
        query.orderBy('mobileNumber', sortOrder);
      } else if (sortBy === 'linkedEntityName') {
        query.orderBy('le.linkedEntityName', sortOrder);
      }
    }

    const OFFSET = stringTONumber(offset);
    const LIMIT = stringTONumber(limit);

    let isCompetitionOrganiser = true;
    if (competitionId && organisationId) {
      isCompetitionOrganiser = await this.helperService.isCompetitionOrganiser(
        organisationId,
        competitionId,
      );
    }
    const compOrg = await this.entityManager
      .createQueryBuilder(CompetitionOrganisation, 'compOrg')
      .where('compOrg.competitionId = :competitionId and compOrg.orgId = :organisationId', {
        competitionId,
        organisationId,
      })
      .getOne();
    const compOrgId = compOrg ? compOrg.id : null;

    if (offset && limit) {
      const userData = (await query.offset(OFFSET).limit(LIMIT).getRawMany()) as RawUserByRole[];
      const userCount = await query.getCount();
      userData.forEach(user => {
        user.linkedEntity = this.filterLinkedEntityByOrganisationRole(
          user.linkedEntity,
          isCompetitionOrganiser,
          compOrgId,
        );
      });
      return { userCount, userData };
    } else {
      const userCount = null;
      const userData = (await query.getRawMany()) as RawUserByRole[];
      userData.forEach(user => {
        user.linkedEntity = this.filterLinkedEntityByOrganisationRole(
          user.linkedEntity,
          isCompetitionOrganiser,
          compOrgId,
        );
      });
      return { userCount, userData };
    }
  }

  protected filterLinkedEntityByOrganisationRole(
    stringifiedLinkedEntity: string,
    isCompetitionOrganiser: boolean,
    compOrgId: number = null,
  ) {
    if (isCompetitionOrganiser) {
      return stringifiedLinkedEntity;
    }

    let linkedEntity = JSON.parse(stringifiedLinkedEntity);
    if (!Array.isArray(linkedEntity)) {
      linkedEntity = linkedEntity ? [linkedEntity] : [];
    }

    return JSON.stringify(
      linkedEntity.filter(entity => entity.competitionOrganisationId === compOrgId),
    );
  }

  public async sentMail(templateObj, OrganisationName, receiverData, password, entityId, userId) {
    let url = process.env.liveScoresWebHost;
    logger.info(`sendMail : url ${url}`);
    console.log('*****Template---:' + templateObj + '--' + JSON.stringify(templateObj));
    // let html = ``;
    let subject = templateObj.emailSubject;

    templateObj.emailBody = templateObj.emailBody.replace(
      '${user.firstName}',
      receiverData.firstName,
    );
    templateObj.emailBody = templateObj.emailBody.replace('${Organisation}', OrganisationName);
    templateObj.emailBody = templateObj.emailBody.replace(
      AppConstants.appName,
      process.env.APP_NAME,
    );
    templateObj.emailBody = templateObj.emailBody.replace(
      '${user.lastName}',
      receiverData.lastName,
    );
    templateObj.emailBody = templateObj.emailBody.replace(
      '${userName}',
      receiverData.email.toLowerCase(),
    );
    templateObj.emailBody = templateObj.emailBody.replace('${password}', password);
    templateObj.emailBody = templateObj.emailBody.replace('${process.env.liveScoresWebHost}', url);
    templateObj.emailBody = templateObj.emailBody.replace('${Organisation}', OrganisationName);

    const targetEmail = `${
      parseInt(receiverData.isInActive, 10) === 1
        ? getParentEmail(receiverData.email)
        : receiverData.email
    }`;

    try {
      await this.sendAndLogEmail(
        targetEmail,
        receiverData.id,
        subject,
        templateObj.emailBody,
        password,
        3,
        entityId,
        userId,
      );
    } catch (error) {
      //cTrack.statusRefId = 2;
    }
  }

  public async sentMailForEmailUpdate(contact, templateObj, adminUser, organisationName) {
    try {
      let subject = templateObj.emailSubject;
      let url = process.env.TEAM_REGISTRATION_URL;
      //  let html = ``;
      //  url = url.replace(AppConstants.userRegUniquekey,playerBody.userRegUniqueKey)
      templateObj.emailBody = templateObj.emailBody.replace(
        AppConstants.firstName,
        contact.firstName,
      );
      templateObj.emailBody = templateObj.emailBody.replace(
        AppConstants.adminFirstName,
        adminUser.firstName,
      );
      templateObj.emailBody = templateObj.emailBody.replace(
        AppConstants.adminLastName,
        adminUser.lastName,
      );
      if (organisationName == null) {
        templateObj.emailBody = templateObj.emailBody.replace(AppConstants.fromAffiliateName, '');
      } else {
        templateObj.emailBody = templateObj.emailBody.replace(
          AppConstants.affiliateName,
          organisationName,
        );
      }
      templateObj.emailBody = templateObj.emailBody.replace(AppConstants.email, contact.email);
      templateObj.emailBody = templateObj.emailBody.replace(
        AppConstants.appName,
        process.env.APP_NAME,
      );
      templateObj.emailBody = templateObj.emailBody.replace(
        AppConstants.appName,
        process.env.APP_NAME,
      );
      templateObj.emailBody = templateObj.emailBody.replace(
        AppConstants.appName,
        process.env.APP_NAME,
      );

      const targetEmail = `${
        parseInt(contact.isInActive, 10) === 1 ? getParentEmail(contact.email) : contact.email
      }`;
      try {
        await this.sendAndLogEmail(
          targetEmail,
          contact.id,
          subject,
          templateObj.emailBody,
          '',
          8,
          contact.id,
          adminUser.id,
        );
      } catch (error) {
        // cTrack.statusRefId = 2;
      }
    } catch (error) {
      logger.error(` ERROR occurred in individual mail ` + error);
      throw error;
    }
  }

  public async sendTeamRegisterPlayerInviteMail(
    resBody,
    playerBody,
    templateObj,
    userId,
    password,
    registrationId,
    roleArray,
  ) {
    try {
      let subject = templateObj.emailSubject;
      subject = subject.replace(AppConstants.teamName, resBody.teamName);
      let url = process.env.TEAM_REGISTRATION_URL;
      // let html = ``;
      url = url.replace(AppConstants.userRegUniquekey, playerBody.userRegUniqueKey);
      templateObj.emailBody = templateObj.emailBody.replace(
        AppConstants.name,
        playerBody.firstName + ' ' + playerBody.lastName,
      );
      templateObj.emailBody = templateObj.emailBody.replace(
        AppConstants.registerPersonName,
        resBody.firstName + ' ' + resBody.lastName,
      );
      templateObj.emailBody = templateObj.emailBody.replace(
        AppConstants.teamName,
        resBody.teamName,
      );
      let divisionName = '';
      if (!isArrayPopulated(roleArray)) {
        templateObj.emailBody = templateObj.emailBody.replace(AppConstants.inDivision, '');
      } else {
        divisionName = roleArray[0];
      }
      templateObj.emailBody = templateObj.emailBody.replace(AppConstants.division, divisionName);
      templateObj.emailBody = templateObj.emailBody.replace(
        AppConstants.competionName,
        resBody.competitionName,
      );
      templateObj.emailBody = templateObj.emailBody.replace(
        AppConstants.startDate,
        resBody.startDate,
      );
      // if (playerBody.membershipProductFeesTypeRefId == 1) {
      //     templateObj.emailBody = templateObj.emailBody.replace(AppConstants.url, url);
      // } else {
      //     if (playerBody.transactionId == null) {
      //         templateObj.emailBody = templateObj.emailBody.replace(AppConstants.url, url);
      //     } else {
      //         templateObj.emailBody = templateObj.emailBody.replace(AppConstants.clickHereToRegister, "");
      //     }
      // }
      if (playerBody.notPaid == null) {
        templateObj.emailBody = templateObj.emailBody.replace(
          AppConstants.completeYouRegistration,
          AppConstants.updateYourProfile,
        );
        templateObj.emailBody = templateObj.emailBody.replace(
          AppConstants.registerBoforeCloseDate,
          '',
        );
      }
      templateObj.emailBody = templateObj.emailBody.replace(AppConstants.url, url);
      templateObj.emailBody = templateObj.emailBody.replace(AppConstants.userNameAndPassword, '');

      templateObj.emailBody = templateObj.emailBody.replace(
        AppConstants.startDate,
        resBody.startDate,
      );
      templateObj.emailBody = templateObj.emailBody.replace(
        AppConstants.competionName,
        resBody.competitionName,
      );
      templateObj.emailBody = templateObj.emailBody.replace(
        AppConstants.regCloseDate,
        resBody.registrationCloseDate,
      );
      templateObj.emailBody = templateObj.emailBody.replace(
        AppConstants.startDate,
        resBody.startDate,
      );
      templateObj.emailBody = templateObj.emailBody.replace(
        AppConstants.registerPersonName,
        resBody.firstName + ' ' + resBody.lastName,
      );
      templateObj.emailBody = templateObj.emailBody.replace(
        AppConstants.registerPersonNumber,
        resBody.mobileNumber,
      );
      templateObj.emailBody = templateObj.emailBody.replace(
        AppConstants.AffiliateName,
        resBody.organisationName,
      );
      templateObj.emailBody = templateObj.emailBody.replace(
        AppConstants.AffiliateName,
        resBody.organisationName,
      );

      const targetEmail = `${
        parseInt(playerBody.isInActive, 10) === 1
          ? getParentEmail(playerBody.email)
          : playerBody.email
      }`;

      await this.sendAndLogEmail(
        targetEmail,
        playerBody.userId,
        subject,
        templateObj.emailBody,
        '',
        0,
        registrationId,
        userId,
      );
    } catch (error) {
      //cTrack.statusRefId = 2;
    }
  }

  public async userPersonalDetails(userId: number, organisationUniqueKey: any) {
    try {
      console.log(`${userId} and ${organisationUniqueKey}`)
      let result = await this.entityManager.query('call wsa_users.usp_user_personal_details(?,?)', [
        userId,
        organisationUniqueKey || null
      ]);
      let competitionMap = new Map();
      let teamMap = new Map();
      let userMap = new Map();
      let divisionMap = new Map();
      let userObj = null;
      if (result != null) {
        if (isArrayPopulated(result[0])) {
          for (let item of result[0]) {
            let userTemp = userMap.get(item.userId);
            let competitionTemp = competitionMap.get(item.competitionId);
            let teamTemp =
              item.teamUniqueKey == null
                ? teamMap.get(item.teamId)
                : teamMap.get(item.teamUniqueKey);
            let divTemp = divisionMap.get(item.divisionId);
            let competitionObj = {
              competitionId: item.competitionId,
              competitionName: item.competitionName,
              competitionUniqueKey: item.competitionUniqueKey,
              divisionId: item.divisionId,
              divisionName: item.divisionName,
              yearRefId: Number(item.yearRefId),
              teams: [],
              divisions: [],
            };
            let teamObj = {
              teamId: item.teamId,
              teamName: item.teamName,
            };

            let divisionObj = {
              divisionId: item.divisionId,
              divisionName: item.divisionName,
            };

            let parentEmailId = item.email.split('.');
            let parentEmailString = parentEmailId[0];
            for (let n = 1; n < parentEmailId.length - 1; n++) {
              parentEmailString = parentEmailString + '.' + parentEmailId[n];
            }

            if (userTemp == undefined) {
              userObj = {
                userId: item.userId,
                firstName: item.firstName,
                middleName: item.middleName,
                lastName: item.lastName,
                email: (item.isInActive == 1 ? parentEmailString : item.email).toLowerCase(),
                mobileNumber: item.mobileNumber,
                photoUrl: item.photoUrl,
                dateOfBirth: item.dateOfBirth,
                postalCode: item.postalCode,
                genderRefId: item.genderRefId,
                gender: item.gender,
                emergencyFirstName: item.emergencyFirstName,
                emergencyLastName: item.emergencyLastName,
                emergencyContactNumber: item.emergencyContactNumber,
                emergencyContactRelationshipId: item.emergencyContactRelationshipId,
                languages: item.languages,
                nationalityRefId: item.nationalityRefId,
                nationalityName: item.nationalityName,
                countryName: item.countryName,
                isDisability: item.isDisability,
                accrediationLevel: item.umpireAccreditationLevel,
                accreditationLevelUmpireRefId: item.accreditationLevelUmpireRefId,
                accreditationLevelCoachRefId: item.accreditationLevelCoachRefId,
                accreditationUmpireExpiryDate: item.accreditationUmpireExpiryDate,
                accreditationCoachExpiryDate: item.accreditationCoachExpiryDate,
                umpireAccreditationLevel: item.umpireAccreditationLevel,
                coachAccreditationLevel: item.coachAccreditationLevel,
                competitions: [],
              };

              if (competitionObj.competitionId != null) {
                if (item.teamId != null) {
                  competitionObj.teams.push(teamObj);
                  teamMap.set(item.teamId, teamObj);
                }

                if (item.divisionId != null) {
                  competitionObj.divisions.push(divisionObj);
                  divisionMap.set(item.divisionId, divisionObj);
                }
                userObj.competitions.push(competitionObj);
                competitionMap.set(item.competitionId, competitionObj);
              }
              userMap.set(item.userId, userObj);
            } else {
              if (competitionTemp == undefined) {
                if (competitionObj.competitionId != null) {
                  if (item.teamId != null && teamTemp == undefined) {
                    competitionObj.teams.push(teamObj);
                    teamMap.set(item.teamId, teamObj);
                  }
                  if (item.divisionId != null && divTemp == undefined) {
                    competitionObj.divisions.push(divisionObj);
                    divisionMap.set(item.divisionId, divisionObj);
                  }
                  userTemp.competitions.push(competitionObj);
                  competitionMap.set(item.competitionId, competitionObj);
                }
              } else {
                if (item.teamId != null && teamTemp == undefined) {
                  competitionTemp.teams.push(teamObj);
                  teamMap.set(item.teamId, teamObj);
                }
                if (item.divisionId != null && divTemp == undefined) {
                  competitionTemp.divisions.push(divisionObj);
                  divisionMap.set(item.divisionId, divisionObj);
                }
              }
            }
          }
        }
      }

      return userObj;
    } catch (error) {
      throw error;
    }
  }

  public async uploadDocument(file: any) {
    return new Promise((resolve, reject) => {
      const params = {
        Bucket: process.env.S3_DOCUMENTS_UPLOAD_BUCKET,
        Key: file.originalname,
        Body: file.buffer,
        ServerSideEncryption: 'aws:kms',
      };
      this.s3.upload(params, (err: any, data: any) => {
        if (err) {
          console.log('Upload Error: ', err);
          resolve({ status: 'error' });
        }
        if (data) {
          console.log('Upload Success: ', data.Location);
          resolve({ status: 'done', url: data.Location });
        }
      });
    });
  }

  public async addDocument(data: any) {
    let {
      userId,
      organisationUniqueKey,
      dateUploaded,
      docType,
      docUrl,
      documentId,
      docTypeDescription,
    } = data;
    try {
      if (!!documentId) {
        let [
          document,
        ] = await this.entityManager.query(`select * from wsa_users.documents where id=?`, [
          documentId,
        ]);
        if (document) {
          dateUploaded = document.docUrl == docUrl ? document.dateUploaded : dateUploaded;
          await this.entityManager.query(
            `update wsa_users.documents set docType=?, docTypeDescription=?, docUrl=?, dateUploaded=? where id=?`,
            [docType, docTypeDescription, docUrl, dateUploaded, documentId],
          );
          return documentId;
        }
      }

      let {
        insertId,
      } = await this.entityManager.query(
        `insert into wsa_users.documents(userId, organisationUniqueKey, dateUploaded, docType, docTypeDescription, docUrl) values(?,?,?,?,?,?)`,
        [userId, organisationUniqueKey, dateUploaded, docType, docTypeDescription, docUrl],
      );
      return insertId;
    } catch (error) {
      throw error;
    }
  }

  public async removeDocument(id: number) {
    try {
      await this.entityManager.query(`delete from wsa_users.documents where id = ?`, [id]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  public async userDocuments(userId: number, organisationUniqueKey: any) {
    try {
      let result = await this.entityManager.query(
        'select * from wsa_users.documents doc where doc.userId = ? and doc.organisationUniqueKey = ?',
        [userId, organisationUniqueKey],
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  public async userPersonalDetailsByCompetition(requestBody: any) {
    try {
      let userId = requestBody.userId;
      let competitionUniqueKey = requestBody.competitionUniqueKey;
      let result = await this.entityManager.query(
        'call wsa_users.usp_user_personal_details_by_competition(?,?)',
        [userId, competitionUniqueKey],
      );
      // if (isArrayPopulated(result[0])) {
      //     for (let item of result[0]) {
      //         item.friends = JSON.parse(item.friends);
      //         item.referFriends = JSON.parse(item.referFriends);
      //     }
      // }

      const { getStripeCustomerID = false } = requestBody;

      if (isArrayPopulated(result[0])) {
        for (let item of result[0]) {
          if (item.isInActive == 1) {
            let parentEmailString = item.email.substr(0, item.email.lastIndexOf('.'));
            item.email = parentEmailString.toLowerCase();
          }
          if (false === getStripeCustomerID && !!item.stripeCustomerAccountId) {
            delete item.stripeCustomerAccountId;
          }
          if (isArrayPopulated(item.childContacts)) {
            for (let child of item.childContacts) {
              if (child.isInActive == 1) {
                let parentEmailString = child.email.substr(0, child.email.lastIndexOf('.'));
                child.email = parentEmailString.toLowerCase();
              }
              if (false === getStripeCustomerID && !!item.stripeCustomerAccountId) {
                delete item.stripeCustomerAccountId;
              }
            }
          }
        }
      }

      return result[0];
    } catch (error) {
      throw error;
    }
  }

  public async userActivitiesPlayer(requestBody: any) {
    try {
      let limit = requestBody.paging.limit;
      let offset = requestBody.paging.offset;
      let userId = requestBody.userId;
      let competitionId = requestBody.competitionId;
      let yearRefId = requestBody.yearRefId;
      let result = await this.entityManager.query(
        'call wsa_users.usp_user_activity_player(?,?,?,?,?)',
        [userId, competitionId, yearRefId, limit, offset],
      );
      if (result != null) {
        let totalCount = result[0].find(x => x).totalCount;
        let responseObject = paginationData(stringTONumber(totalCount), limit, offset);
        responseObject['activityPlayers'] = result[1];
        return responseObject;
      }
    } catch (error) {
      throw error;
    }
  }

  public async userActivitiesParent(requestBody: any) {
    try {
      let limit = requestBody.paging.limit;
      let offset = requestBody.paging.offset;
      let userId = requestBody.userId;
      let competitionId = requestBody.competitionId;
      let yearRefId = requestBody.yearRefId;
      let result = await this.entityManager.query(
        'call wsa_users.usp_user_activity_parent(?,?,?,?,?,?)',
        [userId, competitionId, yearRefId, limit, offset, requestBody.organisationId],
      );
      if (result != null) {
        let totalCount = result[0].find(x => x).totalCount;
        let responseObject = paginationData(stringTONumber(totalCount), limit, offset);
        responseObject['activityParents'] = result[1];
        return responseObject;
      }
    } catch (error) {
      throw error;
    }
  }

  public async userActivitiesRoster(requestBody: any, roleId: number, matchStatus: string) {
    try {
      let limit = requestBody.paging.limit;
      let offset = requestBody.paging.offset;
      let userId = requestBody.userId;
      let competitionId = requestBody.competitionId;
      let yearRefId = requestBody.yearRefId;
      let result = await this.entityManager.query(
        'call wsa_users.usp_user_activity_roster(?,?,?,?,?,?,?)',
        [userId, competitionId, yearRefId, roleId, matchStatus, limit, offset],
      );
      if (result != null) {
        let totalCount = result[0].find(x => x).totalCount;
        let responseObject = paginationData(stringTONumber(totalCount), limit, offset);
        responseObject['activityRoster'] = result[1];
        return responseObject;
      }
    } catch (error) {
      throw error;
    }
  }

  public async userActivitiesManager(requestBody: any) {
    try {
      let limit = requestBody.paging.limit;
      let offset = requestBody.paging.offset;
      let userId = requestBody.userId;
      let competitionId = requestBody.competitionId;
      let yearRefId = requestBody.yearRefId;
      let result = await this.entityManager.query(
        'call wsa_users.usp_user_activity_manager(?,?,?,?,?)',
        [userId, competitionId, yearRefId, limit, offset],
      );
      if (result != null) {
        let totalCount = result[0].find(x => x).totalCount;
        let responseObject = paginationData(stringTONumber(totalCount), limit, offset);
        responseObject['activityManager'] = result[1];
        return responseObject;
      }
    } catch (error) {
      throw error;
    }
  }

  public async getNetSetGoRegistration(
    requestBody: any,
    sortBy: string = undefined,
    sortOrder: 'ASC' | 'DESC' = undefined,
  ) {
    try {
      let limit = requestBody.paging.limit;
      let offset = requestBody.paging.offset;
      let organisationId = requestBody.organisationId;
      let yearRefId = requestBody.yearRefId;
      let result = await this.entityManager.query('call wsa_users.usp_get_netsetgo(?,?,?,?,?,?)', [
        organisationId,
        yearRefId,
        limit,
        offset,
        sortBy,
        sortOrder,
      ]);
      if (result != null) {
        let totalCount = result[0].find(x => x).totalCount;
        let responseObject = paginationData(stringTONumber(totalCount), limit, offset);
        responseObject['netSetGo'] = result[1];
        return responseObject;
      }
    } catch (error) {
      throw error;
    }
  }

  public async userRegistrationDetails(requestBody: any): Promise<any> {
    try {
      let limit = requestBody.myRegPaging.limit;
      let offset = requestBody.myRegPaging.offset;
      let userId = requestBody.userId;
      let competitionId = requestBody.competitionId;
      let organisationId = requestBody.organisationId;
      let yearRefId = requestBody.yearRefId;
      let result = await this.entityManager.query(
        'call wsa_users.usp_user_registration_details(?,?,?,?,?,?)',
        [limit, offset, userId, yearRefId, competitionId, organisationId],
      );
      if (result != null) {
        let totalCount = result[0].find(x => x).totalCount;
        let responseObject = paginationData(stringTONumber(totalCount), limit, offset);
        let arr = [];
        if (isArrayPopulated(result[1])) {
          for (let item of result[1]) {
            let deRegisterStatus = null;
            let deRegisterId = null;
            if (item.deRegisterStatusRefId) {
              item.deRegisterStatusRefId = JSON.parse(item.deRegisterStatusRefId);
              deRegisterStatus = item.deRegisterStatusRefId.find(x => x).deRegisterStatus;
              deRegisterId = item.deRegisterStatusRefId.find(x => x).deRegisterId;
            }
            console.log(`!!!!!${deRegisterStatus}&&&&&&&${deRegisterId}`);
            let paymentStatus = deRegisterStatus != null ? deRegisterStatus : item.paymentStatus;
            let alreadyDeRegistered = deRegisterStatus != null ? 1 : 0;
            let userMap = new Map();
            let paidByUsers = [];
            let transactions = item.paidByUsers != null ? JSON.parse(item.paidByUsers) : [];
            (transactions || []).map((t, index) => {
              let key = t.paidByUserId + '#' + t.paidBy;
              if (userMap.get(key) == undefined) {
                let obj = {
                  paidBy: t.paidBy,
                  paidByUserId: t.paidByUserId,
                };
                paidByUsers.push(obj);
                userMap.set(key, obj);
              }
            });
            let obj = {
              key: item.key,
              affiliate: item.affiliate,
              membershipProduct: item.membershipProduct,
              membershipType: item.membershipType,
              competitionName: item.competitionName,
              divisionName: item.divisionName,
              divisionId: item.divisionId,
              membershipMappingId: item.membershipProductMappingId,
              teamId: item.teamId,
              competitionId: item.competitionUniqueKey,
              registrationId: item.registrationUniqueKey,
              userRegUniquekey: item.userRegUniqueKey,
              organisationId: item.organisationUniqueKey,
              competitionMembershipProductTypeId: item.competitionMembershipProductTypeId,
              competitionMembershipProductDivisionId: item.competitionMembershipProductDivisionId,
              // feesPaid: item.feesPaid,
              // vouchers: item.vouchers,
              //shopPurchases: item.shopPurchases,
              deRegisterId: deRegisterId,
              paymentStatus: paymentStatus,
              paymentStatusFlag: item.paymentStatusFlag,
              expiryDate: item.expiryDate,
              compFeesPaid: item.compFeesPaid,
              competitionEndDate: item.competitionEndDate,
              isRegisterer: item.isRegisterer,
              //paymentType: item.paymentType,
              registrationForm: [],
              alreadyDeRegistered: alreadyDeRegistered,
              // paidBy: item.paidBy,
              // paidByUserId: item.paidByUserId,
              paidByUsers: paidByUsers,
              numberOfMatches: item.numberOfMatches
            };

            if (isArrayPopulated(result[2])) {
              let filterRes = result[2].filter(x => x.orgRegId == item.orgRegId);
              if (isArrayPopulated(filterRes)) {
                for (let i of filterRes) {
                  let regObj = {
                    registrationSettingsRefId: i.registrationSettingsRefId,
                    description: i.description,
                    contentValue: '',
                    friends: [],
                    referFriends: [],
                    playedBefore: [],
                    volunteers: [],
                    favourites: [],
                  };
                  // if (i.registrationSettingsRefId == 7) {
                  //     regObj.contentValue = item.playedBefore == 0 ? 'No' : 'Yes';
                  //     if (item.playedBefore == 1) {
                  //         let objPl = {
                  //             key: i.registrationSettingsRefId,
                  //             playedBefore: regObj.contentValue,
                  //             playedClub: item.playedClub,
                  //             playedGrade: item.playedGrade,
                  //             playedYear: item.playedYear,
                  //             lastCaptainName: item.lastCaptainName
                  //         }
                  //         regObj.playedBefore.push(objPl);
                  //     }
                  //     obj.registrationForm.push(regObj);
                  // } else
                  if (i.registrationSettingsRefId == 7) {
                    regObj.contentValue =
                      (item.positionId1 != null ? item.positionId1 : '') +
                      (item.positionId1 != null && item.positionId2 != null ? ', ' : '') +
                      (item.positionId2 != null ? item.positionId2 : '');
                    obj.registrationForm.push(regObj);
                    // } else if (i.registrationSettingsRefId == 7) {
                    //     regObj.contentValue = item.lastCaptainName;
                    //     obj.registrationForm.push(regObj);
                  } else if (i.registrationSettingsRefId == 8) {
                    if (isArrayPopulated(result[3])) {
                      let filteredFriend = result[3].filter(
                        x => x.playerId == item.playerId && x.friendRelationshipTypeRefId == 1,
                      );
                      if (isArrayPopulated(filteredFriend)) {
                        regObj.friends = filteredFriend;
                      }
                    }
                    obj.registrationForm.push(regObj);
                  } else if (i.registrationSettingsRefId == 9) {
                    if (isArrayPopulated(result[3])) {
                      let filteredFriend = result[3].filter(
                        x => x.playerId == item.playerId && x.friendRelationshipTypeRefId == 2,
                      );
                      if (isArrayPopulated(filteredFriend)) {
                        regObj.referFriends = filteredFriend;
                      }
                    }
                    obj.registrationForm.push(regObj);
                    // } else if (i.registrationSettingsRefId == 11) {
                    //     regObj.contentValue = item.isConsentPhotosGiven == 1 ? "Yes" : "No";
                    //     obj.registrationForm.push(regObj);
                  } else if (i.registrationSettingsRefId == 10) {
                    if (isArrayPopulated(result[4])) {
                      let volunteers = result[4].filter(
                        x => x.registrationId == item.registrationId,
                      );
                      if (isArrayPopulated(volunteers)) {
                        regObj.volunteers = volunteers;
                      }
                    }
                    obj.registrationForm.push(regObj);
                  } else if (i.registrationSettingsRefId == 10) {
                    let objFav = {
                      favouriteFireBird: item.favouriteFireBird,
                      favouriteTeam: item.favouriteTeamName,
                    };
                    regObj.favourites.push(objFav);
                    obj.registrationForm.push(regObj);
                  }
                }
              }
            }
            arr.push(obj);
          }
        }
        responseObject['registrationDetails'] = arr;
        return responseObject;
      }
    } catch (error) {
      throw error;
    }
  }

  public async otherRegistrationDetails(requestBody: any): Promise<any> {
    try {
      let limit = requestBody.otherRegPaging.limit;
      let offset = requestBody.otherRegPaging.offset;
      let userId = requestBody.userId;
      let query = await this.entityManager.query(
        'call wsa_users.usp_registration_your_details(?,?,?)',
        [limit, offset, userId],
      );

      if (query != null) {
        let totalCount = query[0].find(x => x).totalCount;
        let responseObject = paginationData(stringTONumber(totalCount), limit, offset);
        if (isArrayPopulated(query[1])) {
          for (let item of query[1]) {
            let totalPaidFee = 0;
            if (isArrayPopulated(item.feePaid)) {
              let invoiceFailedStatus = item.feePaid.find(x => x.invoiceStatus == 'failed') ? 1 : 0;
              let transactionFailedStatus = item.feePaid.find(x => x.transactionStatus == 6)
                ? 1
                : 0;
              let competitionId = item.feePaid.find(x => x.competitionId != null);
              let divisionId = item.feePaid.find(x => x.divisionId != null);
              let registrationId = item.feePaid.find(x => x.registrationId != null);
              item['invoiceFailedStatus'] = invoiceFailedStatus;
              item['transactionFailedStatus'] = transactionFailedStatus;
              item['competitionId'] = competitionId ? competitionId.competitionId : null;
              item['divisionId'] = divisionId ? divisionId.divisionId : null;
              item['registrationId'] = registrationId ? registrationId.registrationId : null;
              for (let fee of item.feePaid) {
                let total = 0;
                if (isArrayPopulated(fee)) {
                  for (let f of fee) {
                    if (f.transactionStatus == 2) {
                      total =
                        feeIsNull(f.feeAmount) +
                        feeIsNull(f.gstAmount) -
                        feeIsNull(f.discountAmount) -
                        feeIsNull(f.familyDiscountAmount) -
                        (feeIsNull(f.governmentVoucherAmount)
                          ? feeIsNull(f.governmentVoucherAmount)
                          : 0);
                      totalPaidFee = feeIsNull(totalPaidFee) + feeIsNull(total);
                    }
                  }
                } else {
                  if (fee.transactionStatus == 2) {
                    total =
                      feeIsNull(fee.feeAmount) +
                      feeIsNull(fee.gstAmount) -
                      feeIsNull(fee.discountAmount) -
                      feeIsNull(fee.familyDiscountAmount) -
                      (feeIsNull(fee.governmentVoucherAmount)
                        ? feeIsNull(fee.governmentVoucherAmount)
                        : 0);
                    totalPaidFee = feeIsNull(totalPaidFee) + feeIsNull(total);
                  }
                }
              }
            }
            item.feePaid = feeIsNull(totalPaidFee);
            if (item.isInActive == 1) {
              let parentEmailString = item.email.substr(0, item.email.lastIndexOf('.'));
              item.email = parentEmailString.toLowerCase();
            }
          }
        }
        responseObject['registrationYourDetails'] = query[1];
        return responseObject;
      }
    } catch (err) {
      throw err;
    }
  }

  public async teamRegistrationDetails(requestBody: any): Promise<any> {
    try {
      let limit = requestBody.teamRegPaging.limit;
      let offset = requestBody.teamRegPaging.offset;
      let userId = requestBody.userId;
      let query = await this.entityManager.query(
        'call wsa_users.usp_registration_team_details(?,?,?)',
        [limit, offset, userId],
      );

      if (query != null) {
        let totalCount = query[0].find(x => x).totalCount;
        let responseObject = paginationData(stringTONumber(totalCount), limit, offset);
        responseObject['registrationTeamDetails'] = query[1];
        return responseObject;
      }
    } catch (err) {
      throw err;
    }
  }

  public async childRegistrationDetails(requestBody: any): Promise<any> {
    try {
      let limit = requestBody.childRegPaging.limit;
      let offset = requestBody.childRegPaging.offset;
      let userId = requestBody.userId;
      let query = await this.entityManager.query(
        'call wsa_users.usp_registration_child_details(?,?,?)',
        [limit, offset, userId],
      );

      if (query != null) {
        let totalCount = query[0].find(x => x).totalCount;
        let responseObject = paginationData(stringTONumber(totalCount), limit, offset);
        if (isArrayPopulated(query[1])) {
          for (let item of query[1]) {
            let totalPaidFee = 0;
            if (isArrayPopulated(item.feePaid)) {
              let invoiceFailedStatus = item.feePaid.find(x => x.invoiceStatus == 'failed') ? 1 : 0;
              let transactionFailedStatus = item.feePaid.find(x => x.transactionStatus == 6)
                ? 1
                : 0;
              let competitionId = item.feePaid.find(x => x.competitionId != null);
              let divisionId = item.feePaid.find(x => x.divisionId != null);
              let registrationId = item.feePaid.find(x => x.registrationId != null);
              item['invoiceFailedStatus'] = invoiceFailedStatus;
              item['transactionFailedStatus'] = transactionFailedStatus;
              item['competitionId'] = competitionId ? competitionId.competitionId : null;
              item['divisionId'] = divisionId ? divisionId.divisionId : null;
              item['registrationId'] = registrationId ? registrationId.registrationId : null;
              for (let fee of item.feePaid) {
                let total = 0;
                if (isArrayPopulated(fee)) {
                  for (let f of fee) {
                    if (f.transactionStatus == 2) {
                      total =
                        feeIsNull(f.feeAmount) +
                        feeIsNull(f.gstAmount) -
                        feeIsNull(f.discountAmount) -
                        feeIsNull(f.familyDiscountAmount) -
                        (feeIsNull(f.governmentVoucherAmount)
                          ? feeIsNull(f.governmentVoucherAmount)
                          : 0);
                      totalPaidFee = feeIsNull(totalPaidFee) + feeIsNull(total);
                    }
                  }
                } else {
                  if (fee.transactionStatus == 2) {
                    total =
                      feeIsNull(fee.feeAmount) +
                      feeIsNull(fee.gstAmount) -
                      feeIsNull(fee.discountAmount) -
                      feeIsNull(fee.familyDiscountAmount) -
                      (feeIsNull(fee.governmentVoucherAmount)
                        ? feeIsNull(fee.governmentVoucherAmount)
                        : 0);
                    totalPaidFee = feeIsNull(totalPaidFee) + feeIsNull(total);
                  }
                }
              }
            }
            item.feePaid = feeIsNull(totalPaidFee);
            if (item.isInActive == 1) {
              let parentEmailString = item.email.substr(0, item.email.lastIndexOf('.'));
              item.email = parentEmailString.toLowerCase();
            }
          }
        }
        responseObject['childRegistrationDetails'] = query[1];
        return responseObject;
      }
    } catch (error) {
      throw error;
    }
  }

  public async getTeamMembers(teamBody) {
    try {
      let teamId = teamBody.teamId;
      let userId = teamBody.userId;
      let limit = teamBody.teamMemberPaging.limit;
      let offset = teamBody.teamMemberPaging.offset;
      let divisionId = teamBody.competitionMembershipProductDivisionId;

      let query = await this.entityManager.query(
        `call wsa_users.usp_registration_team_member_details(?,?,?,?,?)`,
        [limit, offset, userId, teamId, divisionId],
      );

      if (query != null) {
        let totalCount = query[0].find(x => x).totalCount;
        let responseObject = paginationData(stringTONumber(totalCount), limit, offset);
        if (isArrayPopulated(query[1])) {
          for (let item of query[1]) {
            let totalPaidFee = 0;
            let totalPendingFee = 0;
            // item.organisationId = item.organisationUniqueKey;
            if (isArrayPopulated(item.paidFee)) {
              for (let fee of item.paidFee) {
                let total = 0;
                if (isArrayPopulated(fee)) {
                  for (let f of fee) {
                    total =
                      feeIsNull(f.feeAmount) +
                      feeIsNull(f.gstAmount) -
                      feeIsNull(f.discountAmount) -
                      feeIsNull(f.familyDiscountAmount) -
                      (feeIsNull(f.governmentVoucherAmount)
                        ? feeIsNull(f.governmentVoucherAmount)
                        : 0);
                    totalPaidFee = feeIsNull(totalPaidFee) + feeIsNull(total);
                  }
                } else {
                  total =
                    feeIsNull(fee.feeAmount) +
                    feeIsNull(fee.gstAmount) -
                    feeIsNull(fee.discountAmount) -
                    feeIsNull(fee.familyDiscountAmount) -
                    (feeIsNull(fee.governmentVoucherAmount)
                      ? feeIsNull(fee.governmentVoucherAmount)
                      : 0);
                  totalPaidFee = feeIsNull(totalPaidFee) + feeIsNull(total);
                }
              }
            }
            item.paidFee = round(totalPaidFee, 2);

            if (isArrayPopulated(item.pendingFee)) {
              for (let fee of item.pendingFee) {
                let total = 0;
                if (isArrayPopulated(fee)) {
                  for (let f of fee) {
                    total =
                      feeIsNull(f.feeAmount) +
                      feeIsNull(f.gstAmount) -
                      feeIsNull(f.discountAmount) -
                      feeIsNull(f.familyDiscountAmount) -
                      (feeIsNull(f.governmentVoucherAmount)
                        ? feeIsNull(f.governmentVoucherAmount)
                        : 0);
                    totalPendingFee = feeIsNull(totalPendingFee) + feeIsNull(total);
                  }
                } else {
                  total =
                    feeIsNull(fee.feeAmount) +
                    feeIsNull(fee.gstAmount) -
                    feeIsNull(fee.discountAmount) -
                    feeIsNull(fee.familyDiscountAmount) -
                    (feeIsNull(fee.governmentVoucherAmount)
                      ? feeIsNull(fee.governmentVoucherAmount)
                      : 0);
                  totalPendingFee = feeIsNull(totalPendingFee) + feeIsNull(total);
                }
              }
            }
            item.pendingFee = round(totalPendingFee, 2);
          }
        }
        responseObject['teamMembers'] = query[1];
        return responseObject;
      }
    } catch (error) {
      throw error;
    }
  }

  public async generateTfaSecret(user: User) {
    const secret = speakeasy.generateSecret({
      issuer: 'Netball Live Scores',
      name: `Netball Live Scores (${user.email})`,
      length: 6,
    });

    user.tfaSecret = secret.base32;
    user.tfaSecretUrl = secret.otpauth_url;

    await this.update(user.email, user);

    const log = {
      id: user.id,
      firstName: user.firstName,
      middleName: user.middleName,
      lastName: user.lastName,
      mobileNumber: user.mobileNumber,
      email: user.email,
      tfaEnabled: user.tfaEnabled,
      tfaSecret: user.tfaSecret,
      tfaSecretUrl: user.tfaSecretUrl,
    };
    logger.info(`Add TFA: ${new Date()}`);
    logger.info(JSON.stringify(log));

    return await QRcode.toDataURL(secret.otpauth_url);
  }

  public confirmTfaSecret(user: User, code: string) {
    return speakeasy.totp.verify({
      secret: user.tfaSecret,
      encoding: 'base32',
      window: 1, // let user enter previous totp token because ux
      token: code,
    });
  }

  public async updateTfaStatus(user) {
    user.tfaEnabled = 1;
    await this.update(user.email, user);

    const log = {
      id: user.id,
      firstName: user.firstName,
      middleName: user.middleName,
      lastName: user.lastName,
      mobileNumber: user.mobileNumber,
      email: user.email,
      tfaEnabled: user.tfaEnabled,
      tfaSecret: user.tfaSecret,
      tfaSecretUrl: user.tfaSecretUrl,
    };
    logger.info(`TFA Enabled: ${new Date()}`);
    logger.info(JSON.stringify(log));
  }

  public async userHistory(requestBody: any) {
    try {
      let limit = requestBody.paging.limit;
      let offset = requestBody.paging.offset;
      let userId = requestBody.userId;
      let result = await this.entityManager.query('call wsa_users.usp_user_history(?,?,?)', [
        userId,
        limit,
        offset,
      ]);
      if (result != null) {
        let totalCount = result[0].find(x => x).totalCount;
        let responseObject = paginationData(stringTONumber(totalCount), limit, offset);
        responseObject['userHistory'] = result[1];
        return responseObject;
      }
    } catch (error) {
      throw error;
    }
  }

  public async userDelete(userId: number, entityId: number): Promise<UserRoleEntity> {
    try {
      let query = await this.entityManager
        .createQueryBuilder(UserRoleEntity, 'ure')
        .where(
          'ure.userId = :userId and ure.entityId = :entityId and ure.entityTypeId = 2 and ure.roleId = 2 and ure.isDeleted = 0',
          { userId: userId, entityId: entityId },
        )
        .getOne();

      return query;
    } catch (error) {
      throw error;
    }
  }

  public async insertIntoCommunicationTrack(ctrack: CommunicationTrack) {
    await this.entityManager.query(
      `insert into wsa_common.communicationTrack(id, emailId,content,subject,contactNumber,userId,entityId,communicationType,statusRefId,deliveryChannelRefId,createdBy) values(?,?,?,?,?,?,?,?,?,?,?)`,
      [
        ctrack.id,
        ctrack.emailId,
        ctrack.content,
        ctrack.subject,
        ctrack.contactNumber,
        ctrack.userId,
        ctrack.entityId,
        ctrack.communicationType,
        ctrack.statusRefId,
        ctrack.deliveryChannelRefId,
        ctrack.createdBy,
      ],
    );
  }

  public async getPlayerIncident(
    userId: number,
    competitionId: string,
    yearId: number,
    offset: number,
    limit: number,
  ) {
    const result = await this.entityManager.query(
      `call wsa_users.usp_user_activity_incident(?,?,?,?,?)`,
      [userId, competitionId, yearId, limit, offset],
    );
    let totalCount = result[1] && result[1].find(x => x) ? result[1].find(x => x).totalCount : 0;
    let responseObject = paginationData(stringTONumber(totalCount), limit, offset);
    responseObject['results'] = result[0];

    return responseObject;
  }

  public async resetTFA(userId: number) {
    return this.entityManager
      .createQueryBuilder(User, 'user')
      .update()
      .set({ tfaEnabled: null, tfaSecret: null, tfaSecretUrl: null })
      .where('id = :userId', { userId })
      .execute();
  }

  public findExistingUser(data: LookForExistingUserBody) {
    return this.entityManager.query(
      `
            SELECT
              id,
              mobileNumber,
              email,
              firstName,
              lastName
            FROM
              wsa_users.user 
            WHERE (
              (lower(firstName) = ? AND lower(lastName) = ? AND mobileNumber = ?) OR
              (lower(firstName) = ? AND lower(lastName) = ? AND dateOfBirth = ?) OR
              (lower(firstName) = ? AND mobileNumber = ? AND dateOfBirth = ?) OR
              (lower(lastName) = ? AND mobileNumber = ? AND dateOfBirth = ?)
            )
        `,
      [
        data.firstName.toLowerCase(),
        data.lastName.toLowerCase(),
        data.mobileNumber,
        data.firstName.toLowerCase(),
        data.lastName.toLowerCase(),
        data.dateOfBirth,
        data.firstName.toLowerCase(),
        data.mobileNumber,
        data.dateOfBirth,
        data.lastName.toLowerCase(),
        data.mobileNumber,
        data.dateOfBirth,
      ],
    );
  }

  public async getEmailAndPhoneById(userId: number) {
    return await this.entityManager.query(
      `
            SELECT email,mobileNumber, isInActive
                FROM wsa_users.user
                WHERE id = ?
                LIMIT 1
        `,
      [userId],
    );
  }

  public async getDigitCodeById(userId: number) {
    return await this.entityManager.query(
      `
            SELECT digit_code
                FROM wsa_users.user
                WHERE id = ?
                LIMIT 1
        `,
      [userId],
    );
  }

  public async findMatchesForMerging(userId: number) {
    const users = await this.entityManager.query(
      `
            SELECT id, firstName, lastName, mobileNumber, email, dateOfBirth
            FROM wsa_users.user
            WHERE id = ?`,
      [userId],
    );
    const user = users[0];

    return this.entityManager.query(
      `SELECT id, firstName, middleName, lastname, mobileNumber, email, dateOfBirth
            FROM wsa_users.user 
            WHERE
            ((LOWER(firstName) = ? AND mobileNumber = ? AND mobileNumber is not null) OR
            (LOWER(lastName) = ? AND mobileNumber = ? AND dateOfBirth = ?)) AND 
            (isDeleted = 0 AND
            id not in (?))`,
      [
        user.firstName.toLowerCase(),
        user.mobileNumber,
        user.lastName.toLowerCase(),
        user.mobileNumber,
        user.dateOfBirth,
        userId,
      ],
    );
  }

  public async findMatchesForLinking(user: User) {
    return this.entityManager.query(
      `SELECT id, firstName, middleName, lastname, mobileNumber, email, dateOfBirth
            FROM wsa_users.user 
            WHERE
            ((LOWER(firstName) = ? AND mobileNumber = ? AND mobileNumber is not null) OR
            (LOWER(lastName) = ? AND mobileNumber = ? AND dateOfBirth = ?))`,
      [
        user.firstName.toLowerCase(),
        user.mobileNumber,
        user.lastName.toLowerCase(),
        user.mobileNumber,
        user.dateOfBirth,
      ],
    );
  }

  public async updateById(id: number, user: User) {
    return this.entityManager
      .createQueryBuilder(User, 'user')
      .update(User)
      .set(user)
      .andWhere('id = :id', { id })
      .execute();
  }

  public async replaceUserId(oldId: number, newId: number): Promise<any> {
    await this.entityManager.query('call wsa_users.usp_update_user_id_in_all_scope(?,?)', [
      newId,
      oldId,
    ]);
  }

  public async replaceUserIdsInNews(oldId: number, newId: number): Promise<any> {
    const newsRows = await this.entityManager.query(`
            SELECT  id, toUserIds
            FROM wsa.news
            WHERE toUserIds IS NOT NULL AND toUserIds <> '' AND JSON_CONTAINS(CONCAT('[', toUserIds, ']'), '${oldId}', '$')`);
    newsRows.forEach(async (news: any) => {
      const toUserIds = JSON.parse(news.toUserIds);
      const index = toUserIds.indexOf(oldId);
      toUserIds[index] = newId;
      const query = `UPDATE wsa.news set toUserIds='[${toUserIds.join(',')}]' where id=${news.id}`;
      await this.entityManager.query(query);
    });
  }

  public async replaceUserIdsInCommunication(oldId: number, newId: number): Promise<any> {
    const communicationRows = await this.entityManager.query(`
            SELECT  id, toUserIds
            FROM wsa_common.communication
            WHERE toUserIds IS NOT NULL AND toUserIds <> '' AND JSON_CONTAINS(CONCAT('[', toUserIds, ']'), '${oldId}', '$')`);
    communicationRows.forEach(async (communication: any) => {
      const toUserIds = JSON.parse(communication.toUserIds);
      const index = toUserIds.indexOf(oldId);
      toUserIds[index] = newId;
      const query = `UPDATE wsa.news set toUserIds='${toUserIds.join(',')}' where id=${
        communication.id
      }`;
      await this.entityManager.query(query);
    });
  }

  public async deactivateUser(
    otherUserId: number,
    updatedBy: number = undefined,
    masterUserId: number = undefined,
  ) {
    const userToDeactivate = await this.entityManager.findOne(User, {
      where: {
        id: otherUserId,
      },
    });
    const diactivatedEmail = userToDeactivate.email + '_' + timestamp();

    return this.entityManager.query(
      `UPDATE user SET statusRefId = 2, 
            isDeleted = 1, email = ?, updatedBy = ?, mergedUserId = ? WHERE id = ?`,
      [diactivatedEmail, updatedBy, masterUserId, otherUserId],
    );
  }

  public async getAffiliates(uids: number[]) {
    return this.entityManager.query(`
            SELECT u.id, o.name AS affiliate
            FROM wsa_users.user u
            LEFT JOIN wsa_users.userRoleEntity ure ON ure.userId = u.id
            LEFT JOIN wsa_users.organisation o ON ure.entityId = o.id and ure.entityTypeId = 2
            WHERE ure.entityTypeId = 2
            AND ure.isDeleted = 0
            AND u.id in (${uids.join(',')})

            UNION

            SELECT u.id, le.linkedParentName AS affiliate
            FROM wsa_users.user u
            LEFT JOIN wsa_users.userRoleEntity ure ON ure.userId = u.id
            LEFT JOIN wsa_users.linked_entities le ON 
                ure.entityId = le.linkedEntityId AND ure.entityTypeId = le.linkedEntityTypeId
            WHERE ure.isDeleted = 0 AND u.id in (${uids.join(',')})

            UNION

            SELECT u.id, o.name AS affiliate
            FROM wsa_users.user u
            LEFT JOIN wsa_competitions.player p ON p.userId = u.id
            LEFT JOIN wsa_users.organisation o ON p.organisationId = o.id
            WHERE p.isDeleted = 0 AND o.isDeleted = 0 AND u.id in (${uids.join(',')})

            UNION

            SELECT u.id, o.name AS affiliate
            FROM wsa_users.user u
            LEFT JOIN wsa_competitions.nonPlayer p ON p.userId = u.id
            LEFT JOIN wsa_users.organisation o ON p.organisationId = o.id
            WHERE p.isDeleted = 0 AND o.isDeleted = 0 AND u.id in (${uids.join(',')})
        `);
  }

  public async isChildUser(parentUserId: number, childUserId: number): Promise<boolean> {
    const parentRoles = await this.entityManager.find(UserRoleEntity, {
      where: {
        userId: parentUserId,
        entityId: childUserId,
        entityTypeId: 4,
        roleId: In([9, 23]),
      },
    });

    return parentRoles.length > 0;
  }

  public async sendAndLogSMS(
    toNumber: string,
    toUserId: number,
    body: string,
    communicationType: number,
    entityId: number,
    creatorId: number,
  ) {
    try {
      let cTrack = new CommunicationTrack();
      cTrack.id = 0;
      cTrack.communicationType = communicationType;
      cTrack.entityId = entityId;
      cTrack.deliveryChannelRefId = 2;
      cTrack.contactNumber = toNumber;
      cTrack.userId = toUserId;
      cTrack.subject = '';
      cTrack.createdBy = creatorId;

      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        body: `${body}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: `${toNumber}`,
      });

      cTrack.statusRefId = 1;
      logger.info(`sendSMS: {body} : SMS sent succesfully,  ${toNumber}`);
      this.insertIntoCommunicationTrack(cTrack);
      return Promise.resolve();
    } catch (error) {
      let cTrack = new CommunicationTrack();
      cTrack.id = 0;
      cTrack.communicationType = communicationType;
      cTrack.entityId = entityId;
      cTrack.deliveryChannelRefId = 2;
      cTrack.contactNumber = toNumber;
      cTrack.userId = toUserId;
      cTrack.subject = '';
      cTrack.createdBy = creatorId;

      cTrack.statusRefId = 2;
      logger.error(`sendSMS: {body} : SMS error ${error},  ${toNumber}`);
      this.insertIntoCommunicationTrack(cTrack);

      // Here i commented the below code as the caller is not handling the promise reject
      // return Promise.reject(err);s
      throw error;
    }
  }

  public async sendAndLogEmail(
    toEmail: string,
    toUserId: number,
    subject: string,
    htmlBody: string,
    password: string,
    communicationType: number,
    entityId: number,
    creatorId: number,
  ) {
    try {
      console.log('~~~~sendAndLogEmail');
      const transporter = nodeMailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.MAIL_USERNAME, // generated ethereal user
          pass: process.env.MAIL_PASSWORD, // generated ethereal password
        },
        tls: {
          // do not fail on invalid certs
          rejectUnauthorized: false,
        },
      });

      const mailOptions = {
        from: {
          name: process.env.MAIL_FROM_NAME,
          address: process.env.MAIL_FROM_ADDRESS,
        },
        to: toEmail,
        replyTo: 'donotreply@worldsportaction.com',
        subject: subject,
        html: htmlBody,
      };

      if (Number(process.env.SOURCE_MAIL) == 1) {
        mailOptions.html = ' To : ' + mailOptions.to + '<br><br>' + mailOptions.html;
        mailOptions.to = process.env.TEMP_DEV_EMAIL;
      }

      let cTrack = new CommunicationTrack();
      cTrack.id = 0;
      cTrack.communicationType = communicationType;
      // cTrack.contactNumber = contact.mobileNumber
      cTrack.entityId = entityId;
      cTrack.deliveryChannelRefId = 1;
      cTrack.emailId = toEmail.toLowerCase();
      cTrack.userId = toUserId;
      cTrack.subject = subject;
      if (isNotNullAndUndefined(password) && password.length > 1) {
        cTrack.content = mailOptions.html.replace(password, '******');
      } else {
        cTrack.content = htmlBody;
      }
      cTrack.createdBy = creatorId;

      // await
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          cTrack.statusRefId = 2;
          logger.error(`sendMail: {subject} : Mail error ${err},  ${toEmail}`);
          this.insertIntoCommunicationTrack(cTrack);
          // Here i commented the below code as the caller is not handling the promise reject
          // return Promise.reject(err);
        } else {
          cTrack.statusRefId = 1;
          logger.info(`sendMail: {subject} : Mail sent successfully,  ${toEmail}`);
          this.insertIntoCommunicationTrack(cTrack);
        }
        transporter.close();
        return Promise.resolve();
      });
    } catch (error) {
      throw error;
    }
  }

  private composeEmail(title: string, content: string, toUser: User, password: string): string {
    let html = `
        <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
        <html lang="pt-br" xmlns="http://www.w3.org/1999/xhtml">
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                <title>Netball Livescores</title>
                <style type="text/css">
                    @import url('https://fonts.googleapis.com/css?family=Roboto:300,400,700,900');
                </style>
                <style type="text/css">
                    body { width: 100% !important; -webkit-font-smoothing: antialiased; }
                    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; padding:0; margin:0;  }
                    p { margin: 0; }
                    table td {border-collapse: collapse !important; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
                    img { border:0; height:auto; outline:none; text-decoration:none; max-width:100%; }
                    table { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
                    #outlook a {padding:0;}
                    body, td, th, p, div, li, a, span { 
                    -webkit-text-size-adjust: 100%;
                    -ms-text-size-adjust: 100%;
                    mso-line-height-rule: exactly;
                    }
                    
                    /*START DESKTOP STYLES*/
                    .container { width: 100%; max-width: 700px; margin: 0 auto; }
                    .d-b-padding-32 { padding-bottom: 32px; }
                    .d-t-padding-32 { padding-top: 32px; }
                    .d-b-padding-24 { padding-bottom: 24px; }
                    .d-title { font-family: Helvetica, Arial, sans-serif; color: #ffffff; font-size: 20px; mso-line-height-rule: exactly; line-height: 36px; padding: 20px 48px; }
                    .d-container-a { background-color: #FF8237; border-top-right-radius: 8px; border-top-left-radius: 8px; }
                    .d-container-b { background-color: #ffffff; padding: 36px 48px 0 48px }
                    .d-container-c { background-color: #ffffff; padding: 0px 48px 12px 48px; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; }
                    .d-b-padding-8 { padding-bottom: 8px; }
                    .d-b-padding-4 { padding-bottom: 4px; }
                    table .d-paragraph { font-family: Helvetica, Arial, sans-serif; color: #4C4C6D; font-size: 16px; mso-line-height-rule: exactly; line-height: 24px; padding: 20px 0 20px 0; }
                    .d-paragraph span { color : #4c4c6d; }
                    .d-signature { font-family: Helvetica, Arial, sans-serif; color: #4C4C6D; font-size: 20px; mso-line-height-rule: exactly; line-height: 32px; padding: 36px 0 32px 0; }
                    .d-hello { font-family: Helvetica, Arial, sans-serif; color: #4C4C6D; font-size: 20px; font-weight: bold; mso-line-height-rule: exactly; line-height: 20px; }

                    .d-steps-table { padding: 16px; background-color: #fdfdfe; }
                    .d-steps-number { width: 48px; max-width: 48px; font-family: Helvetica, Arial, sans-serif; font-weight: bold; color: #18BBFF; font-size: 32px; }
                    .d-steps-value { font-family: Helvetica, Arial, sans-serif; color: #4C4C6D; font-size: 16px; mso-line-height-rule: exactly; line-height: 28px; }
                    .d-steps-value a { color: #FF8237; text-decoration: underline; }

                    .d-register-table { padding: 36px; background-color: #fdfdfe; }
                    .d-register-title { font-family: Helvetica, Arial, sans-serif; color: #4C4C6D; font-size: 18px; mso-line-height-rule: exactly; line-height: 28px; }
                    .d-button { font-size: 20px }

                    .d-steps-number { width: 48px; max-width: 48px; font-family: Helvetica, Arial, sans-serif; font-weight: bold; color: #18BBFF; font-size: 32px; }
                    .d-steps-value { font-family: Helvetica, Arial, sans-serif; color: #4C4C6D; font-size: 16px; mso-line-height-rule: exactly; line-height: 28px; }
                    .d-steps-value a { color: #FF8237; text-decoration: underline; }

                    .d-team-table { border-top: 1px solid #EBF0F3; }
                    .d-team-name { font-family: Helvetica, Arial, sans-serif; color: #4C4C6D; font-size: 12px; mso-line-height-rule: exactly; line-height: 32px; padding: 6px 0; border-bottom: 1px solid #EBF0F3; }
                    .d-team-role { font-family: Helvetica, Arial, sans-serif; color: #9B9BAD; font-size: 12px; mso-line-height-rule: exactly; line-height: 32px; padding: 6px 0; border-bottom: 1px solid #EBF0F3; }

                    .d-team-table { border-top: 1px solid #EBF0F3; }
                    .d-team-name { font-family: Helvetica, Arial, sans-serif; color: #4C4C6D; font-size: 12px; mso-line-height-rule: exactly; line-height: 32px; padding: 6px 0; border-bottom: 1px solid #EBF0F3; }
                    .d-team-role { font-family: Helvetica, Arial, sans-serif; color: #9B9BAD; font-size: 12px; mso-line-height-rule: exactly; line-height: 32px; padding: 6px 0; border-bottom: 1px solid #EBF0F3; }

                    .d-paswd-table, .d-usr-table { padding: 16px 24px; background-color: #FDFDFE; }
                    .d-paswd-icon, .d-usr-icon { width: 32px; max-width: 32px; font-family: Helvetica, Arial, sans-serif; font-weight: bold; color: #18BBFF; font-size: 32px; }
                    .d-paswd-title, .d-usr-title { font-family: Helvetica, Arial, sans-serif; color: #9B9BAD; font-size: 14px; mso-line-height-rule: exactly; line-height: 18px; }
                    .d-paswd-value, .d-usr-value { font-family: Helvetica, Arial, sans-serif; color: #FF8237; font-size: 14px; mso-line-height-rule: exactly; line-height: 32px; padding-bottom: 20px}
                    .d-paswd-value a, .d-usr-value a { color: #FF8237; text-decoration: none; }

                    .ind-left { font-family: Helvetica, Arial, sans-serif; color: #4C4C6D; font-size: 16px; mso-line-height-rule: exactly; line-height: 24px; padding: 6px 0 0;  }
                    .ind-right { font-family: Helvetica, Arial, sans-serif; color: #9B9BAD; font-size: 16px; mso-line-height-rule: exactly; line-height: 24px; padding: 6px 0 0;  }
                    .ind-subtext { font-family: Helvetica, Arial, sans-serif;  font-size: 14px; mso-line-height-rule: exactly; line-height: 20px; padding: 6px 0 12px; border-bottom: 1px solid #EBF0F3; }

                    /*END DESKTOP STYLES*/

                    .tp-body { background-color: #EBF0F3; }
                    .specialLinks a, .d-contacts a { color:#FF8237; text-decoration: none;}
                    .click-to-action {
                        width: 100%;
                        margin: 32px 0;
                    }
                    .click-to-action a.d-button { color: #FFFFFF; }
                    .click-to-action .btn a { color: #ffffff; text-decoration: none; font-family: Helvetica, Arial, sans-serif; color: #ffffff; font-weight: bold; padding: 20px 32px; border-radius: 6px; background: #FF8237; } 
                    .d-contacts {
                        padding: 12px 12px;
                        margin: 12px 0 24px;
                        background-color: #f6f6f6;
                        mso-line-height-rule: exactly;
                        line-height: 20px;
                        font-size: 14px;
                    }
                    .d-contacts p {
                        margin-bottom: 6px;
                        color: #4c4c6d;
                    }
                    
                    @media screen and (min-width: 421px) and (max-width: 700px) {
                        .container { width: 100% !important; }
                    }
                    
                    @media only screen and (max-width:420px) {
                        img.inline { display: inline !important; }
                        img.m-full { width: 100% !important; max-width: 100% !important; }
                        table.m-center { margin: 0 auto !important; }
                        td.m-hide, tr.m-hide { display: none !important; }
                        td.m-center { text-align:center !important; }
                        td.m-left { text-align:left !important; }
                        td.m-right { text-align:right !important; }
                        td.coll { display:block !important; width:100% !important; }
                        td.rt-padding { padding-right: 20px !important; }
                        td.nrt-padding { padding-right: 0 !important; }
                        td.lt-padding { padding-left: 20px !important; }
                        td.nlt-padding { padding-left: 0 !important; }
                        td.l-padding { padding-left: 20px !important; padding-right: 20px !important; }   
                        td.nl-padding { padding-left: 0 !important; padding-right: 0 !important; }
                        td.b-padding { padding-bottom: 20px !important; }
                        td.nb-padding { padding-bottom: 0 !important; }
                        td.t-padding { padding-top: 20px !important; }
                        td.nt-padding { padding-top: 0 !important; }
                        .m-txt { font-size: 16px !important; line-height: 24px !important; }
                        td.d-container-a { border-top-right-radius: 0px; border-top-left-radius: 0px; }
                        td.d-container-c { border-bottom-left-radius: 0px; border-bottom-right-radius: 0px; }
                    }		
                    @media screen and (max-width: 420px) {
                        u ~ div {
                            min-width: 95vw;
                        }
                    }	
                </style>
                <!--[if (gte mso 9)|(IE)]>
                    <style type="text/css">
                        td, a, div, span, p { font-family: Helvetica, Arial, sans-serif !important; }
                    </style>    
                <![endif]-->
            </head>
            <body class="tp-body">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="table-layout:fixed;" class="tp-body">
                    <tr>
                        <td align="center" valign="top" class="tp-body d-b-padding-32 d-t-padding-32 nb-padding nt-padding">
                            <!--[if (gte mso 9)|(IE)]>
                            <table width="700"  style="background-color: #FFFFFF" align="center" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" valign="top">
                                        <![endif]-->
                                        <table cellpadding="0" cellspacing="0" border="0" align="center" class="container">`;

    if (isNotNullAndUndefined(title) && title.length > 0) {
      let headerHtml = `
                                            <tr>
                                                <td align="center" valign="top" class="d-container-a">
                                                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                                        <tr>
                                                            <td align="left" valign="top" class="d-title l-padding">
                                                                $(title)
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>`;
      html += headerHtml.replace('$(title)', title);
    }

    let passwordHtml = '';
    if (isNotNullAndUndefined(password) && password.length > 0) {
      let parentsLogin = toUser.isInActive == 1 ? AppConstants.parentsLogin : '';
      passwordHtml = `
                                            <tr>
                                                <td align="center" valign="top" class="d-b-padding-4">
                                                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                                        <tr>
                                                            <td align="left" valign="middle" class="d-usr-title">USERNAME ${parentsLogin}</td>
                                                        </tr>
                                                        <tr>
                                                            <td align="left" valign="top" class="d-usr-value m-txt">
                                                                <strong>$(username)</strong>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="left" valign="middle" class="d-usr-title">PASSWORD</td>
                                                        </tr>
                                                        <tr>
                                                            <td align="left" valign="top" class="d-usr-value m-txt">
                                                                <strong>$(password)</strong>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>`;
      passwordHtml = passwordHtml.replace('$(username)', toUser.email);
      passwordHtml = passwordHtml.replace('$(password)', password);
    }

    html += ` 
                                            <tr>
                                                <td class="d-hello d-container-b l-padding t-padding">
                                                    Hi $(addressee)
                                                </td>
                                            </tr>
                                            <tr>
                                                <td align="left" valign="top" class="d-container-c l-padding b-padding">
                                                $(content)
                                                </td>
                                            </tr>
                                        </table>
                                        <!--[if (gte mso 9)|(IE)]>
                                    </td>
                                </tr>
                            </table>
                            <![endif]--> 
                        </td>
                    </tr>
                </table>
            </body>
        </html>`;

    html = html.replace('$(addressee)', toUser.firstName + ' ' + toUser.lastName + ',');
    html = html.replace('$(content)', content);
    html = html.replace(EmailConstants.credentials, passwordHtml);

    return html;
  }

  public async getLinkedOrganisations() {
    return this.entityManager.query(`
            SELECT  o1Id                    AS inputOrganisationId
                    ,o1organisationTypeRefId AS inputOrganisationTypeRefId
                    ,o4Id                    AS linkedOrganisationId
                    ,o4Name                  AS linkedOrganisationName
                    ,o4organisationTypeRefId AS linkedOrganisationTypeRefId
            FROM wsa_users.all_organisations_hierarchy UNION
            SELECT  o2Id                    AS inputOrganisationId
                    ,o2organisationTypeRefId AS inputOrganisationTypeRefId
                    ,o4Id                    AS linkedOrganisationId
                    ,o4Name                  AS linkedOrganisationName
                    ,o4organisationTypeRefId AS linkedOrganisationTypeRefId
            FROM wsa_users.all_organisations_hierarchy UNION
            SELECT  o3Id                    AS inputOrganisationId
                    ,o3organisationTypeRefId AS inputOrganisationTypeRefId
                    ,o4Id                    AS linkedOrganisationId
                    ,o4Name                  AS linkedOrganisationName
                    ,o4organisationTypeRefId AS linkedOrganisationTypeRefId
            FROM wsa_users.all_organisations_hierarchy UNION
            SELECT  o4Id                    AS inputOrganisationId
                    ,o4organisationTypeRefId AS inputOrganisationTypeRefId
                    ,o4Id                    AS linkedOrganisationId
                    ,o4Name                  AS linkedOrganisationName
                    ,o4organisationTypeRefId AS linkedOrganisationTypeRefId
            FROM wsa_users.all_organisations_hierarchy
        `);
  }

  public async insertOrganisationHierarchy(linkedOrganisations) {
    linkedOrganisations.forEach(async item => {
      await this.entityManager.query(
        `insert into wsa_users.organisationHierarchy(inputOrganisationId, inputOrganisationTypeRefId, linkedOrganisationId, linkedOrganisationName, linkedOrganisationTypeRefId) values(?,?,?,?,?)`,
        [
          item.inputOrganisationId,
          item.inputOrganisationTypeRefId,
          item.linkedOrganisationId,
          item.linkedOrganisationName,
          item.linkedOrganisationTypeRefId,
        ],
      );
    });
  }
}

interface RawUserByRole {
  linkedEntity: string;
}
