import { Request, Response, NextFunction } from 'express';
import config from '../../../config/config';
import jwt from 'jsonwebtoken';
import { IToken } from '../interfaces/tokenInterface';

function auth(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>> {
    try {
        const token = req.cookies.token;
        if (!token)
            return res.status(401).json({
                errorMessage: 'Hozzáférés megtagadva.'
            });

        const verified = jwt.verify(token, config.jwtSecret);
        req.user = (<IToken>verified).user;

        return next();
    } catch (err) {
        return res.status(401).json({
            errorMessage: 'Hozzáférés megtagadva.'
        });
    }
}

export = auth;
