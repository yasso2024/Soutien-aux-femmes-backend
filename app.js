const express = require('express');
const userRouter = require('./routes/user.route');
const authRouter = require('./routes/auth.route');
const fileRouter = require('./routes/file.route');
const demandeRoutes = require("./routes/demande.routes");
const  donRouter =require("./routes/don.route")
const logRouter = require("./routes/log.route");
const evenementRouter = require("./routes/evenement.routes");
const adminRouter = require("./routes/admin.route");
const actionSolidaireRouter = require("./routes/actionSolidaire.route");
const propositionAideRouter = require("./routes/propositionAide.route");
const affectationRouter = require("./routes/affectation.route");
const notificationRouter = require("./routes/notification.route");
const chatbotRouter = require("./routes/chatbot.route");
const profilBenevoleRouter = require("./routes/profilBenevole.route");
const cors = require('cors');
const path = require('path');
const { scheduleAutoExpire } = require('./jobs/autoExpire');


const app = express();
app.use(cors());

app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/user', userRouter);
app.use('/auth', authRouter);
app.use('/file', fileRouter);
app.use('/logs', logRouter);
app.use("/demandes", demandeRoutes);
app.use('/dons', donRouter);
app.use('/evenements', evenementRouter);
app.use("/admin", adminRouter);

app.use('/actions-solidaires', actionSolidaireRouter);
app.use('/propositions-aide', propositionAideRouter);
app.use('/affectations', affectationRouter);
app.use("/chatbot", chatbotRouter);
app.use('/notifications', notificationRouter);
app.use('/profils-benevoles', profilBenevoleRouter);

// Démarrer le job d'expiration automatique (7 jours → REFUSEE/REFUSE)
scheduleAutoExpire();

module.exports = app;