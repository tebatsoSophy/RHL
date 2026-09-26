const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

const sendInvitationEmail = async ({
    email,
    invitationLink,
    otp,
    mineName,
    zoneName
}) => {

    const mailOptions = {
        from: `"RehabLedger" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "You've been invited to RehabLedger",

        html: `
        <!DOCTYPE html>
        <html>
        <body style="
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            padding: 30px;
        ">

            <div style="
                max-width: 600px;
                margin: auto;
                background: white;
                padding: 35px;
                border-radius: 10px;
            ">

                <h1>RehabLedger Invitation</h1>

                <p>
                    You have been invited to participate in
                    rehabilitation activities for:
                </p>

                <p>
                    <strong>Mine:</strong> ${mineName}<br>
                    <strong>Zone:</strong> ${zoneName}
                </p>

                <p>
                    Click the button below to create your
                    RehabLedger account.
                </p>

                <div style="text-align:center; margin:30px 0;">

                    <a
                        href="${invitationLink}"
                        style="
                            background:#166534;
                            color:white;
                            padding:14px 24px;
                            text-decoration:none;
                            border-radius:6px;
                        "
                    >
                        Accept Invitation
                    </a>

                </div>

                <p>Your verification OTP is:</p>

                <div style="
                    background:#f3f4f6;
                    padding:20px;
                    text-align:center;
                    font-size:28px;
                    font-weight:bold;
                    letter-spacing:6px;
                ">
                    ${otp}
                </div>

                <p>
                    This invitation expires in 24 hours.
                </p>

                <p>
                    You will be asked to provide your name,
                    create a password and enter the OTP.
                </p>

                <p>
                    RehabLedger
                </p>

            </div>

        </body>
        </html>
        `
    };

    await transporter.sendMail(mailOptions);
};

module.exports = {
    sendInvitationEmail
};