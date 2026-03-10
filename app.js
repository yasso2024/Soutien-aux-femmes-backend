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


app.use('/demandes',      require('./routes/demandeAide.route'));
app.use('/propositions',  require('./routes/propositionAide.route'));
app.use('/dons',          require('./routes/don.route'));
app.use('/actions',       require('./routes/actionSolidaire.route'));
app.use('/notifications', require('./routes/notification.route'));
app.use('/messages',      require('./routes/message.route'));
app.use('/evenements',    require('./routes/evenement.route'));
app.use('/produits',      require('./routes/produit.route'));
app.use('/commandes',     require('./routes/commande.route'));
app.use('/professionnels', require('./routes/professionnel.route'));

module.exports = app;