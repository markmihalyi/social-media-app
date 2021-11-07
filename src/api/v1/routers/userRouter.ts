import { Router, Request, Response, NextFunction } from 'express';
import auth from '../middlewares/auth';
import User from '../models/userModel';
import bcrypt from 'bcryptjs';
import validator from 'email-validator';

const router = Router();

router.post('/changePassword', auth, async (req: Request, res: Response) => {
    const { verifyPass, newPass, newPassVerify } = req.body;

    /** Adatok ellenőrzése */
    if (!verifyPass || !newPass || !newPassVerify) {
        return res.status(400).json({
            errorMessage: 'Nem töltöttél ki minden mezőt.'
        });
    }

    if (newPass != newPassVerify) {
        return res.status(400).json({
            errorMessage: 'A két jelszó nem egyezik meg.'
        });
    }

    const existingUser = await User.findOne({ _id: req.user });

    const passwordCorrect = await bcrypt.compare(verifyPass, existingUser.passwordHash);
    if (!passwordCorrect) {
        return res.status(401).json({
            errorMessage: 'A megadott jelszó helytelen.'
        });
    }

    /** Jelszó titkosítása */
    const salt = await bcrypt.genSalt();
    const newPassHash = await bcrypt.hash(newPass, salt);

    /** Jelszó megváltoztatása */
    await User.updateOne({ _id: req.user }, { passwordHash: newPassHash });

    return res.status(200).send();
});

router.post('/changeEmail', auth, async (req: Request, res: Response) => {
    const { verifyPass, newEmail } = req.body;

    /** Adatok ellenőrzése */
    if (!verifyPass || !newEmail) {
        return res.status(400).json({
            errorMessage: 'Nem töltöttél ki minden mezőt.'
        });
    }

    const emailValid = validator.validate(newEmail);

    if (!emailValid) {
        return res.status(400).json({
            errorMessage: 'Érvénytelen email címet adtál meg.'
        });
    }

    const existingUser = await User.findOne({ _id: req.user });

    const passwordCorrect = await bcrypt.compare(verifyPass, existingUser.passwordHash);
    if (!passwordCorrect) {
        return res.status(401).json({
            errorMessage: 'A megadott jelszó helytelen.'
        });
    }

    /** Email megváltoztatása */
    await User.updateOne({ _id: req.user }, { email: newEmail });

    return res.status(200).send();
});
export = router;
