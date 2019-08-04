import * as jwt from 'jsonwebtoken';
import redis from './redisService';

export class AuthService {

    constructor(config) {
        this.config = config;
    }

    checkPassword(suppliedPassword) {
        return suppliedPassword === this.config.password;
    }

    extractToken(rawHeader, check = false) {
        if (check) {
            if (/Bearer \.+/i.test(rawHeader)) {
                throw new Error('MalformedHeader');
            }
        }

        return rawHeader.split(' ', 2)[1].trim();
    }

    createToken() {
        const payload = {
            created: +Date()
        };

        return jwt.sign(payload, this.config.secret, {
            algorithm: this.config.algorithm,
            expiresIn: this.config.lifespan
        });
    }

    createRefreshToken() {
        const payload = {
            created: +Date()
        };

        const token = jwt.sign(payload, this.config.secret, {
            algorithm: this.config.algorithm,
            expiresIn: this.config.lifespanRefresh
        });

        redis.registerRefreshToken(token);
        return token;
    }

    verifyToken(token) {
        try {
            // Will throw if errored
            jwt.verify(token, this.config.secret, {
                algorithms: [this.config.algorithm]
            });

            return true;
        } catch (e) {
            return false;
        }
    }

    async verifyRefreshToken(token) {
        try {
            jwt.verify(token, this.config.secret, {
                algorithms: [this.config.algorithm]
            });

            return await redis.checkRefreshTokenExists(token);
        } catch (e) {
            return false;
        }
    }
}

const service = new AuthService({
    password: process.env.JWT_PASSWORD || '',
    secret: process.env.JWT_SECRET || '',
    algorithm: process.env.JWT_ALG || 'HS256',
    lifespan: process.env.JWT_LIFESPAN || '1d',
    lifespanRefresh: process.env.JWT_LIFESPAN_REFRESH || '7d'
});

export const authMiddleware = (req, res, next) => {
    const reject = () => {
        // Unauthorized
        res.status(403).end();
    };

    // Check header
    const authHeader = req.get('Authorization');
    if (!authHeader) {
        return reject();
    }

    // Check if bearer token
    try {
        const token = service.extractToken(authHeader, true);

        // Check token
        if (!service.verifyToken(token)) {
            return reject();
        }

    } catch (e) {
        // Malformed header
        return reject();
    }

    // All good
    next();
};

export default service;