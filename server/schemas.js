import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema({

    username: {

        type: String,
        required: true,
        unique: true

    },
    password: {

        type: String,
        required: true

    },
    chars: {

        type: [String]

    }

});

export const UserModel = mongoose.model('User', userSchema);