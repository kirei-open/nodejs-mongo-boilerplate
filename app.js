var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

var indexRouter = require("./routes/index");
var apiRouter = require("./routes/api");
var apiResponse = require("./helpers/apiResponse");
var cors = require("cors");

require("dotenv").config();
// DB connection
var MONGODB_URL = process.env.MONGODB_URL;
var mongoose = require("mongoose");
mongoose
	.connect(MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true })
	.then(() => {
		//don't show the log when it is test
		if (process.env.NODE_ENV !== "test") {
			console.log("Connected to %s", MONGODB_URL);
			console.log("App is running ... \n");
			console.log("Press CTRL + C to stop the process. \n");
		}
	})
	.catch(err => {
		console.error("App starting error:", err.message);
		process.exit(1);
	});

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

if (process.env.NODE_ENV !== "test") {
	app.use(logger("dev"));
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use(cors());

app.use("/", indexRouter);
app.use("/api", apiRouter);

// throw 404 if URL not found
app.all("*", function(req, res) {
	return apiResponse.notFoundResponse(res, "Page not found");
});

// error handler
app.use(function(err, req, res) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get("env") === "development" ? err : {};

	// render the error page
	res.status(err.status || 500);
	res.render("error");
});

module.exports = app;
