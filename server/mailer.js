import { hidden_data } from './hidden_data.js';
import * as nodeMailer from 'nodemailer';
import { google } from 'googleapis';
const oauth2Client = new google.auth.OAuth2(hidden_data.oauth_id, hidden_data.oauth_secret, 'https://developers.google.com/oauthplayground');
oauth2Client.setCredentials({
    refresh_token: hidden_data.oauth_refresh
});
const smtpTransport = nodeMailer.createTransport({
    service: "gmail",
    auth: {
        type: "OAuth2",
        user: hidden_data.email,
        clientId: hidden_data.oauth_id,
        clientSecret: hidden_data.oauth_secret,
        refreshToken: hidden_data.oauth_refresh,
        accessToken: oauth2Client.getAccessToken(),
        tls: {
            rejectUnauthorized: false
        }
    }
});
export function sendMail(options) {
    smtpTransport.sendMail(options, (error, response) => {
        error ? console.log(error) : console.log(response);
        smtpTransport.close();
    });
}
;
