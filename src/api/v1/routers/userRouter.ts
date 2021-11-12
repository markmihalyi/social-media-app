import { Router, Request, Response, NextFunction } from 'express';
import auth from '../middlewares/auth';
import User from '../models/userModel';
import Post from '../models/postModel';
import bcrypt from 'bcryptjs';
import validator from 'email-validator';
import { isValidObjectId, Types } from 'mongoose';
import { IComment } from '../interfaces/commentInterface';
import { IReaction } from '../interfaces/reactionInterface';
import { IFriend } from '../interfaces/friendInterface';
import axios from 'axios';
import config from '../../../config/config';
import logger from '../../../config/logger';
import moment from 'moment';

const router = Router();

const NAMESPACE = 'USER';

/**********
 * FRIEND *
 *********/

// Jelenleg nem kell bejelentkezve lenni a barátlista lekérdezéséhez.
// Ha ezen változtatnál, akkor írd ide az auth middleware-t.
router.get('/getFriends', async (req: Request, res: Response) => {
    const { userId } = req.query;

    /** Adatok ellenőrzése */
    if (!userId) {
        return res.status(400).json({
            errorMessage: 'Érvénytelen kérés.'
        });
    }

    const user = await User.findOne({ _id: userId });
    if (!user) {
        return res.status(400).json({
            errorMessage: 'Nem létezik fiók ilyen azonosítóval.'
        });
    }

    /** Barátlista visszaadása válaszként */
    return res.status(200).json({
        friends: user.friends
    });
});

router.post('/addFriend', auth, async (req: Request, res: Response) => {
    const currentUserId = req.user.toString();
    const targetUserId = req.body.userId;

    /** Adatok ellenőrzése */
    if (!targetUserId) {
        return res.status(400).json({
            errorMessage: 'Érvénytelen kérés.'
        });
    }

    if (!isValidObjectId(targetUserId)) {
        return res.status(400).json({
            errorMessage: 'A megadott fiók azonosító nem érvényes.'
        });
    }

    if (targetUserId == currentUserId) {
        return res.status(400).json({
            errorMessage: 'Magadat nem jelölheted meg ismerősnek. :('
        });
    }

    const user = await User.findOne({ _id: currentUserId });
    if (!user) {
        return res.status(401).json({
            errorMessage: 'Hozzáférés megtagadva.'
        });
    }

    const targetUser = await User.findOne({ _id: targetUserId });
    if (!targetUser) {
        return res.status(400).json({
            errorMessage: 'Nem létezik fiók ilyen azonosítóval.'
        });
    }

    /*********************/
    /** Barát hozzáadása */
    /*********************/

    /** Küldő fél */
    /** (CU = currentUser) */

    const pendingFriendsCU: Array<IFriend> = user.friends.pending;
    const approvedFriendsCU: Array<IFriend> = user.friends.approved;

    let alreadySentFriendRequest = false;
    let alreadyFriend = false;
    pendingFriendsCU.forEach((friend) => {
        if (friend.userId == targetUserId) {
            alreadySentFriendRequest = true;
        }
    });
    approvedFriendsCU.forEach((friend) => {
        if (friend.userId == targetUserId) {
            alreadyFriend = true;
        }
    });

    if (alreadySentFriendRequest) {
        return res.status(409).json({
            errorMessage: 'Már küldtél barátkérelmet ennek a személynek.'
        });
    }

    if (alreadyFriend) {
        return res.status(409).json({
            errorMessage: 'Ez a személy már az ismerősöd.'
        });
    }

    const CUFriend: IFriend = {
        userId: targetUserId,
        type: 'pending'
    };

    pendingFriendsCU.push(CUFriend);

    const friendsCurrent = {
        pending: pendingFriendsCU,
        approved: approvedFriendsCU
    };

    /** Fogadó fél */
    /** (TU = targetUser) */

    const pendingFriendsTU: Array<IFriend> = targetUser.friends.pending;
    const approvedFriendsTU: Array<IFriend> = targetUser.friends.approved;

    const TUFriend: IFriend = {
        userId: currentUserId,
        type: 'pending'
    };

    pendingFriendsTU.push(TUFriend);

    const friendsTarget = {
        pending: pendingFriendsTU,
        approved: approvedFriendsTU
    };

    /** Adatok mentése az adatbázisba */

    await user.updateOne({ friends: friendsCurrent });
    await targetUser.updateOne({ friends: friendsTarget });

    return res.status(200).send();
});

/************
 * REACTION *
 ***********/

router.get('/getReaction', auth, async (req: Request, res: Response) => {
    const userId = req.user.toString();
    const { postId } = req.query;

    /** Adatok ellenőrzése */
    if (!postId) {
        return res.status(400).json({
            errorMessage: 'Érvénytelen kérés.'
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
            errorMessage: 'Érvénytelen kérés.'
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
    const userId = req.user.toString();
    const { postId, commentId } = req.body;

    /** Adatok ellenőrzése */
    if (!postId || !commentId) {
        return res.status(400).json({
            errorMessage: 'Érvénytelen kérés.'
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

    let commentUserId;
    comments.forEach((comment: IComment) => {
        if (comment._id.toString() == commentId) {
            commentUserId = comment.userId;
        }
    });

    if (!commentUserId) {
        return res.status(400).json({
            errorMessage: 'Nem létezik hozzászólás ilyen azonosítóval.'
        });
    }

    if (commentUserId != userId) {
        return res.status(401).json({
            errorMessage: 'Hozzáférés megtagadva.'
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
    const userId = req.user.toString();
    const { postId } = req.body;

    /** Adatok ellenőrzése */
    if (!postId) {
        return res.status(400).json({
            errorMessage: 'Érvénytelen kérés.'
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

    if (post.userId != userId) {
        return res.status(401).json({
            errorMessage: 'Hozzáférés megtagadva.'
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
