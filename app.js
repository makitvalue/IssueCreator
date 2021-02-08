var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var MySQLStore = require('express-mysql-session')(session);
var dotenv = require('dotenv');
dotenv.config();

var indexRouter = require('./routes/index');
var apiRouter = require('./routes/api');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json({
	limit: '10mb'
}));
app.use(express.urlencoded({
	extended: false,
	limit: '10mb'
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.MYSQL_SECRET,
    resave: false,
    saveUninitialized: true,
    store: new MySQLStore({
        host: process.env.MYSQL_HOST,
        port: process.env.MYSQL_PORT,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWD,
        database: process.env.MYSQL_DATABASE
    })
}));

app.use('/', indexRouter);
app.use('/api', apiRouter);

//robots.txt 설정
app.get('/robots.txt', (req, res) => {
    res.status(200).sendFile(__dirname + '/robots.txt');
});

//애드센스 ads.txt
app.get('/ads.txt', (req, res) => {
    res.status(200).sendFile(__dirname + '/ads.txt');
});

//소유권인증
// app.get('/google1ab6e35cae7207bd.html', (req, res) => {
//     res.status(200).sendFile(__dirname + '/google1ab6e35cae7207bd.html');
// })

//sitemap
app.get('/sitemap.xml', (req, res) => {
    res.status(200).sendFile(__dirname + '/sitemap.xml');
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
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
