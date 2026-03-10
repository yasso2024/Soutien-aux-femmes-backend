const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

const {
    deposerDemande,
    listerDemandes,
    obtenirDemande,
    mesDemandes,
    validerDemande,
    supprimerDemande,
    statistiquesDemandes
} = require('../controllers/demandeAide.controller');

router.get('/',               protect, listerDemandes);
router.post('/',              protect, upload.array('documents'), deposerDemande);
router.get('/mes-demandes',   protect, mesDemandes);
router.get('/statistiques',   protect, statistiquesDemandes);
router.get('/:id',            protect, obtenirDemande);
router.patch('/:id/statut',   protect, validerDemande);
router.delete('/:id',         protect, supprimerDemande);

module.exports = router;
