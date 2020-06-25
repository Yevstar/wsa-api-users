import {HttpError} from "routing-controllers";

export class LoginError extends HttpError {

    constructor(msg) {
        super(404, msg);
        super.name = 'LoginError';
    }
}
