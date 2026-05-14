const userModel = require('../models/user.model');
const sendEmail = require('../utils/mailer');
const { signUpSchema, loginSchema,changePasswordSchema } = require("../schemas/auth.schema");
const { generateToken } = require('../utils/jwt');
const { notifyRole } = require('../utils/notify');
const crypto = require('crypto');

async function signUp(req, res) {
    try {
        const validation = signUpSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                status: false,
                message: "Validation failed",
                errors: validation.error.flatten()
            })
        };
        // firstName, lastName, email, password, confirmPassword, dob
        const { firstName, lastName, nomOrganisation, email, password, confirmPassword, dob, telephone, role, region, dateDeclaration, dateDiagnostic, adresse, membreDepuis, competences } = req.body;

        const existingUser = await userModel.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                status: false,
                message: 'Email already registered'
            })
        }

        // For associations use nomOrganisation as firstName
        const resolvedFirstName = role === 'ASSOCIATION' ? (nomOrganisation || firstName || '') : (firstName || '');
        const resolvedLastName = role === 'ASSOCIATION' ? '' : (lastName || '');

        const user = await userModel({
            email: email,
            firstName: resolvedFirstName,
            lastName: resolvedLastName,
            nomOrganisation: role === 'ASSOCIATION' ? (nomOrganisation || firstName) : undefined,
            password: password,
            confirmPassword: confirmPassword,
            dob: dob,
            telephone: telephone,
            role: role,
            region: region,
            dateDeclaration: role === 'FEMME MALADE' ? dateDeclaration : undefined,
            dateDiagnostic: role === 'FEMME MALADE' ? dateDiagnostic : undefined,
            membreDepuis: role === 'FEMME MALADE' ? membreDepuis : undefined,
            adresse: role === 'ASSOCIATION' ? adresse : undefined,
            competences: role === 'BENEVOLE' ? (competences || []) : undefined,
        })

        await user.save();
        // Générer token après création
        const token = generateToken(user._id);

        // Notify admins of the new registration
        const isAssociation = role === 'ASSOCIATION';
        const displayName = isAssociation
          ? (nomOrganisation || resolvedFirstName)
          : `${resolvedFirstName} ${resolvedLastName}`.trim();

        // SEND WELCOME MAIL
        const options = {
            email: email,
            subject: "Welcome Mail",
            content: `Welcome aboard ${displayName}. Sent from http://localhost:3000`
        }

        await sendEmail(options);

        await notifyRole(
          'ADMINISTRATEUR',
          isAssociation
            ? `Nouvelle association inscrite : ${displayName}.`
            : `Nouvel utilisateur inscrit : ${displayName} (${role || 'USER'}).`,
          isAssociation ? 'new_association' : 'new_user',
          '/users'
        );

        res.status(201).json({
            status: true,
            message: `Welcome aboard ${displayName}`
        })

    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
}

async function login(req, res) {
    try {
        const validation = loginSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                errors: validation.error.flatten()
            })
        };

        const { email, password } = req.body;

        // Find user by email
        const user = await userModel.findOne({ email }).select("+password");

        // Case1: user not found -> return error
        if (!user) {
            return res.status(400).json({
                status: false,
                message: "Invalid credentials"
            })
        };
        // Case2: user found -> check password
        const passwordMatch = await user.comparePassword(password);
        // case2.1: password incorrect -> return error
        if (!passwordMatch) {
            return res.status(400).json({
                status: false,
                message: "Invalid credentials"
            })
        }
        // case2.2: password correct -> generation auth token
        const token = generateToken(user._id);
        res.status(200).json({
            status:true,
            message: "logged in successfully",
            token
        })
    } catch (error) {
        res.status(500).json({
            status: false,
            message: error.message
        })
    }
}
async function getMe(req, res) {
    try {
        console.log('[AUTH] /me endpoint called, user:', req.user?._id);
        res.status(200).json({
            status: true,
            user: req.user
        });

    } catch (error) {
        console.error('[AUTH /me ERROR]', error.message, error.stack);
        res.status(500).json({
            message: error.message || "Internal server error"
        });
    }
}
async function changePassword(req,res) {
    try {
        const validation = changePasswordSchema.safeParse(req.body);
        if(! validation.success){
            return res.status(400).json({
                status: false,
                message: "Validation failed",
                errors: validation.error.flatten()
        });
    }
    const {currentPassword,newPassword,confirmNewPassword} = req .body;
    //fetch user +password 
   const user = await userModel.findById(req.user._id).select("+password");
    // verify current Password
    const passwordMatch =await user.comparePassword(currentPassword);
    if(!passwordMatch){
        return res.status (400).json({
            status:false,
            message:"Current password is incorect "
        });
    }
    // set new password to pre-save trigger
    user.password=newPassword;
    user.confirmPassword=confirmNewPassword;
    
    await  user.save();
    res.status(200).json({
        status:true,
        message:'Password changed succesfuly'
    })

} catch (error) {
        res.status(500).json({
            message: error.message || "Internal server error"
        });
    }
}

async function forgotPassword(req, res) {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ status: false, message: 'Email is required' });
        }

        const user = await userModel.findOne({ email });
        if (!user) {
            // Return success even if user not found to avoid email enumeration
            return res.status(200).json({ status: true, message: 'If that email is registered, a reset link has been sent.' });
        }

        // Generate a random token
        const rawToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

        await userModel.updateOne(
            { _id: user._id },
            { $set: { resetPasswordToken: hashedToken, resetPasswordExpire: new Date(Date.now() + 15 * 60 * 1000) } }
        );

        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${rawToken}`;

        await sendEmail({
            email: user.email,
            subject: 'Réinitialisation de mot de passe',
            content: `Bonjour ${user.firstName},\n\nCliquez sur ce lien pour réinitialiser votre mot de passe (valable 15 minutes) :\n${resetUrl}\n\nSi vous n'avez pas fait cette demande, ignorez cet email.`
        });

        res.status(200).json({ status: true, message: 'Un email de réinitialisation a été envoyé.' });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
}

async function resetPassword(req, res) {
    try {
        const { token } = req.params;
        const { newPassword, confirmNewPassword } = req.body;

        if (!newPassword || !confirmNewPassword) {
            return res.status(400).json({ status: false, message: 'New password and confirmation are required' });
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        console.log('[RESET PWD] hashedToken:', hashedToken);
        console.log('[RESET PWD] now:', new Date());

        const dbUser = await userModel.findOne({ resetPasswordToken: hashedToken }).select('+resetPasswordToken +resetPasswordExpire');
        console.log('[RESET PWD] user found by token:', dbUser ? `id=${dbUser._id} expire=${dbUser.resetPasswordExpire}` : 'NOT FOUND');

        const user = await userModel.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: new Date() }
        }).select('+password +resetPasswordToken +resetPasswordExpire');

        if (!user) {
            return res.status(400).json({ status: false, message: 'Token invalide ou expiré.' });
        }

        user.password = newPassword;
        user.confirmPassword = confirmNewPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.status(200).json({ status: true, message: 'Mot de passe réinitialisé avec succès.' });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
}
module.exports = { signUp, login ,getMe,changePassword, forgotPassword, resetPassword};
