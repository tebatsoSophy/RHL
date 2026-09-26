const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

const sendRegistrationInvitation = async ({
    name,
    email,
    invitationLink,
    otp
}) => {
    const mailOptions = {
        from: `"RehabLedger" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your RehabLedger registration has been approved",

        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>RehabLedger Registration</title>
            </head>

            <body style="
                margin: 0;
                padding: 0;
                background-color: #f4f4f4;
                font-family: Arial, sans-serif;
            ">

                <div style="
                    max-width: 600px;
                    margin: 40px auto;
                    background: white;
                    padding: 40px;
                    border-radius: 10px;
                ">

                    <h1 style="color: #1f2937;">
                        Welcome to RehabLedger
                    </h1>

                    <p>
                        Hello ${name},
                    </p>

                    <p>
                        Your registration request for RehabLedger
                        has been approved.
                    </p>

                    <p>
                        Click the button below to complete your
                        registration and create your password.
                    </p>

                    <div style="
                        text-align: center;
                        margin: 30px 0;
                    ">

                        <a
                            href="${invitationLink}"
                            style="
                                display: inline-block;
                                background-color: #166534;
                                color: white;
                                padding: 14px 24px;
                                text-decoration: none;
                                border-radius: 6px;
                                font-weight: bold;
                            "
                        >
                            Complete Registration
                        </a>

                    </div>

                    <p>
                        Your verification code is:
                    </p>

                    <div style="
                        background-color: #f3f4f6;
                        padding: 20px;
                        text-align: center;
                        font-size: 28px;
                        font-weight: bold;
                        letter-spacing: 6px;
                        border-radius: 6px;
                    ">
                        ${otp}
                    </div>

                    <p style="
                        margin-top: 25px;
                        color: #555;
                    ">
                        This invitation and verification code
                        expire in 24 hours.
                    </p>

                    <p style="color: #555;">
                        If you did not request access to RehabLedger,
                        you can ignore this email.
                    </p>

                    <hr style="
                        border: none;
                        border-top: 1px solid #ddd;
                        margin: 30px 0;
                    ">

                    <p style="
                        font-size: 12px;
                        color: #777;
                    ">
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
    sendRegistrationInvitation
};