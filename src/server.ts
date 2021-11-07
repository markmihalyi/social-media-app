import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import config from './config/config';
import logger from './config/logger';
import cookieParser from 'cookie-parser';
import cors from 'cors';

const NAMESPACE = 'SERVER';

/** Szerver beállítása */
const app = express();

app.listen(config.server.port, () => logger.info(NAMESPACE, `A webszerver elindult. (${config.server.hostname}:${config.server.port}))`));

app.use(express.json());
app.use(cookieParser());
app.use(
    cors({
        origin: config.server.acceptedOrigins,
        credentials: true
    })
);

/** Csatlakozás a MongoDB-hez */
mongoose.connect(config.mongoUrl, (err) => {
    if (err) return logger.error(NAMESPACE, 'Nem sikerült csatlakozni a MongoDB-hez.');
    logger.info(NAMESPACE, 'Csatlakozva a MongoDB-hez.');
});

/** HTTP-kérések naplózása */
if (config.httpLogging == 'true') {
    app.use((req: Request, res: Response, next: NextFunction) => {
        logger.info(NAMESPACE, `REQSENT - [${req.method}], [${req.url}], [${req.socket.remoteAddress}]`);
        res.on('finish', () => {
            logger.info(NAMESPACE, `REQDONE - [${req.method}], [${req.url}], [${req.socket.remoteAddress}], [${res.statusCode}]`);
        });
        next();
    });
}

/** API útvonalak beállítása */
app.use('/auth', require('./api/v1/routers/authRouter'));
app.use('/user', require('./api/v1/routers/userRouter'));
app.use('/post', require('./api/v1/routers/postRouter'));

app.get('*', (req: Request, res: Response) => {
    res.status(404).json({
        errorMessage: 'Ez az útvonal nem elérhető.'
    });
});
