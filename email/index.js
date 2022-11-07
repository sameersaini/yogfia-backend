const getEnvData = require("../env");
const sgMail = require('@sendgrid/mail');

const envData = getEnvData(process.env.ENV);
sgMail.setApiKey(envData.sendgrid);

const sendSignUpEmail = async (toEmail, username) => {
    const msg = {
        to: toEmail,
        from: 'yogawithyogfia@gmail.com',
        subject: 'Welcome to YogFia',
        html: `Hi ${username}, <br/><br/> You have been successfully signed up for YogFia. Click <a href="https://yogfia.com/signin" target="_blank">here</a> to login.<br /><br />Regards, <br />Team YogFia`,
    };
    try {
        await sgMail.send(msg);
    } catch (error) {
        console.error(error);

        if (error.response) {
            console.error(error.response.body)
        }
        throw (error)
    }
}

const sendResetPasswordEmail = async (toEmail, name, code) => {
    const msg = {
        to: toEmail,
        from: 'yogawithyogfia@gmail.com',
        subject: 'Reset Password for YogFia',
        html: `Hi ${name}, <br/><br/> Please use ${code} code to reset your password. Code is valid for 24 hours. Click <a href="https://yogfia.com/reset-password" target="_blank">here</a> to reset your password.<br /><br />Regards, <br />Team YogFia`,
    };
    try {
        await sgMail.send(msg);
    } catch (error) {
        console.error(error);

        if (error.response) {
            console.error(error.response.body)
        }
        throw (error)
    }
}

module.exports = {
    sendSignUpEmail,
    sendResetPasswordEmail
};