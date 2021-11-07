import { Router, Request, Response } from 'express';
import Post from '../models/postModel';

const router = Router();

router.get('/getPosts', async (req: Request, res: Response) => {
    Post.find({}, function (err, posts) {
        res.send(posts);
    });
});

export = router;
