const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const { mesNotifications, marquerLue, marquerToutesLues } = require('../controllers/notification.controller');

router.get('/',              protect, mesNotifications);
router.patch('/toutes-lues', protect, marquerToutesLues);
router.patch('/:id/lue',     protect, marquerLue);

module.exports = router;
