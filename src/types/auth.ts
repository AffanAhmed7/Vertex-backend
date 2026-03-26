export enum Role {
    CUSTOMER = 'CUSTOMER',
    ADMIN = 'ADMIN',
}

export interface TokenPayload {
    userId: string;
    role: Role;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

declare module 'express-serve-static-core' {
    interface Request {
        user?: TokenPayload;
    }
}
