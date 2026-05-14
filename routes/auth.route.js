const express = require('express');
const {signUp, login, getMe, changePassword, forgotPassword, resetPassword} = require('../controllers/auth.controller');
const {protect}=require('../middlewares/auth.middleware');

const router = express.Router();
// http://localhost:3000/auth/signup
router.post('/signup', signUp);
// post :http://localhost:3000/auth/login 
router.post('/login', login);
router.get('/me', protect,getMe);

router.put('/change-password',protect,changePassword);

router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);

module.exports = router;