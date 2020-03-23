import {Service} from "typedi";
import BaseService from "./BaseService";
import {UserDevice} from "../models/UserDevice";
import {Brackets, DeleteResult, EntityManager} from "typeorm";

@Service()
export default class UserDeviceService extends BaseService<UserDevice> {

    modelName(): string {
        return UserDevice.name;
    }

    public async getUserTokens(userIds: number[]): Promise<UserDevice[]> {
        return this.entityManager.createQueryBuilder(UserDevice, 'ud')
            .where('ud.userId in (:userIds)', {userIds})
            .getMany();
    }

    public async loadDeviceByToken(deviceId: string): Promise<UserDevice> {
        return this.entityManager.createQueryBuilder(UserDevice, 'ud')
            .andWhere('ud.deviceId = :deviceId', {deviceId})
            .getOne();
    }

    public async updateDeviceId(oldDeviceId: string, newDeviceId: string): Promise<any> {
        return await this.entityManager.createQueryBuilder(UserDevice, 'ud').update()
            .set({deviceId: newDeviceId})
            .where("deviceId = :oldDeviceId", {oldDeviceId})
            .execute();
    }

    public async getUserDevices(userId: number): Promise<UserDevice[]> {
        return this.entityManager.createQueryBuilder(UserDevice, 'ud')
            .innerJoin('ud.user', 'user')
            .where('ud.userId = :userId', {userId})
            .getMany();
    }
}
