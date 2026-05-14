const ProfilBenevole = require('../models/profilBenevole.model');
const { upsertProfilBenevoleSchema } = require('../schemas/profilBenevole.schema');
const { notifyUser } = require('../utils/notify');

// ─── Bénévole: get own profile ────────────────────────────────────────────────
async function getMyProfil(req, res) {
  try {
    const profil = await ProfilBenevole.findOne({ benevole: req.user._id })
      .populate('benevole', 'firstName lastName email avatar region telephone');
    return res.json({ status: true, profil: profil || null });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
}

// ─── Bénévole: create or update own profile ───────────────────────────────────
async function upsertMyProfil(req, res) {
  try {
    if (req.user.role !== 'BENEVOLE') {
      return res.status(403).json({ status: false, message: 'Réservé aux bénévoles' });
    }

    const validation = upsertProfilBenevoleSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.flatten() });
    }

    const profil = await ProfilBenevole.findOneAndUpdate(
      { benevole: req.user._id },
      { ...validation.data, benevole: req.user._id },
      { new: true, upsert: true, runValidators: true }
    ).populate('benevole', 'firstName lastName email avatar region telephone');

    return res.json({ status: true, profil });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
}

// ─── Association / Admin: list all profiles ───────────────────────────────────
async function listProfils(req, res) {
  try {
    const { service, search } = req.query;
    const filter = {};
    if (service) filter.services = service;

    let profils = await ProfilBenevole.find(filter)
      .populate('benevole', 'firstName lastName email avatar region telephone');

    if (search) {
      const q = search.toLowerCase();
      profils = profils.filter((p) => {
        const name = `${p.benevole?.firstName || ''} ${p.benevole?.lastName || ''}`.toLowerCase();
        const tags = (p.competences || []).join(' ').toLowerCase();
        const bio = (p.bio || '').toLowerCase();
        return name.includes(q) || tags.includes(q) || bio.includes(q);
      });
    }

    return res.json({ status: true, profils });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
}

// ─── Association / Admin: get one profile by benevole user id ─────────────────
async function getProfilById(req, res) {
  try {
    const profil = await ProfilBenevole.findOne({ benevole: req.params.benevoleId })
      .populate('benevole', 'firstName lastName email avatar region telephone');
    if (!profil) {
      return res.status(404).json({ status: false, message: 'Profil introuvable' });
    }
    return res.json({ status: true, profil });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
}

module.exports = { getMyProfil, upsertMyProfil, listProfils, getProfilById };
