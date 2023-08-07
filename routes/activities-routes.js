const express = require('express');
const { check } = require('express-validator')

const activitiesController = require('../controllers/activities-controller');
const fileUpload = require('../middleware/file-upload');
const checkAuth = require('../middleware/check-auth')

const router = express.Router();

router.get('/:aid', activitiesController.getActivityById);

router.get('/user/:uid', activitiesController.getActivitiesByUserId);

router.use(checkAuth);

router.post('/', 
fileUpload.single('image'),
[
    check('title').not().isEmpty(),
    check('description').isLength({min:5}),
    check('address').not().isEmpty(),
],  activitiesController.createActivity);

router.patch('/:aid', [
    check('title').not().isEmpty(),
    check('description').isLength({min:5}),
], activitiesController.updateActivity);

router.delete('/:aid', activitiesController.deleteActivity);

module.exports = router;