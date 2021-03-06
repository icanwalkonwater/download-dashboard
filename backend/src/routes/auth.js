import express from 'express';
import { validate } from '../validator';
import schemas from '../schemas/schemas';
import * as serviceRegister from '../services/serviceManager';
import { AuthenticationError, AuthService } from '../services/authService';
import authMiddleware from '../middlewares/authMiddleware';
import { commonOk } from '../commonPayload';

const router = express.Router();
const authService = serviceRegister.createGetter(AuthService.ID);

router.post('/', validate({body: schemas.auth}), (req, res, next) => {

    if (!authService().checkPassword(req.body.password)) {
        next(new AuthenticationError());
    } else {
        res.json({
            token: authService().createToken(),
            refreshToken: authService().createRefreshToken()
        });
    }
});

router.post('/refresh', validate({body: schemas.authRefresh}), (req, res, next) => {

    // If the check fails, an error is thrown and catch later
    authService().verifyRefreshToken(req.body.refreshToken).then(() => {
        res.json({
            token: authService().createToken()
        });
    }).catch(next); // Let the middleware handle it
});

router.get('/check', authMiddleware, (req, res, next) => {
    res.json(commonOk);
});

export default router;
