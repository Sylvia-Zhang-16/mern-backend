const { validationResult } = require('express-validator')
const { v4:uuid } = require('uuid');
const mongoose = require('mongoose');
const fs = require('fs');

const HttpError = require('../models/http-error');
const getCoordsForAddress = require('../util/location');
const Activity = require('../models/activity');
const User = require('../models/user');


const getActivityById = async (req, res, next) => {
    const activityId = req.params.aid;
    
    let activity;
    try{   
        activity = await Activity.findById(activityId);
    }catch (error){
        return next(new HttpError('Something went wrong, could not find activity.'))
    }

    if (!activity) {
        return next( new HttpError('Could not find an activity for the provided id!', 404));}
    
    res.json({activity: activity.toObject({ getters:true })});
    
};

const getActivitiesByUserId =  async (req, res, next) => {
    const userId = req.params.uid;

    let userWithActivities;
    try{   
        userWithActivities = await User.findById(userId).populate('activities');
    }catch (err){
        return next(new HttpError('Fetching activities failed, please try again later.', 500));
    }

    if (!userWithActivities || userWithActivities.activities.length === 0) {
        return next(new HttpError('Could not find an activity for the provided id!', 404));
    }
    
    res.json({activities: userWithActivities.activities.map(a => a.toObject({ getters:true }))});

};

const createActivity = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(
        new HttpError('Invalid inputs passed, please check your data.', 422)
      );
    };
  
    const { title, description, address } = req.body;
  
    let coordinates;
    try {
      coordinates = await getCoordsForAddress(address);
    } catch (error) {
      return next(error);
    }
  
    // const title = req.body.title;
    const createdActivity = new Activity({
      title,
      description,
      address,
      location: coordinates,
      image:req.file.path,
      creator: req.userData.userId
    });


    let user;
    try{
        user = await User.findById(req.userData.userId);
    }catch (err) {
        return next(new HttpError('Creating activity failed, please try again', 500))
    };

    if(!user) {
        return next(new HttpError('Could not find user for provided id.', 404))
    }

    console.log(user);

    try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await createdActivity.save({ session: sess });
        user.activities.push(createdActivity);//only id
        await user.save({ session: sess });
        await sess.commitTransaction();
    }
    catch (err) {
        return new HttpError('Creating activity failed, please try again.', 500)
};
  
    res.status(201).json({ activity: createdActivity});
  };


const updateActivity = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.json(errors);
        throw new HttpError('Invalid inputs passed, please check your data.', 422)
    }

    const { title, description } = req.body;
    const activityId = req.params.aid;

    let activity;
    try{   
        activity = await Activity.findById(activityId);
    }catch (error){
        return next(new HttpError('Something went wrong, could not UPDATE activity.', 500))
    }

    if (!activity) {
        return next( new HttpError('Could not find an activity for the provided id!', 404));}

    if (activity.creator.toString() !== req.userData.userId) {
            return next(new HttpError('You are not allowed to update this activity.', 401))
    }
    
    activity.title = title;
    activity.description = description; 

    try{
        await activity.save();
    }catch (err) {
        return next(new HttpError('Something went wrong, could not update activity.', 500))
    };

    res.status(200).json({activity: activity.toObject({ getters: true})});

};

const deleteActivity = async (req, res, next) => {
    const activityId = req.params.aid;

    let activity;
    try{   
        activity = await Activity.findById(activityId).populate('creator');
    }catch (err){
        return next(new HttpError('Something went wrong, could not find activity.', 500))
    }

    if (!activity) {
        const error = new HttpError('Could not find activity for this id.', 404);
        return next(error);
    };

    
    if (activity.creator.id !== req.userData.userId) {
        const error = new HttpError('You are not allowed to delete this activity.', 401);
        return next(error);
    };

    const imagePath = activity.image;

    try{
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await activity.deleteOne({ session: sess });
        activity.creator.activities.pull(activity);
        await activity.creator.save({ session: sess });
        await sess.commitTransaction();
    }catch(err){
        return next(new HttpError('Something went wrong, could not delete activity.', 500))
    };

    fs.unlink(imagePath, err => {
        console.log(err)
    })

    res.status(200).json({message:'Deleted activity.'})
};


exports.getActivityById = getActivityById;
exports.getActivitiesByUserId = getActivitiesByUserId;
exports.createActivity = createActivity;
exports.deleteActivity = deleteActivity;
exports.updateActivity = updateActivity;