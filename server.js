const app = require('./app');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dns = require('dns');

dotenv.config();

// Force Node.js to use public DNS servers so MongoDB Atlas SRV records resolve correctly
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI).then(() => {
    console.log('DB Connected ✅✅');
    app.listen(3000, () => {
        console.log('Server is running on port http://localhost:3000');
    })
}).catch((error) => {
    console.log("DB did not connect ❌❌");
    console.log(error.message);
})


