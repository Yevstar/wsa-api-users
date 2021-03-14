import { Service } from "typedi";

import BaseService from "../services/BaseService";
import { logger } from "../logger";
import { isArrayPopulated, paginationData, stringTONumber } from "../utils/Utils";
import { User } from "../models/User";

@Service()
export default class UserDashboardService extends BaseService<User> {
    modelName(): string {
        return User.name;
    }

    public async userDashboardTextualList(requestBody: any, userId: any, sortBy: string = undefined, sortOrder: 'ASC' | 'DESC' = undefined) {
        try {
            let organisationId = requestBody.organisationId;
            let yearRefId = requestBody.yearId;
            let competitionUniqueKey = requestBody.competitionUniqueKey;
            let roleId = requestBody.roleId;
            let genderRefId = requestBody.genderRefId;
            let linkedEntityId = requestBody.linkedEntityId;
            let postCode = requestBody.postCode;
            let searchText = requestBody.searchText;
            let limit = requestBody.paging.limit;
            let offset = requestBody.paging.offset;
            let dobFrom = requestBody.dobFrom;
            let dobTo = requestBody.dobTo;
            let userArr = [];

            logger.info("UserInfoTextualDashboardInput" + JSON.stringify(requestBody));
            let result = await this.entityManager.query("call wsa_users.usp_user_dashboard_textual_v2(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                [organisationId, yearRefId, competitionUniqueKey, roleId, genderRefId, linkedEntityId,
                    postCode, searchText, limit, offset, userId, dobFrom, dobTo, sortBy, sortOrder]);

            if (result != null) {
                logger.info("UserInfoTextualDashboard" + JSON.stringify(result[0]));
                let totalCount = 0;
                if (result[1] != undefined && result[1] != null)
                    totalCount = result[1].find(x => x).totalCount;

                let responseObject = paginationData(stringTONumber(totalCount), limit, offset);
                let userMap = new Map();
                let roleMap = new Map();
                let organisationMap = new Map();
                let teamMap = new Map();

                let competitionMap = new Map();
                if (result[0] != null && result[0] != undefined) {
                    for (let textual of result[0]) {
                        let userTemp = userMap.get(textual.id);
                        let roleKey = textual.role + "#" + textual.id;
                        let orgKey = textual.organisationId + "#" + textual.id;
                        let compKey = textual.competitionId + "#" + textual.id;
                        let teamKey = textual.linkedEntityId + "#" + textual.id;
                        let roleTemp = roleMap.get(roleKey);
                        let organisationTemp = organisationMap.get(orgKey);
                        let competitionTemp = competitionMap.get(compKey);
                        let teamTemp = teamMap.get(teamKey);
                        let roleObj = {
                            role: textual.role != null ? textual.role.toString() : null
                        };
                        let organisationObj = {
                            linked: textual.organisationName != null ? textual.organisationName.toString() : null,
                            linkedEntityId: textual.organisationId
                        };

                        let competitionObj = {
                            competitionName: textual.competitionName != null ? textual.competitionName.toString() : null,
                            competitionId: textual.competitionId
                        };
                        let teamObj = {
                            teamId: textual.linkedEntityId,
                            team: textual.teamName != null ? textual.teamName.toString() : null
                        }

                        if (userTemp == undefined) {
                            let textualObj = {
                                userId: textual.id,
                                name: textual.firstName + " " + textual.lastName,
                                dateOfBirth: textual.dateOfBirth,
                                role: [],
                                linked: [],
                                competition: [],
                                team: [],
                                isUsed: false,
                                key: textual.id.toString()
                            }
                            textualObj.role.push(roleObj);
                            roleMap.set(roleKey, roleObj);

                            if (textual.organisationName != null) {
                                textualObj.linked.push(organisationObj);
                                organisationMap.set(orgKey, organisationObj);
                            }

                            if (textual.competitionName != null) {
                                textualObj.competition.push(competitionObj);
                                competitionMap.set(compKey, competitionObj)
                            }

                            if (textual.teamName != null) {
                                textualObj.team.push(teamObj);
                                teamMap.set(teamKey, teamObj);
                            }
                            userMap.set(textual.id, textualObj);
                            userArr.push(textualObj);
                        } else {
                            if (roleTemp == undefined) {
                                userTemp.role.push(roleObj);
                                roleMap.set(roleKey, roleObj);
                            }
                            if (organisationTemp == undefined) {
                                if (textual.organisationName != null) {
                                    userTemp.linked.push(organisationObj);
                                    organisationMap.set(orgKey, organisationObj);
                                }
                            }
                            if (competitionTemp == undefined) {
                                if (textual.competitionName != null) {
                                    userTemp.competition.push(competitionObj);
                                    competitionMap.set(compKey, competitionObj)
                                }
                            }
                            if (teamTemp == undefined) {
                                if (textual.teamName != null) {
                                    userTemp.team.push(teamObj);
                                    teamMap.set(teamKey, teamObj);
                                }
                            }
                        }
                    }
                }

                responseObject["users"] = userArr;
                responseObject["competitions"] = result[2];
                responseObject["organisations"] = result[3];
                responseObject["roles"] = result[4];
                let obj = {
                    noOfUsers: 0,
                    noOfRegisteredUsers: 0
                }
                responseObject["counts"] = obj;
                if (isArrayPopulated(result[5])) {
                    let userCount = result[5].find(x => x.moduleId == 1);
                    let userCount1 = result[5].find(x => x.moduleId == 2);
                    let totalUserCount = (userCount != null ? Number(userCount.counts) : 0) + (userCount1 != null ? Number(userCount1.counts) : 0)
                    responseObject["counts"]["noOfUsers"] = totalCount;
                    // responseObject["counts"]["noOfRegisteredUsers"] = result[6][0].regCount;
                    responseObject["counts"]["noOfRegisteredUsers"] = (userCount1!= null ? Number(userCount1.counts) : 0);
                }

                return responseObject;
            } else {
                return [];
            }
        } catch (error) {
            throw error;
        }
    }

    public async userDashboardTextualSpectatorCount(requestBody: any, userId: any) {
        try {
            const organisationId = requestBody.organisationId;
            const result = await this.entityManager.query("call wsa_users.usp_user_dashboard_spectator_count(?)", [organisationId])
            if (!!result) {
                return {
                    spectatorCount: result[0][0].spectatorCount
                };
            }
            return [];
        } catch (error) {
            throw error;
        }
    }

    public async exportRegistrationQuestions(requestBody: any, userId) {
        try {
            let result = await this.entityManager.query('call wsa_users.usp_export_registration_questions(?,?,?,?,?,?,?,?)',
                [requestBody.organisationId, requestBody.yearRefId, requestBody.competitionUniqueKey, requestBody.roleId, requestBody.genderRefId, requestBody.linkedEntityId, requestBody.postCode, userId]);

            if (isArrayPopulated(result[0])) {
                for (let res of result[0]) {
                    if (res.Venue != null)
                        res.Venue = res.Venue.join(", ")
                }

                // for (let res1 of result[0]) {
                //     if (res1['Your support can you help'] != null)
                //         res1['Your support can you help'] = res1['Your support can you help'].join(", ")
                // }

                return result[0]
            } else {
                let arr = [];
                let obj = {
                    "Id": "",
                    "First Name": "",
                    "Middle Name": "",
                    "Last Name": "",
                    "Gender": "",
                    "Date of Birth": "",
                    "Email": "",
                    "Mobile Number": "",
                    "PostalCode": "",
                    "Address": "",
                    "Street1": "",
                    "Street2": "",
                    "Suburb": "",
                    "State": "",
                    "Country": "",
                    "Organisation": "",
                    "Competition Name": "",
                    "Start Date": "",
                    "End Date": "",
                    "Venue": "",
                    "Membership Product": "",
                    "Membership Division": "",
                    "Competition Division": "",
                    "Umpire Accreditation Level": "",
                    "Umpire Accreditation Expiry Date": "",
                    "Association Level": "",
                    "Coach Accreditation Level": "",
                    "Coach Accreditation Expiry Date": "",
                    "Children Check Number": "",
                    "Children Check Expiry Date": "",
                    "Emergency First Name": "",
                    "Emergency Last Name": "",
                    "Emergency Contact Number": "",
                    "Marketing Opt In": "",
                    "Merged User Id": "",
                    "Existing Medical Condition": "",
                    "Regular Medication": "",
                    "Heard About Competition": "",
                    "Heard By Other": "",
                    "Favorite Team": "",
                    "Favorite Firebird": "",
                    "Position 1": "",
                    "Position 2": "",
                    "Has Disability": "",
                    "Disability Care Number": "",
                    "Disability Type": "",
                    "Injury": "",
                    "Allergy": "",
                    "Years Played": "",
                    "School": "",
                    "School Grade": "",
                    "SSP": "",
                    "Other Sports": "",
                    "Volunteer - Coach": "",
                    "Volunteer - Manager": "",
                    "Volunteer - Fundraising": "",
                    "Volunteer - Other": "",
                    "Chest Pain": "",
                    "Heart Trouble": "",
                    "Blood Pressure": "",
                    "Lower Back": "",
                    "Physical Activity": "",
                    "Joint or Bone": ""
                }
                arr.push(obj);
                return arr;
            }
        } catch (error) {
            throw error;
        }
    }

    public async exportUserRegistrationData(requestBody) {
        try {
            let result = await this.entityManager.query('call wsa_users.usp_export_registration_data(?)', [requestBody.userId]);

            if (isArrayPopulated(result[0])) {
                for (let res of result[0]) {
                    if (res.Venue != null)
                        res.Venue = res.Venue.join(", ")
                }

                // for (let res1 of result[0]) {
                //     if (res1['Your support can you help'] != null)
                //         res1['Your support can you help'] = res1['Your support can you help'].join(", ")
                // }

                return result[0]
            } else {
                let arr = [];
                let obj = {
                    "Id": "",
                    "First Name": "",
                    "Middle Name": "",
                    "Last Name": "",
                    "Gender": "",
                    "Date of Birth": "",
                    "Email": "",
                    "Mobile Number": "",
                    "PostalCode": "",
                    "Address": "",
                    "Street1": "",
                    "Street2": "",
                    "Suburb": "",
                    "State": "",
                    "Country": "",
                    "Organisation": "",
                    "Competition Name": "",
                    "Start Date": "",
                    "End Date": "",
                    "Venue": "",
                    "Membership Product": "",
                    "Membership Division": "",
                    "Competition Division": "",
                    "Umpire Accreditation Level": "",
                    "Umpire Accreditation Expiry Date": "",
                    "Association Level": "",
                    "Coach Accreditation Level": "",
                    "Coach Accreditation Expiry Date": "",
                    "Children Check Number": "",
                    "Children Check Expiry Date": "",
                    "Emergency First Name": "",
                    "Emergency Last Name": "",
                    "Emergency Contact Number": "",
                    "Marketing Opt In": "",
                    "Merged User Id": "",
                    "Existing Medical Condition": "",
                    "Regular Medication": "",
                    "Heard About Competition": "",
                    "Heard By Other": "",
                    "Favorite Team": "",
                    "Favorite Firebird": "",
                    "Position 1": "",
                    "Position 2": "",
                    "Has Disability": "",
                    "Disability Care Number": "",
                    "Disability Type": "",
                    "Injury": "",
                    "Allergy": "",
                    "Years Played": "",
                    "School": "",
                    "School Grade": "",
                    "SSP": "",
                    "Other Sports": "",
                    "Volunteer - Coach": "",
                    "Volunteer - Manager": "",
                    "Volunteer - Fundraising": "",
                    "Volunteer - Other": "",
                    "Chest Pain": "",
                    "Heart Trouble": "",
                    "Blood Pressure": "",
                    "Lower Back": "",
                    "Physical Activity": "",
                    "Joint or Bone": ""
                }
                arr.push(obj);
                return arr;
            }
        } catch (error) {
            throw error;
        }
    }

}
