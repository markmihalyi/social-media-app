import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        email: { type: String, required: true },
        username: { type: String, required: true },
        passwordHash: { type: String, required: true },
        friends: {
            pending: [
                {
                    userId: { type: String }
                }
            ],
            approved: [
                {
                    userId: { type: String },
                    friendSince: { type: String }
                }
            ]
        }
    },
    { versionKey: false }
);

const User = mongoose.model('user', userSchema);
export = User;
