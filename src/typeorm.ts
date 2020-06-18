import {logger} from './logger';
import {Connection, createConnection, DefaultNamingStrategy, useContainer, createConnections} from "typeorm";
import {MysqlConnectionOptions} from "typeorm/driver/mysql/MysqlConnectionOptions";
import {snakeCase} from 'typeorm/util/StringUtils';
import {Container} from "typedi";

let connection: Connection[];

async function currentConnection(): Promise<Connection[]> {
    if (!connection) {
        await connect();
    }
    return connection;
}

async function connect(): Promise<Connection[]> {

    const usersDatabase = Object.assign({
        name: "default",
        type: "mysql", 
        //name: process.env.MYSQL_DATABASE,
        database: process.env.MYSQL_DATABASE_USERS,
        host: process.env.MYSQL_HOST,
        port: process.env.MYSQL_PORT,
        username: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        entities: [
            __dirname + "/models/*",
            __dirname + "/models/security/*",
            __dirname + "/models/views/*"
        ],
        namingStrategy: new NamingStrategy(),
        // logger: "file"
    });
    const registrationDatabase = Object.assign({
        name: process.env.MYSQL_DATABASE_REG,
        type: "mysql",
        database: process.env.MYSQL_DATABASE_REG,
        host: process.env.MYSQL_HOST,
        port: process.env.MYSQL_PORT,
        username: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        entities: [
            __dirname + "/models/registrations/*",
            __dirname + "/models/*",
            __dirname + "/models/security/*",
            __dirname + "/models/views/*"
        ],
        namingStrategy: new NamingStrategy(),
        logging: "all",
        logger: "simple-console"
    });

    const ALL_DATABASES = [usersDatabase, registrationDatabase];

    useContainer(Container)
    connection = await createConnections(ALL_DATABASES);
    // useContainer(Container)
    // connection = await createConnection(options);

    return connection;
}

class NamingStrategy extends DefaultNamingStrategy {
    columnName(propertyName: string, customName: string, embeddedPrefixes: string[]): string {
        if (embeddedPrefixes.length) {
            return snakeCase(embeddedPrefixes.join("_")) + (customName ? snakeCase(customName) : snakeCase(propertyName));
        }
        return customName ? customName : propertyName;
    }
}

export {
    connect,
    currentConnection
};
