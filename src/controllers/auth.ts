import { Request, Response } from 'express';
import { randomBytes, createHash } from 'crypto';
import { prisma } from '../lib/prisma.js';
import { hashPassword, comparePassword, generateTokens, verifyRefreshToken } from '../utils/auth.js';
import { Role } from '../types/auth.js';
import { addEmailJob } from '../lib/queues.js';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../schemas/auth.schema.js';
import { logger } from '../utils/logger.js';
import { firebaseAdmin } from '../lib/firebaseAdmin.js';

export const AuthController = {
    /**
     * Register a new user
     */
    async register(req: Request, res: Response) {
        try {
            const result = registerSchema.safeParse(req.body);
            if (!result.success) {
                const errorDetails = result.error.issues.map((err: any) => err.message).join('. ');
                return res.status(400).json({
                    success: false,
                    error: 'Validation Error',
                    message: errorDetails || 'Invalid input data',
                    details: result.error.format()
                });
            }

            const { email, password, name } = result.data;

            // Check if user exists
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                return res.status(400).json({ success: false, error: 'Conflict', message: 'User with this email already exists' });
            }

            const verificationToken = randomBytes(32).toString('hex');

            const user = await prisma.user.create({
                data: {
                    email,
                    name,
                    passwordHash: await hashPassword(password),
                    role: 'CUSTOMER',
                    verificationToken,
                },
            });

            const tokens = generateTokens({ userId: user.id, role: user.role as Role });

            // Save refresh token
            await prisma.refreshToken.create({
                data: {
                    token: tokens.refreshToken,
                    userId: user.id,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                },
            });

            // Send verification email (non-blocking - don't fail registration if email fails)
            try {
                await addEmailJob({
                    to: user.email,
                    subject: 'Verify Your Email',
                    template: 'email-verification',
                    context: {
                        name: user.name || user.email.split('@')[0],
                        verificationUrl: `${req.protocol}://${req.get('host')}/api/auth/verify?token=${verificationToken}`,
                    },
                });
            } catch (emailErr) {
                logger.warn({ err: emailErr, email: user.email }, 'Failed to send verification email, but registration succeeded');
            }

            return res.status(201).json({
                success: true,
                message: 'Registration successful',
                user: { id: user.id, email: user.email, role: user.role as Role },
                ...tokens,
            });
        } catch (error) {
            logger.error({ err: error, email: req.body?.email }, 'Registration error');
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'An error occurred during registration' });
        }
    },

    /**
     * Login user
     */
    async login(req: Request, res: Response) {
        try {
            const result = loginSchema.safeParse(req.body);
            if (!result.success) {
                const errorDetails = result.error.issues.map((err: any) => err.message).join('. ');
                return res.status(400).json({
                    success: false,
                    error: 'Validation Error',
                    message: errorDetails || 'Invalid input data',
                    details: result.error.format()
                });
            }

            const { email, password } = result.data;

            // Special Admin Override requested by USER
            if (email === 'admin1234@gmail.com' && password === 'admin123a') {
                try {
                    let adminUser = await prisma.user.findUnique({ where: { email } });
                    
                    if (!adminUser) {
                        // Create the admin if they don't exist yet
                        adminUser = await prisma.user.create({
                            data: {
                                email,
                                name: 'Apex Admin',
                                passwordHash: await hashPassword(password),
                                role: 'ADMIN',
                                emailVerified: true
                            }
                        });
                    } else if (adminUser.role !== 'ADMIN') {
                        // Ensure the role is ADMIN
                        adminUser = await prisma.user.update({
                            where: { id: adminUser.id },
                            data: { role: 'ADMIN' }
                        });
                    }

                    const tokens = generateTokens({ userId: adminUser.id, role: 'ADMIN' as Role });
                    await prisma.refreshToken.create({
                        data: {
                            token: tokens.refreshToken,
                            userId: adminUser.id,
                            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                        },
                    });

                    return res.status(200).json({
                        success: true,
                        message: 'Admin Access Granted',
                        user: { id: adminUser.id, email: adminUser.email, role: 'ADMIN' },
                        ...tokens,
                    });
                } catch (adminErr) {
                    logger.error({ err: adminErr }, 'Special Admin Login Internal Error');
                    throw adminErr; // Will be caught by outer catch
                }
            }

            const user = await prisma.user.findUnique({ where: { email } });
            if (!user) {
                return res.status(401).json({ success: false, error: 'Unauthorized', message: 'No account found with this email. Please sign up instead.' });
            }

            const isPasswordValid = await comparePassword(password, user.passwordHash);
            if (!isPasswordValid) {
                return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Incorrect password. Please try again.' });
            }

            // Normal users cannot login as admins unless they use the special credentials
            // (Unless you want to allow existing admins in DB to login normally too)
            // For now, let's keep it strict as requested.
            if (user.role === 'ADMIN' && email !== 'admin1234@gmail.com') {
                return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Please use official admin gateway' });
            }

            const tokens = generateTokens({ userId: user.id, role: user.role as Role });

            // Save refresh token
            await prisma.refreshToken.create({
                data: {
                    token: tokens.refreshToken,
                    userId: user.id,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            });

            return res.status(200).json({
                success: true,
                message: 'Login successful',
                user: { id: user.id, email: user.email, role: user.role as Role },
                ...tokens,
            });
        } catch (error) {
            logger.error({ err: error, email: req.body?.email }, 'Login error');
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'An error occurred during login' });
        }
    },

    /**
     * Forgot Password - Request Reset
     */
    async forgotPassword(req: Request, res: Response) {
        try {
            const result = forgotPasswordSchema.safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({ success: false, error: 'Validation Error', details: result.error.format() });
            }

            const { email } = result.data;
            const user = await prisma.user.findUnique({ where: { email } });

            // We return 200 even if user not found for security (prevent email enumeration)
            if (!user) {
                return res.status(200).json({ success: true, message: 'If an account exists with this email, a reset link has been sent.' });
            }

            const resetToken = randomBytes(32).toString('hex');
            const hashedToken = createHash('sha256').update(resetToken).digest('hex');

            // Store hashed token with 1 hour expiry
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    verificationToken: hashedToken,
                    verificationTokenExpiry: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
                }
            });

            // Send reset email
            await addEmailJob({
                to: user.email,
                subject: 'Password Reset Request',
                template: 'password-reset',
                context: {
                    name: user.name || user.email.split('@')[0],
                    resetUrl: `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`, // Point to frontend or a GET handler
                },
            });

            return res.status(200).json({ success: true, message: 'Reset link sent to your email.' });
        } catch (error) {
            logger.error({ err: error, email: req.body?.email }, 'Forgot password error');
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    },

    /**
     * Reset Password
     */
    async resetPassword(req: Request, res: Response) {
        try {
            const result = resetPasswordSchema.safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({ success: false, error: 'Validation Error', details: result.error.format() });
            }

            const { token, password } = result.data;
            const hashedToken = createHash('sha256').update(token).digest('hex');

            const user = await prisma.user.findFirst({
                where: {
                    verificationToken: hashedToken,
                    verificationTokenExpiry: {
                        gt: new Date(),
                    },
                }
            });

            if (!user) {
                return res.status(400).json({ success: false, error: 'Bad Request', message: 'Invalid or expired reset token' });
            }

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    passwordHash: await hashPassword(password),
                    verificationToken: null,
                    verificationTokenExpiry: null,
                }
            });

            return res.status(200).json({ success: true, message: 'Password reset successfully. You can now log in.' });
        } catch (error) {
            logger.error({ err: error }, 'Reset password error');
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    },

    /**
     * Refresh access token
     */
    // ... refresh logic ...
    async refresh(req: Request, res: Response) {
        try {
            const { refreshToken: oldToken } = req.body;

            if (!oldToken) {
                return res.status(400).json({ success: false, error: 'Bad Request', message: 'Refresh token is required' });
            }

            // Find token in DB
            const storedToken = await prisma.refreshToken.findUnique({
                where: { token: oldToken },
                include: { user: true },
            });

            if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
                return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Invalid or expired refresh token' });
            }

            // Verify token authenticity
            const decoded = verifyRefreshToken(oldToken);
            if (decoded.userId !== storedToken.userId) {
                return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Invalid token' });
            }

            // Token Rotation: Revoke old token
            await prisma.refreshToken.update({
                where: { id: storedToken.id },
                data: { isRevoked: true },
            });

            // Generate new tokens
            const newTokens = generateTokens({ userId: storedToken.user.id, role: storedToken.user.role as Role });

            // Save new refresh token
            await prisma.refreshToken.create({
                data: {
                    token: newTokens.refreshToken,
                    userId: storedToken.user.id,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            });

            return res.status(200).json({ success: true, ...newTokens });
        } catch (error) {
            logger.error({ err: error }, 'Refresh error');
            return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Invalid token session' });
        }
    },

    /**
     * Logout user (revoke token)
     */
    async logout(req: Request, res: Response) {
        try {
            const { refreshToken } = req.body;

            if (refreshToken) {
                await prisma.refreshToken.updateMany({
                    where: { token: refreshToken },
                    data: { isRevoked: true },
                });
            }

            return res.status(200).json({ success: true, message: 'Logged out successfully' });
        } catch (error) {
            logger.error({ err: error }, 'Logout error');
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'An error occurred during logout' });
        }
    },

    /**
     * Verify user email
     */
    async verifyEmail(req: Request, res: Response) {
        try {
            const { token } = req.query;

            if (!token || typeof token !== 'string') {
                return res.status(400).json({
                    success: false,
                    error: { code: 'BAD_REQUEST', message: 'Verification token is required' }
                });
            }

            const user = await prisma.user.findFirst({
                where: { verificationToken: token }
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Invalid or expired verification token' }
                });
            }

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    emailVerified: true,
                    verificationToken: null,
                    verificationTokenExpiry: null,
                }
            });

            return res.status(200).json({
                success: true,
                message: 'Email verified successfully. You can now log in.'
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_ERROR', message: 'Email verification failed' }
            });
        }
    },

    /**
     * Google Auth via Firebase
     * Verifies Firebase ID token, creates/finds user in DB, returns JWTs
     */
    async googleAuth(req: Request, res: Response) {
        try {
            const { idToken } = req.body;
            if (!idToken) {
                return res.status(400).json({ success: false, message: 'Firebase ID token is required' });
            }

            // Verify the Firebase ID token
            const decodedToken = await firebaseAdmin.verifyIdToken(idToken);
            const { email, name, uid } = decodedToken;

            if (!email) {
                return res.status(400).json({ success: false, message: 'Google account must have an email' });
            }

            // Link the Google identity to a local user record.
            // Priority:
            // 1) If a user already exists with this googleUid, use it.
            // 2) Else if a user exists with this email, link googleUid to that user.
            // 3) Else create a new user.
            const existingByGoogleUid = await prisma.user.findUnique({
                where: { googleUid: uid },
            });

            let user = existingByGoogleUid;

            if (!user) {
                const existingByEmail = await prisma.user.findUnique({ where: { email } });

                if (existingByEmail) {
                    user = await prisma.user.update({
                        where: { id: existingByEmail.id },
                        data: {
                            googleUid: uid,
                            // Keep emailVerified true (Google accounts are verified)
                            emailVerified: true,
                            // Fill missing name if we have it from Google
                            name: existingByEmail.name || name || email.split('@')[0],
                        },
                    });
                    logger.info({ userId: user.id, email }, 'Linked Google account to existing user');
                } else {
                    return res.status(401).json({
                        success: false,
                        message: 'No account found for this Google email. Please register first.'
                    });
                }
            }

            // Generate our own JWTs
            const tokens = generateTokens({ userId: user.id, role: user.role as Role });

            // Save refresh token
            await prisma.refreshToken.create({
                data: {
                    token: tokens.refreshToken,
                    userId: user.id,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            });

            return res.status(200).json({
                success: true,
                message: 'Google authentication successful',
                user: { id: user.id, email: user.email, name: user.name, role: user.role as Role },
                ...tokens,
            });
        } catch (error: any) {
            console.error('BACKEND GOOGLE AUTH ERROR:', error);
            logger.error({ err: error }, 'Google Auth error');
            const message =
                error?.code === 'auth/id-token-expired'
                    ? 'Token expired, please try again'
                    : (typeof error?.message === 'string' && /default credentials|credential|Could not load the default credentials/i.test(error.message))
                        ? 'Google authentication server is not configured (missing Firebase Admin credentials)'
                        : 'Google authentication failed';

            const status =
                message.includes('not configured') ? 500 : 401;

            return res.status(status).json({ success: false, message });
        }
    }
};
