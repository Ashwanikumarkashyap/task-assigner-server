var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');


// external modules
const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var passport = require('passport');

var config = require('./config');
var authenticate = require('./authenticate');

//routes
var index = require('./routes/index');
var users = require('./routes/users');
var todoRouter = require('./routes/todoRouter');
const uploadRouter = require('./routes/uploadRouter');

var app = express();

app.use(passport.initialize());
app.use(passport.session());

// Connection URL
const url = config.mongoUrl;

const connect = mongoose.connect(url, {
  useMongoClient: true,
  /* other options */
});

connect.then((db) => {
    console.log("connected correctly to awsm db-server!");
}, (err) => { console.log(err); });

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use('/todos', todoRouter);
app.use('/users', users);
app.use('/imageUpload', uploadRouter);
app.use('/', index);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
