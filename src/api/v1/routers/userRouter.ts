import { Router, Request, Response, NextFunction } from 'express';
import auth from '../middlewares/auth';
import User from '../models/userModel';
import Post from '../models/postModel';
import bcrypt from 'bcryptjs';
import validator from 'email-validator';
import { isValidObjectId, Types } from 'mongoose';
import { IComment } from '../interfaces/commentInterface';
import { IReaction } from '../interfaces/reactionInterface';
import axios from 'axios';
import config from '../../../config/config';
import logger from '../../../config/logger';

const router = Router();

const NAMESPACE = 'USER';

/************
 * REACTION *
 ***********/

router.get('/getReaction', auth, async (req: Request, res: Response) => {
    const userId = req.user.toString();
    const { postId } = req.query;

    /** Adatok ellenőrzése */
    if (!postId) {
        return res.status(400).json({
            errorMessage: 'Nem töltöttél ki minden mezőt.'
        });
    }

    if (!isValidObjectId(postId)) {
        return res.status(400).json({
            errorMessage: 'A poszt azonosító nem érvényes.'
        });
    }

    const post = await Post.findOne({ _id: postId });
    if (!post) {
        return res.status(400).json({
            errorMessage: 'Nem létezik poszt ilyen azonosítóval.'
        });
    }

    /** Adatok feldolgozása, válasz küldése */
    let type = 'none';
    const thumbsUps: Array<IReaction> = post.reactions.thumbsUps;
    thumbsUps.forEach((reaction) => {
        if (reaction.userId == userId) {
            type = 'thumbsUp';
        }
    });

    const hearts: Array<IReaction> = post.reactions.hearts;
    hearts.forEach((reaction) => {
        if (reaction.userId == userId) {
            type = 'heart';
        }
    });

    return res.status(200).json({
        type: type
    });
});

router.patch('/sendReaction', auth, async (req: Request, res: Response) => {
    const userId = req.user.toString();
    const { postId, type } = req.body;

    /** Adatok ellenőrzése */
    if (!postId || !type) {
        return res.status(400).json({
            errorMessage: 'Nem töltöttél ki minden mezőt.'
        });
    }

    if (!isValidObjectId(postId)) {
        return res.status(400).json({
            errorMessage: 'A poszt azonosító nem érvényes.'
        });
    }

    const post = await Post.findOne({ _id: postId });
    if (!post) {
        return res.status(400).json({
            errorMessage: 'Nem létezik poszt ilyen azonosítóval.'
        });
    }

    let alreadyReacted = false;

    const thumbsUps: Array<IReaction> = post.reactions.thumbsUps;
    thumbsUps.forEach((reaction) => {
        if (reaction.userId == userId) {
            alreadyReacted = true;
        }
    });

    const hearts: Array<IReaction> = post.reactions.hearts;
    hearts.forEach((reaction) => {
        if (reaction.userId == userId) {
            alreadyReacted = true;
        }
    });

    if (alreadyReacted) {
        return res.status(409).json({
            errorMessage: 'Már reagáltál erre a posztra.'
        });
    }

    /** Reakció hozzáadása */
    let reactionsArray;
    if (type == 'thumbsUp') {
        reactionsArray = post.reactions.thumbsUps;
    } else if (type == 'heart') {
        reactionsArray = post.reactions.hearts;
    } else {
        return res.status(400).json({
            errorMessage: 'A megadott típus érvénytelen.'
        });
    }

    reactionsArray.push({ userId: userId });

    const reactionCount: number = reactionsArray.length;

    let reactions: object = {};
    if (type == 'thumbsUp') {
        reactions = {
            thumbsUpCount: reactionCount,
            thumbsUps: reactionsArray,
            heartCount: post.reactions.heartCount,
            hearts: post.reactions.hearts
        };
    } else if (type == 'heart') {
        reactions = {
            thumbsUpCount: post.reactions.thumbsUpCount,
            thumbsUps: post.reactions.thumbsUps,
            heartCount: reactionCount,
            hearts: reactionsArray
        };
    }
    await post.updateOne({ reactions: reactions });

    return res.status(200).send();
});

router.delete('/undoReaction', auth, async (req: Request, res: Response) => {
    const userId = req.user.toString();
    const { postId } = req.body;

    /** Adatok ellenőrzése */
    if (!postId) {
        return res.status(400).json({
            errorMessage: 'Nem töltöttél ki minden mezőt.'
        });
    }

    if (!isValidObjectId(postId)) {
        return res.status(400).json({
            errorMessage: 'A poszt azonosító nem érvényes.'
        });
    }

    const post = await Post.findOne({ _id: postId });
    if (!post) {
        return res.status(400).json({
            errorMessage: 'Nem létezik poszt ilyen azonosítóval.'
        });
    }

    /** Reakció visszavonása */
    let type;
    await axios
        .request({
            url: `http://${config.server.hostname}:${config.server.port}/user/getReaction?postId=${postId}`,
            method: 'get',
            headers: {
                Cookie: `token=${req.cookies.token}`,
                'Content-Type': 'application/json'
            }
        })
        .then((response) => {
            type = response.data.type;
        })
        .catch((error) => {
            return logger.error(NAMESPACE, 'Hiba történt.', error);
        });

    let reactionsArray;
    if (type == 'thumbsUp') {
        reactionsArray = post.reactions.thumbsUps;
    } else if (type == 'heart') {
        reactionsArray = post.reactions.hearts;
    } else {
        return res.status(400).json({
            errorMessage: 'Még nem reagáltál erre a posztra.'
        });
    }

    const index: number = reactionsArray.findIndex((r: IReaction) => r.userId == userId);
    reactionsArray.splice(index, 1);

    const reactionCount: number = reactionsArray.length;

    let reactions: object = {};
    if (type == 'thumbsUp') {
        reactions = {
            thumbsUpCount: reactionCount,
            thumbsUps: reactionsArray,
            heartCount: post.reactions.heartCount,
            hearts: post.reactions.hearts
        };
    } else if (type == 'heart') {
        reactions = {
            thumbsUpCount: post.reactions.thumbsUpCount,
            thumbsUps: post.reactions.thumbsUps,
            heartCount: reactionCount,
            hearts: reactionsArray
        };
    }
    await post.updateOne({ reactions: reactions });

    return res.status(200).send();
});

router.delete('/undoReaction', auth, async (req: Request, res: Response) => {});

/***********
 * COMMENT *
 **********/

router.put('/newComment', auth, async (req: Request, res: Response) => {
    const userId = req.user.toString();
    const { postId, text } = req.body;

    /** Adatok ellenőrzése */
    if (!postId || !text) {
        return res.status(400).json({
            errorMessage: 'Nem töltöttél ki minden mezőt.'
        });
    }

    if (!isValidObjectId(postId)) {
        return res.status(400).json({
            errorMessage: 'A poszt azonosító nem érvényes.'
        });
    }

    const post = await Post.findOne({ _id: new Types.ObjectId(postId) });
    if (!post) {
        return res.status(400).json({
            errorMessage: 'Nem létezik poszt ilyen azonosítóval.'
        });
    }

    /** Hozzászólás létrehozása */
    const comments = post.comments;
    comments.push({
        userId: userId,
        text: text
    });
    await post.updateOne({ comments: comments });

    return res.status(200).send();
});

router.delete('/deleteComment', auth, async (req: Request, res: Response) => {
    const { postId, commentId } = req.body;

    /** Adatok ellenőrzése */
    if (!postId || !commentId) {
        return res.status(400).json({
            errorMessage: 'Nem töltöttél ki minden mezőt.'
        });
    }

    if (!isValidObjectId(postId)) {
        return res.status(400).json({
            errorMessage: 'A poszt azonosító nem érvényes.'
        });
    }

    if (!isValidObjectId(commentId)) {
        return res.status(400).json({
            errorMessage: 'A hozzászólás azonosító nem érvényes.'
        });
    }

    const post = await Post.findOne({ _id: new Types.ObjectId(postId) });
    if (!post) {
        return res.status(400).json({
            errorMessage: 'Nem létezik poszt ilyen azonosítóval.'
        });
    }

    const comments: Array<IComment> = post.comments;

    let commentExists = false;
    comments.forEach((comment: IComment) => {
        if (comment._id.toString() == commentId) {
            commentExists = true;
        }
    });
    if (!commentExists) {
        return res.status(400).json({
            errorMessage: 'Nem létezik hozzászólás ilyen azonosítóval.'
        });
    }

    /** Hozzászólás törlése */
    const index: number = comments.findIndex((c: IComment) => c._id == commentId);
    comments.splice(index, 1);
    await post.updateOne({ comments: comments });

    return res.status(200).send();
});

/********
 * POST *
 ********/
router.post('/createPost', auth, async (req: Request, res: Response) => {
    const userId = req.user.toString();
    const { text } = req.body;

    /** Adatok ellenőrzése */
    if (!text) {
        return res.status(400).json({
            errorMessage: 'Nem töltöttél ki minden mezőt.'
        });
    }

    /** Poszt létrehozása */
    const reactions = {
        thumbsUpCount: 0,
        thumbsUps: [],
        heartCount: 0,
        hearts: []
    };

    const newPost = new Post({ userId, text, reactions });
    await newPost.save();

    return res.status(200).send();
});

router.delete('/deletePost', auth, async (req: Request, res: Response) => {
    const { postId } = req.body;

    /** Adatok ellenőrzése */
    if (!postId) {
        return res.status(400).json({
            errorMessage: 'Nem töltöttél ki minden mezőt.'
        });
    }

    if (!isValidObjectId(postId)) {
        return res.status(400).json({
            errorMessage: 'A poszt azonosító nem érvényes.'
        });
    }

    const post = await Post.findOne({ _id: new Types.ObjectId(postId) });
    if (!post) {
        return res.status(400).json({
            errorMessage: 'Nem létezik poszt ilyen azonosítóval.'
        });
    }

    /** Poszt törlése */
    await Post.deleteOne({ _id: new Types.ObjectId(postId) });

    return res.status(200).send();
});

/************
 * SETTINGS *
 ************/

router.post('/changePassword', auth, async (req: Request, res: Response) => {
    const userId = req.user.toString();
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

    const existingUser = await User.findOne({ _id: userId });

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
    await User.updateOne({ _id: userId }, { passwordHash: newPassHash });

    return res.status(200).send();
});

router.post('/changeEmail', auth, async (req: Request, res: Response) => {
    const userId = req.user.toString();
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

    const existingUser = await User.findOne({ _id: userId });

    const passwordCorrect = await bcrypt.compare(verifyPass, existingUser.passwordHash);
    if (!passwordCorrect) {
        return res.status(401).json({
            errorMessage: 'A megadott jelszó helytelen.'
        });
    }

    /** Email megváltoztatása */
    await User.updateOne({ _id: userId }, { email: newEmail });

    return res.status(200).send();
});
export = router;
