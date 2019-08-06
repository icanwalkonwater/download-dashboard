import express from 'express';
import bodyParser from 'body-parser';
import * as serviceManager from './services/serviceManager';
import authRoutes from './routes/auth';
import metricsRoutes from './routes/metrics';
import { notFoundMiddleware, validationFailedMiddleware } from './middlewares/commonMiddlewares';
import cors from 'cors';
import baseLogger from './baseLogger';

const logger = baseLogger.scope('App____');

export const run = async () => {
    logger.start('App starting');

    // Load and start services
    try {
        await serviceManager.load();
    } catch (e) {
        logger.error('Service manager failure, exiting');
        process.exit(1);
        return;
    }

    logger.pending('Setting up web server');
    const app = express();

    // Altering middleware
    app.use(cors(), bodyParser.json());

    // Routes
    app.use('/auth', authRoutes);
    app.use(metricsRoutes);

    // Fallback middleware
    app.use(validationFailedMiddleware,
        notFoundMiddleware);

    // Setup shutdown hooks for graceful shutdown
    process.once('SIGHUP', shutdownHook);
    process.once('SIGINT', shutdownHook);
    process.once('SIGTERM', shutdownHook);

    const port = process.env.PORT;
    app.listen(port, () => logger.success(`App ready at http://localhost:${port} !`));
};

const shutdownHook = async () => {
    logger.pending('Shutdown initiated');

    // Shutdown services
    try {
        await serviceManager.unload();
    } catch (e) {
        logger.error('Service manager failure, exiting');
        process.exit(1);
        return;
    }

    logger.success('App stopped !');
    process.exit(0);
};
