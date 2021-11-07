import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true },
        text: { type: String, required: true },
        reactions: {
            thumbsUpCount: { type: Number },
            thumbsUps: [
                {
                    userId: { type: String }
                }
            ],
            heartCount: { type: Number },
            hearts: [
                {
                    userId: { type: String }
                }
            ]
        },
        comments: [
            {
                userId: { type: String },
                text: { type: String }
            }
        ]
    },
    { versionKey: false }
);

const Post = mongoose.model('post', postSchema);
export = Post;
