import {Get, JsonController, QueryParam} from 'routing-controllers';
import {BaseController} from "./BaseController";
import { HOUR } from "../cache";

@JsonController('/ref')
export class ReferenceController extends BaseController {

    @Get('/roles')
    async getRoles(): Promise<any[]> {
        return this.cacheReferences('roles', this.userService.getRoles(), HOUR);
    }

    @Get('/functions')
    async getFunctions(): Promise<any[]> {
        return this.cacheReferences('functions', this.userService.getFunctions(), HOUR);
    }

    @Get('/roleFunction')
    async getRoleFunctions(): Promise<any[]> {
        return this.cacheReferences('roleFunction', this.userService.getRoleFunctions(), HOUR);
    }

    @Get('/functionByRole')
    async getFunctionsByRole(@QueryParam('roleId') roleId): Promise<any[]> {
        return this.cacheReferences(`funcByRole_${roleId}`, this.userService.getFunctionsByRole(roleId), HOUR);
    }

    @Get('/entity')
    async getEntityTypes(): Promise<any[]> {
        return this.cacheReferences('entity', this.userService.getEntityTypes(), HOUR);
    }

    private async cacheReferences(key, action, ttl = undefined) {
        // let result = fromCacheAsync(key);
        // if (!result) {
            let data = await action;
            // if (data) {
            //     toCacheWithTtl(key, JSON.stringify(data), ttl);
                return data;
            // }
        // } else {
        //     result = JSON.parse(result);
        // }
        // return result;
    }
}
