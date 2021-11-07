import { Router, Request, Response } from 'express';
import config from '../../../config/config';
import logger from '../../../config/logger';
import validator from 'email-validator';
import User from '../models/userModel';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const NAMESPACE = 'Auth';

const router = Router();

/** Regisztráció */
router.post('/register', async (req: Request, res: Response) => {
    try {
        const { email, username, password, passwordVerify } = req.body;

        /** Adatok ellenőrzése */
        if (!email || !username || !password || !passwordVerify)
            return res.status(400).json({
                errorMessage: 'Nem töltöttél ki minden mezőt.'
            });

        const emailValid = validator.validate(email);
        if (!emailValid)
            return res.status(400).json({
                errorMessage: 'A megadott email cím érvénytelen.'
            });

        if (username.length < 4)
            return res.status(400).json({
                errorMessage: 'A felhasználónévnek minimum 4 karakterből kell állnia.'
            });

        if (password.length < 6)
            return res.status(400).json({
                errorMessage: 'A jelszónak minimum 6 karakterből kell állnia.'
            });

        if (password !== passwordVerify)
            return res.status(400).json({
                errorMessage: 'A két jelszó nem egyezik meg.'
            });

        const existingEmail = await User.findOne({ email: email });
        if (existingEmail)
            return res.status(400).json({
                errorMessage: 'A megadott email cím már foglalt.'
            });

        const existingUsername = await User.findOne({ username: username });
        if (existingUsername)
            return res.status(400).json({
                errorMessage: 'A megadott felhasználónév már foglalt.'
            });

        /** Jelszó titkosítása */
        const salt = await bcrypt.genSalt();
        const passwordHash = await bcrypt.hash(password, salt);

        /** Új fiók elmentése az adatbázisba */
        const newUser = new User({ email, username, passwordHash });
        const savedUser = await newUser.save();

        /** Token létrehozása */
        const token = jwt.sign({ user: savedUser._id }, config.jwtSecret);

        /** Token továbbítása HTTP-only cookie-ként */
        res.cookie('token', token, { httpOnly: true }).send();
    } catch (err) {
        logger.error(NAMESPACE, 'Hiba történt az adatok lekérdezésekor. (reg)', err);
        res.status(500).send();
    }
});

router.post('/login', async (req: Request, res: Response) => {
    try {
        const { emailOrUsername, password } = req.body;

        /** Adatok ellenőrzése */
        if (!emailOrUsername || !password)
            return res.status(400).json({
                errorMessage: 'Nem töltöttél ki minden mezőt.'
            });

        const isEmail = validator.validate(emailOrUsername);

        let existingUser;
        if (isEmail) {
            existingUser = await User.findOne({ email: emailOrUsername });
        } else {
            existingUser = await User.findOne({ username: emailOrUsername });
        }

        if (!existingUser) {
            if (isEmail) {
                return res.status(401).json({
                    errorMessage: 'Hibás email cím vagy jelszó.'
                });
            } else {
                return res.status(401).json({
                    errorMessage: 'Hibás felhasználónév vagy jelszó.'
                });
            }
        }

        const passwordCorrect = await bcrypt.compare(password, existingUser.passwordHash);
        if (!passwordCorrect) {
            if (isEmail) {
                return res.status(401).json({
                    errorMessage: 'Hibás email cím vagy jelszó.'
                });
            } else {
                return res.status(401).json({
                    errorMessage: 'Hibás felhasználónév vagy jelszó.'
                });
            }
        }

        /** Token létrehozása */
        const token = jwt.sign({ user: existingUser._id }, config.jwtSecret);

        /** Token továbbítása HTTP-only cookie-ként */
        res.cookie('token', token, {
            httpOnly: true,
            expires: new Date(new Date().getTime() + 10 * 60 * 1000)
        }).send();
    } catch (err) {
        logger.error(NAMESPACE, 'Hiba történt az adatok lekérdezésekor. (login)', err);
        res.status(500).send();
    }
});

router.get('/loggedIn', (req: Request, res: Response) => {
    try {
        const token = req.cookies.token;
        if (!token) return res.json(false);

        jwt.verify(token, config.jwtSecret);

        return res.send(true);
    } catch (err) {
        return res.json(false);
    }
});

router.get('/logout', (req: Request, res: Response) => {
    res.cookie('token', '', {
        httpOnly: true,
        expires: new Date(0)
    }).send();
});

router.get('*', (req: Request, res: Response) => {
    res.status(404).json({
        errorMessage: 'Ez az útvonal nem elérhető.'
    });
});

export = router;
