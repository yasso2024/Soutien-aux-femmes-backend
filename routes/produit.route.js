const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const multer = require('multer');
const path = require('path');
const {
    listerProduits,
    obtenirProduit,
    creerProduit,
    modifierProduit,
    supprimerProduit,
    mesProduits
} = require('../controllers/produit.controller');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

router.get('/',           protect, listerProduits);
router.post('/',          protect, upload.single('image'), creerProduit);
router.get('/mes-produits', protect, mesProduits);
router.get('/:id',        protect, obtenirProduit);
router.put('/:id',        protect, upload.single('image'), modifierProduit);
router.delete('/:id',     protect, supprimerProduit);

module.exports = router;
