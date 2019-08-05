import { ValidationError } from 'express-json-validator-middleware';

export const notFoundMiddleware = (err, req, res, next) => {
    // 404
    res.status(404).json({
        error: true,
        code: 404,
        message: 'Route not found'
    });
};

export const validationFailedMiddleware = (err, req, res, next) => {
    // Schema validation failed
    if (err instanceof ValidationError) {
        res.status(422).json({
            error: true,
            code: 422,
            message: 'Unprocessable entity',
            name: err.name,
            errors: err.validationErrors.body
        });
    } else {
        next();
    }
};