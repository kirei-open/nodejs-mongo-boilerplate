const {
	UserModel,
	validateCreateUser,
	validateLogin,
	validateOTP,
	validateResendOTP
} = require("../models/UserModel");
const apiResponse = require("../helpers/apiResponse");
const utility = require("../helpers/utility");
const bcrypt = require("bcrypt");
const mailer = require("../helpers/mailer");
const { constants } = require("../helpers/constants");

/**
 * User registration.
 *
 * @param {string}      firstName
 * @param {string}      lastName
 * @param {string}      email
 * @param {string}      password
 *
 * @returns {Object}
 */
exports.register = [
	async (req, res) => {
		try {
			const { error } = validateCreateUser(req.body);
			if (error)
				return apiResponse.validationErrorWithData(
					res,
					"Validation Error.",
					error.details[0].message
				);
			let user = await UserModel.findOne({ email: req.body.email });
			if (user)
				return apiResponse.validationErrorWithData(res, "Error", {
					error: "User already registered."
				});
			bcrypt.hash(req.body.password, 10, function(err, hash) {
				// generate OTP for confirmation
				let otp = utility.randomNumber(4);
				// Create User object with escaped and trimmed data
				var user = new UserModel({
					firstName: req.body.firstName,
					lastName: req.body.lastName,
					department: req.body.department,
					phone: req.body.phone,
					email: req.body.email,
					password: hash,
					confirmOTP: otp
				});
				// Html email body
				let html = "<p>Please Confirm your Account.</p><p>OTP: " + otp + "</p>";
				// Send confirmation email
				mailer
					.send(
						constants.confirmEmails.from,
						req.body.email,
						"Confirm Account",
						html
					)
					.then(function() {
						// Save user.
						user.save(function(err) {
							if (err) {
								return apiResponse.ErrorResponse(res, err);
							}
							let userData = {
								_id: user._id,
								firstName: user.firstName,
								lastName: user.lastName,
								email: user.email,
								phone: user.phone
							};
							return apiResponse.successResponseWithData(
								res,
								"Registration Success.",
								userData
							);
						});
					})
					.catch(err => {
						console.log(err);
						return apiResponse.ErrorResponse(res, err);
					});
			});
		} catch (err) {
			//throw error in json response with status 500.
			return apiResponse.ErrorResponse(res, err);
		}
	}
];

/**
 * User login.
 *
 * @param {string}      email
 * @param {string}      password
 *
 * @returns {Object}
 */
exports.login = [
	async (req, res) => {
		try {
			const { error } = validateLogin(req.body);
			if (error) {
				return apiResponse.validationErrorWithData(
					res,
					"Validation Error.",
					error.details[0].message
				);
			}
			let user = await UserModel.findOne({ email: req.body.email });
			if (!user) {
				return apiResponse.unauthorizedResponse(
					res,
					"Invalid Email or password"
				);
			}
			//Compare given password with db's hash.
			const validPassword = await bcrypt.compare(
				req.body.password,
				user.password
			);
			if (!validPassword) {
				return apiResponse.validationErrorWithData(
					res,
					"Invalid Email or password",
					{ error: "Invalid Email or password" }
				);
			}
			//Check account confirmation.
			if (user.isConfirmed) {
				// Check User's account active or not.
				if (user.status) {
					const token = user.generateAuthToken();
					return apiResponse.successResponseWithData(res, "Login Success.", {
						token
					});
				} else {
					return apiResponse.unauthorizedResponse(
						res,
						"Account is not active. Please contact admin."
					);
				}
			} else {
				return apiResponse.unauthorizedResponse(
					res,
					"Account is not confirmed. Please confirm your account."
				);
			}
		} catch (err) {
			return apiResponse.ErrorResponse(res, err);
		}
	}
];

/**
 * Verify Confirm otp.
 *
 * @param {string}      email
 * @param {string}      otp
 *
 * @returns {Object}
 */
exports.verifyConfirm = [
	async (req, res) => {
		try {
			const { error } = validateOTP(req.body);
			if (error) {
				return apiResponse.validationErrorWithData(
					res,
					"Validation Error.",
					error.details[0].message
				);
			}
			let query = { email: req.body.email };
			let user = await UserModel.findOne(query);
			if (!user) {
				return apiResponse.validationErrorWithData(
					res,
					"Invalid Email or password",
					{ error: "Invalid Email or password" }
				);
			}
			//Check already confirm or not.
			if (!user.isConfirmed) {
				//Check account confirmation.
				if (user.confirmOTP == req.body.otp) {
					//Update user as confirmed
					UserModel.findOneAndUpdate(query, {
						isConfirmed: 1,
						confirmOTP: null
					}).catch(err => {
						return apiResponse.ErrorResponse(res, err);
					});
					return apiResponse.successResponse(res, "Account confirmed success.");
				} else {
					return apiResponse.unauthorizedResponse(res, "Otp does not match");
				}
			} else {
				return apiResponse.unauthorizedResponse(
					res,
					"Account already confirmed."
				);
			}
		} catch (err) {
			return apiResponse.ErrorResponse(res, err);
		}
	}
];

/**
 * Resend Confirm otp.
 *
 * @param {string}      email
 *
 * @returns {Object}
 */
exports.resendConfirmOtp = [
	async (req, res) => {
		try {
			const { error } = validateResendOTP(req.body);
			if (error) {
				return apiResponse.validationErrorWithData(
					res,
					"Validation Error.",
					error.details[0].message
				);
			}
			var query = { email: req.body.email };
			let user = await UserModel.findOne(query);
			if (!user) {
				return apiResponse.validationErrorWithData(
					res,
					"Invalid Email or password",
					{ error: "Invalid Email or password" }
				);
			}
			//Check already confirm or not.
			if (!user.isConfirmed) {
				// Generate otp
				let otp = utility.randomNumber(4);
				// Html email body
				let html = "<p>Please Confirm your Account.</p><p>OTP: " + otp + "</p>";
				// Send confirmation email
				await mailer.send(
					constants.confirmEmails.from,
					req.body.email,
					"Confirm Account",
					html
				);
				user.isConfirmed = 0;
				user.confirmOTP = otp;
				// Save user.
				await user.save(function(err) {
					if (err) {
						return apiResponse.ErrorResponse(res, err);
					}
					return apiResponse.successResponse(res, "Confirm otp sent.");
				});
			} else {
				return apiResponse.unauthorizedResponse(
					res,
					"Account already confirmed."
				);
			}
		} catch (err) {
			return apiResponse.ErrorResponse(res, err);
		}
	}
];
