import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true },
        text: { type: String, required: true }
        /**
        comments: [
            {
                userId: { type: String },
                text: { type: String }
            }
        ]
        */
    },
    { versionKey: false }
);

const Post = mongoose.model('post', postSchema);
export = Post;
