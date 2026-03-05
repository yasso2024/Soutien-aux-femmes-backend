const express = require('express');
const { createUser, putUser, getUser, deleteUser, listUsers } = require('../controllers/user.controller')
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/create', protect, createUser);
router.put('/update/:id', protect, putUser);
router.get('/:id', protect, getUser);
router.get('/', protect, listUsers);
router.delete('/:id', protect, deleteUser);

module.exports = router;