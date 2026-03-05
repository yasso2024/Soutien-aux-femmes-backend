const express = require('express');
const userRouter = require('./routes/user.route');
const authRouter = require('./routes/auth.route');
const fileRouter = require('./routes/file.route');

const logRouter = require("./routes/log.route");

const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/user', userRouter);
app.use('/auth', authRouter);
app.use('/file', fileRouter);
app.use('/logs', logRouter);

module.exports = app;