const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Joi = require("joi");

const UserSchema = new mongoose.Schema(
	{
		firstName: { type: String, required: true },
		lastName: { type: String, required: true },
		email: { type: String, required: true },
		password: { type: String, required: true },
		isConfirmed: { type: Boolean, required: true, default: 0 },
		confirmOTP: { type: String, required: false },
		otpTries: { type: Number, required: false, default: 0 },
		lastLogin: { type: Date, required: false },
		loginCount: { type: Number, required: false, default: 0 },
		status: { type: Boolean, required: true, default: 1 }
	},
	{ timestamps: true }
);

// Virtual for user's full name
UserSchema.virtual("fullName").get(function() {
	return this.firstName + " " + this.lastName;
});

UserSchema.methods.generateAuthToken = function() {
	const token = jwt.sign(
		{ _id: this._id, email: this.email },
		process.env.JWT_SECRET
	);
	return token;
};

const UserModel = mongoose.model("User", UserSchema);

function validateCreateUser(user) {
	const schema = {
		firstName: Joi.string().required(),
		lastName: Joi.string().required(),
		email: Joi.string()
			.required()
			.email(),
		password: Joi.string()
			.required()
			.min(6)
	};
	return Joi.validate(user, schema);
}

function validateLogin(user) {
	const schema = {
		email: Joi.string()
			.min(6)
			.required()
			.email(),
		password: Joi.string()
			.min(6)
			.required()
	};

	return Joi.validate(user, schema);
}

function validateOTP(data) {
	const schema = {
		email: Joi.string()
			.min(1)
			.required()
			.email()
			.trim(),
		otp: Joi.string()
			.min(1)
			.trim()
			.required()
	};

	return Joi.validate(data, schema);
}

function validateResendOTP(data) {
	const schema = {
		email: Joi.string()
			.min(1)
			.required()
			.email()
			.trim()
	};

	return Joi.validate(data, schema);
}

exports.UserModel = UserModel;
exports.UserSchema = UserSchema;
exports.validateCreateUser = validateCreateUser;
exports.validateLogin = validateLogin;
exports.validateOTP = validateOTP;
exports.validateResendOTP = validateResendOTP;
