import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        email: { type: String, required: true },
        username: { type: String, required: true },
        passwordHash: { type: String, required: true },
        friends: {
            sentRequests: [
                {
                    _id: false,
                    userId: { type: String, required: true },
                    requestSent: { type: String, required: true }
                }
            ],
            pending: [
                {
                    _id: false,
                    userId: { type: String, required: true },
                    requestSent: { type: String, required: true }
                }
            ],
            accepted: [
                {
                    _id: false,
                    userId: { type: String, required: true },
                    friendSince: { type: String, required: true }
                }
            ]
        }
    },
    { versionKey: false }
);

const User = mongoose.model('user', userSchema);
export = User;
