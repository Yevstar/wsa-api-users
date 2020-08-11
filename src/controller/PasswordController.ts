import {
    Authorized,
    Body,
    BodyParam,
    Controller,
    Get, HeaderParam,
    Patch,
    Post,
    QueryParam,
    Render, Req,
    Res,
    UseBefore
} from 'routing-controllers';
import {Request, Response} from 'express';
import * as bodyParser from 'body-parser';
import uuid from 'uuid/v1';
import nodeMailer from 'nodemailer';
import twilio from 'twilio';

import {logger} from '../logger';
import {md5} from '../utils/Utils';
import {BaseController} from './BaseController';
import {User} from "../models/User";

@Controller('/password')
export class PasswordController extends BaseController {

    @Get('/forgot')
    async forgot(
        @QueryParam('email') email: string,
        @QueryParam('type') type: string = "email",
        @Res() response: Response
    ) {
        try {
            if (!email || email === "undefined" || email === "null") {
                return response.status(400).send({
                    name: 'email_id_error',
                    message: 'Email id is necessary to be passed.'
                });
            }

            if (type !== "email" && type !== "sms") {
                return response.status(400).send({
                    name: 'reset_type_error',
                    message: 'Reset type is invalid.'
                });
            }

            const user = await this.userService.findByEmail(email.toLowerCase());

            if (!user) {
                logger.warn(`Password reset link requested for ${email}, but couldn't find a user. Ignoring request.`);
                return response.status(400).send({
                    name: 'validation_error',
                    message: `User with email [${email}] not found`,
                });
            }

            logger.info(`Sending password reset link to ${email.toLowerCase()}`);

            // Set a reset code.
            user.reset = uuid();
            await this.userService.createOrUpdate(user);

            // Generate a password reset url.
            const url = `${process.env.SERVER_URL}/password/change?token=${user.reset}`;

            if (type === 'email') {
                // Send out the email.
                const transporter = nodeMailer.createTransport({
                    host: "smtp.gmail.com",
                    port: 587,
                    secure: false, // true for 465, false for other ports
                    auth: {
                        user: process.env.MAIL_USERNAME, // generated ethereal user
                        pass: process.env.MAIL_PASSWORD // generated ethereal password
                    },
                    tls: {
                        // do not fail on invalid certs
                        rejectUnauthorized: false
                    }
                });

                const mailOptions = {
                    from: {
                        name: "World Sport Action",
                        address: "mail@worldsportaction.com"
                    },
                    to: user.email.toLowerCase(),
                    replyTo: "donotreply@worldsportaction.com",
                    subject: 'Reset your password.',
                    html: `Go here to reset your password: <a href="${url}">${url}</a>`
                };

                // Send the mail via nodeMailer
                await transporter.sendMail(mailOptions, (err, info) => {
                    logger.info(`Password - forgot : info ${info} Error ${err}`);
                    return Promise.resolve();
                });
            } else {
                // Send sms
                const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
                const message = await client.messages.create({
                    body: `Go here to reset your password: ${url}`,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: user.mobileNumber,
                });

                logger.info('Password - forgot - sms : ', message);
            }

            return response.status(200).send({
                name: 'success',
                message: `A password reset link was sent to your ${type === 'email' ? 'email address' : 'phone'}.`,
            });
        } catch (err) {
            logger.error(`Failed to send a password reset email to ${email}` + err);
            return response.status(400).send({
                name: 'unexpected_error',
                message: 'There was a problem sending your password reset email.',
            });
        }
    }

    @Get('/change')
    @Render('password/change.ejs')
    async change(@QueryParam('token') token: string) {
        return {token};
    }

    @Post('/change')
    @UseBefore(bodyParser.urlencoded({extended: true}))
    async postChange(
        @BodyParam('token', {required: true}) token: string,
        @BodyParam('password', {required: true}) password: string,
        @Res() response: Response
    ) {
        const user = await this.userService.findByToken(token);
        if (!user) {
            return response.render('password/change.ejs', {
                token,
                error: `Invalid reset token. Make sure you're using the correct reset link.`
            });
        }

        if (!password) {
            return response.render('password/change.ejs', {token, error: 'Please enter a new password.'});
        }

        // Reset the password
        user.password = md5(password);
        user.reset = null;

        await this.userService.createOrUpdate(user);
        await this.updateFirebaseData(user, user.password);
        return response.render('password/changed.ejs',);
    }
}
