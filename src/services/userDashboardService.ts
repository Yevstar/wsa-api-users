import { Service } from "typedi";
import BaseService from "../services/BaseService";
import { Affiliate } from "../models/Affiliate";
import { logger } from "../logger";
import { isArrayEmpty, paginationData, stringTONumber } from "../utils/Utils";
import { User } from "../models/User";


@Service()
export default class UserDashboardService extends BaseService<User> {
    modelName(): string {
        return User.name;
    }

    public async userDashboardTextualList(requestBody: any, userId: any) {
        try{
            let organisationId = requestBody.organisationId;
            let yearRefId = requestBody.yearRefId;
            let competitionUniqueKey = requestBody.competitionUniqueKey;
            let roleId = requestBody.roleId;
            let genderRefId = requestBody.genderRefId;
            let linkedEntityId = requestBody.linkedEntityId;
            let postCode = requestBody.postCode;
            let searchText = requestBody.searchText;
            let limit = requestBody.paging.limit;
            let offset = requestBody.paging.offset;
            let userArr = [];
            let result = await this.entityManager.query("call wsa_users.usp_user_dashboard_textual(?,?,?,?,?,?,?,?,?,?,?)",
                [organisationId, yearRefId, competitionUniqueKey, roleId, genderRefId, linkedEntityId, postCode, searchText,  limit, offset, userId]);
    
            if (result != null) {
                let totalCount = result[1].find(x=>x).totalCount;
                let responseObject = paginationData(stringTONumber(totalCount), limit, offset);
    
                let userMap = new Map();
                let roleMap = new Map();
                let organisationMap = new Map();
                let teamMap = new Map();
               
                let competitionMap = new Map();
                for (let textual of result[0]) {
                    let userTemp = userMap.get(textual.id);
                    let roleTemp = roleMap.get(textual.role);
                    let organisationTemp = organisationMap.get(textual.organisationId);
                    let competitionTemp = competitionMap.get(textual.competitionId);
                    let teamTemp = teamMap.get(textual.linkedEntityId);
                    let roleObj = {
                        role: textual.role!= null ? textual.role.toString() : null
                    };
                    let organisationObj = {
                        linked: textual.organisationName!= null ? textual.organisationName.toString() : null,
                        linkedEntityId: textual.organisationId
                    };
                   
                    console.log("Comp Name" + textual.competitionName);
                    let competitionObj = {
                        competitionName: textual.competitionName!= null ? textual.competitionName.toString(): null,
                        competitionId: textual.competitionId
                    };
                    let teamObj = {
                        teamId: textual.linkedEntityId,
                        team: textual.teamName!= null ? textual.teamName.toString() : null
                    }
   
                    if(userTemp == undefined)
                    {
                        let textualObj = {
                            userId: textual.id,
                            name: textual.firstName + " " + textual.lastName,
                            dateOfBirth: textual.dateOfBirth,
                            role: [],
                            linked: [],
                            competition: [],
                            team:[],
                            isUsed: false,
                            key: textual.id.toString()
                        }
                        textualObj.role.push(roleObj);
                        roleMap.set(textual.role, roleObj);
                        
                        if(textual.organisationName!= null)
                        {
                            textualObj.linked.push(organisationObj);
                            organisationMap.set(textual.organisationId, organisationObj);
                        }
                        

                        if(textual.competitionName!= null)
                        {
                            console.log("competitionObj" + JSON.stringify(competitionObj));
                            textualObj.competition.push(competitionObj);
                            competitionMap.set(textual.competitionId, competitionObj)
                        }
                        
                        if(textual.teamName!= null){
                            textualObj.team.push(teamObj);
                            teamMap.set(textual.linkedEntityId, teamObj);
                        }
                        userMap.set(textual.id, textualObj);
                        userArr.push(textualObj);
                    }
                    else {
                        if(roleTemp == undefined)
                        {
                            userTemp.role.push(roleObj);
                            roleMap.set(textual.role, roleObj);
                        }
                        if(organisationTemp == undefined)
                        {
                            if(textual.organisationName!= null)
                            {
                                userTemp.linked.push(organisationObj); 
                                organisationMap.set(textual.organisationId, organisationObj);
                            }
                        }
                        if(competitionTemp == undefined)
                        {
                            if(textual.competitionName!= null)
                            {
                                console.log("competitionObj" + JSON.stringify(competitionObj));
                                userTemp.competition.push(competitionObj);
                                competitionMap.set(textual.competitionId, competitionObj)
                            }
                        }
                        if(teamTemp == undefined)
                        {
                            if(textual.teamName!= null)
                            {
                                userTemp.team.push(teamObj);
                                teamMap.set(textual.linkedEntityId, teamObj);
                            }
                        }
                    }
                }
                responseObject["users"] = userArr;
                return responseObject;
            }
            else{
                return [];
            }
        }
        catch(error)
        {
            throw error;
        }
    }
}