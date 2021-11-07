import { Router, Request, Response } from 'express';
import auth from '../middlewares/auth';
import User from '../models/userModel';
import Post from '../models/postModel';
import bcrypt from 'bcryptjs';
import validator from 'email-validator';
import { isValidObjectId, Types } from 'mongoose';

const router = Router();

router.post('/createPost', auth, async (req: Request, res: Response) => {
    const { userId, text } = req.body;

    /** Adatok ellenőrzése */
    if (!userId || !text) {
        return res.status(400).json({
            errorMessage: 'Nem töltöttél ki minden mezőt.'
        });
    }

    if (userId != req.userId) {
        return res.status(401).json({
            errorMessage: 'Hozzáférés megtagadva.'
        });
    }

    /** Poszt létrehozása */
    const newPost = new Post({ userId, text });
    await newPost.save();

    return res.status(200).send();
});

router.delete('/deletePost', auth, async (req: Request, res: Response) => {
    const postId = req.body.postId;

    /** Adatok ellenőrzése */
    if (!postId) {
        return res.status(400).json({
            errorMessage: 'Nem töltöttél ki minden mezőt.'
        });
    }

    if (!isValidObjectId(postId)) {
        return res.status(400).json({
            errorMessage: 'A megadott azonosító nem érvényes.'
        });
    }

    const post = await Post.findOne({ _id: new Types.ObjectId(postId) });
    if (!post) {
        return res.status(400).json({
            errorMessage: 'Nem létezik poszt ilyen azonosítóval.'
        });
    }

    if (post.userId != req.userId) {
        return res.status(401).json({
            errorMessage: 'Hozzáférés megtagadva.'
        });
    }

    /** Poszt törlése */
    await Post.deleteOne({ _id: new Types.ObjectId(postId) });

    return res.status(200).send();
});

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

    const existingUser = await User.findOne({ _id: req.userId });

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
    await User.updateOne({ _id: req.userId }, { passwordHash: newPassHash });

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

    const existingUser = await User.findOne({ _id: req.userId });

    const passwordCorrect = await bcrypt.compare(verifyPass, existingUser.passwordHash);
    if (!passwordCorrect) {
        return res.status(401).json({
            errorMessage: 'A megadott jelszó helytelen.'
        });
    }

    /** Email megváltoztatása */
    await User.updateOne({ _id: req.userId }, { email: newEmail });

    return res.status(200).send();
});
export = router;
