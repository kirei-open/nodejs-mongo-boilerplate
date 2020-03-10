const jwt = require("jsonwebtoken");
const apiResponse = require("../helpers/apiResponse");

module.exports = function(req, res, next) {
	const token = req.header("x-auth-token");
	if (!token)
		return apiResponse.unauthorizedResponse(
			res,
			"Access denied. No token provided."
		);

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		req.user = decoded;
		next();
	} catch (ex) {
		apiResponse.validationErrorWithData(res, "Invalid token.", {});
	}
};
