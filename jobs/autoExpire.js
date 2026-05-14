/**
 * autoExpire.js — Cron job quotidien
 *
 * Tout élément resté en statut PENDING (EN_ATTENTE / PROPOSEE) plus de 7 jours
 * est automatiquement refusé.
 * Les statuts finaux (VALIDEE, CONFIRME, ACCEPTEE, TERMINEE, REFUSEE, REFUSE)
 * ne sont jamais touchés.
 *
 * Planning : tous les jours à minuit  →  '0 0 * * *'
 */

const cron = require('node-cron');
const Demande = require('../models/demande.model');
const Don = require('../models/don.model');
const Affectation = require('../models/affectation.model');
const ActionSolidaire = require('../models/actionSolidaire.model');
const PropositionAide = require('../models/propositionAide.model');

/* ─── helpers ─────────────────────────────────────────────────── */

/** Date limite : aujourd'hui - 7 jours */
function cutoffDate() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 7);
  return d;
}

async function expireCollection({ Model, dateField, pendingStatuses, refusedStatus, label }) {
  const cutoff = cutoffDate();
  const result = await Model.updateMany(
    {
      statut: { $in: pendingStatuses },
      [dateField]: { $lt: cutoff },
    },
    { $set: { statut: refusedStatus } }
  );
  if (result.modifiedCount > 0) {
    console.log(`[autoExpire] ${label} : ${result.modifiedCount} enregistrement(s) → ${refusedStatus}`);
  }
  return result.modifiedCount;
}

/* ─── job principal ────────────────────────────────────────────── */

async function runAutoExpire() {
  console.log('[autoExpire] Démarrage de la vérification des éléments expirés…');

  try {
    const counts = await Promise.all([
      expireCollection({
        Model: Demande,
        dateField: 'dateCreation',
        pendingStatuses: ['EN_ATTENTE'],
        refusedStatus: 'REFUSEE',
        label: 'Demandes',
      }),
      expireCollection({
        Model: Don,
        dateField: 'dateDon',
        pendingStatuses: ['EN_ATTENTE'],
        refusedStatus: 'REFUSE',
        label: 'Dons',
      }),
      expireCollection({
        Model: Affectation,
        dateField: 'dateAffectation',
        pendingStatuses: ['EN_ATTENTE'],
        refusedStatus: 'REFUSEE',
        label: 'Affectations',
      }),
      expireCollection({
        Model: ActionSolidaire,
        dateField: 'dateAction',
        pendingStatuses: ['EN_ATTENTE'],
        refusedStatus: 'REFUSEE',
        label: 'Actions solidaires',
      }),
      expireCollection({
        Model: PropositionAide,
        dateField: 'dateProposition',
        pendingStatuses: ['PROPOSEE'],
        refusedStatus: 'REFUSEE',
        label: 'Propositions d\'aide',
      }),
    ]);

    const total = counts.reduce((s, n) => s + n, 0);
    console.log(`[autoExpire] Terminé — ${total} élément(s) refusé(s) au total.`);
  } catch (err) {
    console.error('[autoExpire] Erreur lors de la vérification :', err);
  }
}

/* ─── enregistrement du cron ───────────────────────────────────── */

function scheduleAutoExpire() {
  // Exécution immédiate au démarrage du serveur pour traiter le backlog existant
  runAutoExpire();

  // Puis tous les jours à minuit
  cron.schedule('0 0 * * *', runAutoExpire, {
    timezone: 'Africa/Tunis',
  });

  console.log('[autoExpire] Cron planifié — tous les jours à minuit (Africa/Tunis).');
}

module.exports = { scheduleAutoExpire, runAutoExpire };
