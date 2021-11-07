import { Types } from 'mongoose';

export interface IComment {
    _id: Types.ObjectId;
    userId: string;
    text: string;
}
