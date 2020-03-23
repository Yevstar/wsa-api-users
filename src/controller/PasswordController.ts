import {BodyParam, Controller, Get, Post, QueryParam, Render, Res, UseBefore} from 'routing-controllers';
import {Response} from 'express';
import * as bodyParser from 'body-parser';
import {logger} from '../logger';
import uuid from 'uuid/v1';
import sg from '@sendgrid/mail';
import {md5} from "../utils/Utils";
import {BaseController} from "./BaseController";

@Controller('/password')
export class PasswordController extends BaseController {

    @Get('/forgot')
    async forgot(
        @QueryParam('email') email: string,
        @Res() response: Response
    ) {
        try {
            const user = await this.userService.findByEmail(email);
            if (user) {
                logger.info(`Sending password reset link to ${email}`);
                // Set a reset code.
                user.reset = uuid();
                await this.userService.createOrUpdate(user);

                // Generate a password reset url.
                const url = `${process.env.SERVER_URL}/password/change?token=${user.reset}`;

                // Send out the email.
                sg.setApiKey(process.env.SENDGRID_API_KEY);
                const msg = {
                    to: user.email,
                    from: 'support@worldsportaction.com',
                    subject: 'Reset your password.',
                    html: `Go here to reset your password: <a href="${url}">${url}</a>`,
                };

                // Send the email.
                await sg.send(msg);

            } else {
                logger.warn(`Password reset link requested for ${email}, but couldn't find a user. Ignoring request.`);
                return response.status(400).send(
                    {name: 'validation_error', message: `User with email [${email}] not found`});
            }
            return response.status(200).send(
                {name: 'success', message: 'A password reset link was sent to your email address.'});
        } catch (err) {
            logger.error(`Failed to send a password reset email to ${email}`, err);
            return response.status(400).send(
                {name: 'unexpected_error', message: 'There was a problem sending your password reset email.'});
        }
    }

    @Get('/change')
    @Render('password/change.ejs')
    async change(@QueryParam('token') token: string) {
        return {token};
    }

    @Post('/change')
    @UseBefore(bodyParser.urlencoded())
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
        return response.render('password/changed.ejs',);
    }
}
