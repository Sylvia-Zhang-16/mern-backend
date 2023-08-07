const bodyParser = require('body-parser');
const express = require('express');
const mongoose = require('mongoose');
const fs  = require('fs');
const path = require('path');

const activitiesRoutes = require('./routes/activities-routes');
const usersRoutes = require('./routes/users-routes')
const HttpError = require('./models/http-error')
const cors = require("cors");

const app = express();

app.use(cors({
    origin: '*'
}));

app.use(bodyParser.json());

// app.use((req, res, next) => {
//     res.header({
//         'Access-Control-Allow-Origin': '*',
//         'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
//         'Access-Control-Allow-Methods': 'GET, POST, DELETE, PATCH'
//     });
//     next();
// });

app.use('/uploads/images', express.static(path.join('uploads', 'images')));

app.use('/api/activities',activitiesRoutes);
app.use('/api/users', usersRoutes);

app.use((req, res, next) => {
    const error = new HttpError('Could not find this route.', 404);
    throw error;
});

app.use((error, req, res, next) => {
    if (req.file) {
        fs.unlink(req.file.path, (err) => {
            console.log(err);
        });
    };
    if (res.headerSent) {
        return next(error);
    };
    res.status(error.code || 500);
    res.json({message: error.message || 'An unknown error occurred!'})
});

mongoose
.connect(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.lj7s4jq.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`)
.then(() => {
    app.listen(5000);
})
.catch(err => {
    console.log(err);
});
