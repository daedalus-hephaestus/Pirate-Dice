import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema({
	username: {
		type: String,
		required: true,
		unique: true,
	},
	username_case: {
		type: String,
		required: true,
		unique: true,
	},
	email: {
		type: String,
		required: true,
		unique: true,
	},
	password: {
		type: String,
		required: true,
	},
});

const sessionSchema = new Schema({
	cookie: {
		type: String,
		required: true,
		unique: true
	},
	username: {
		type: String,
		required: true
	},
	expireAt: {

        type: Date,
        expires: 604800, // stay logged in for seven days

    },
});

export const UserModel = mongoose.model('User', userSchema);
export const SessionModel = mongoose.model('Session', sessionSchema);