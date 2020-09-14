import {ViewColumn, ViewEntity} from "typeorm-plus";
import {IsNumber, IsString} from "class-validator";

@ViewEntity('linked_organisations')
export class LinkedOrganisations {

    @IsNumber()
    @ViewColumn()
    inputOrganisationId: number;

    @IsNumber()
    @ViewColumn()
    linkedOrganisationId: number;

    @IsNumber()
    @ViewColumn()
    linkedOrganisationTypeRefId: number;

    @IsString()
    @ViewColumn()
    linkedOrganisationName: string;
}
