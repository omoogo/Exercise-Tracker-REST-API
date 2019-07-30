const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const shortid = require('shortid');
const cors = require('cors')

const mongoose = require('mongoose')

const User = require('./models/userModel');
const Exercise = require('./models/exerciseModel');
const moment = require('moment');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/is-mongoose-ok', function(req, res) {
  if (mongoose) {
    res.json({isMongooseOk: !!mongoose.connection.readyState})
  } else {
    res.json({isMongooseOk: false})
  }
});

/*** Create new user ***/
app.post("/api/exercise/new-user", function(req, res, next) {
  // check if user name already exists. If so then return "username already taken"
  User.find({username: req.body.username}, function(err, users) {
    if (users.length > 0) {
      return res.send('username already taken');
    }
    
    let newUser = new User({_id: shortid.generate(), username: req.body.username});
      newUser.save(function(err, user) {
        if (err) { return next(err) }
        res.json(user);
    });
  });
});

/*** Get all users ***/
app.get("/api/exercise/users", function(req, res, next) {
  User.find({}, function(err, users) {
    if (err) { return next(err) }
    res.json(users);
  });
});

/*** Add exercise ***/
app.post("/api/exercise/add", function(req, res, next) {
  User.findOne({ _id: req.body.userId }).lean().then(result => {
    if (result) {
       // user exists...
      let exerciseDate;

      if (!req.body.date) {
        exerciseDate = new Date();
      } else {
        exerciseDate = req.body.date;
      }

      let newExercise = new Exercise({
        _id: shortid.generate(),
        userId: req.body.userId,
        description: req.body.description,
        duration: req.body.duration,
        date: exerciseDate
      });

      newExercise.save(function(err, exercise) {
        if (err) { return next(err) }
        const returnExercise = {};
        
        returnExercise.username = result.username;
        returnExercise.description = exercise.description;
        returnExercise.duration = exercise.duration;
        returnExercise._id = exercise._id;
        
        const exerciseDayWrapper = moment(exercise.date);
        
        returnExercise.date = exerciseDayWrapper.format('ddd MMM D YYYY');
        
        res.json(returnExercise);
      });
    } else {
      res.send('unknown _id')
    }
  });

});

/*** Get log of exercises ***/
app.get("/api/exercise/log", function(req,res ) {
  const query = {};
  
  if (req.query.userId) {
    query.userId = req.query.userId;
    
    if (req.query.from || req.query.to) {
      query.date = {};
    }
    
    if (req.query.from) {
      query.date.$gte = req.query.from;
    }
    
    if (req.query.to) {
      query.date.$lte = req.query.to;
    }
    
    User.findOne({ _id: req.query.userId }).lean().then(user => {
      let exerciseQuery;
      
      if (req.query.limit) {
        const queryLimit = Number(req.query.limit);
        exerciseQuery = Exercise.find(query).limit(queryLimit);
      } else {
        exerciseQuery = Exercise.find(query);
      }
      
      exerciseQuery.exec(function(err, exercises) {
        if (err) {
          return res.send(err);
        }  
                
        const userExercises = {};
        
        userExercises._id = user._id;
        userExercises.username = user.username;
        userExercises.count = exercises.length;
        userExercises.log = [];
        
        exercises.forEach((exercise) => {
          let simpleExercise = {};
          
          simpleExercise.description = exercise.description;
          simpleExercise.duration = exercise.duration;
          
          const exerciseDayWrapper = moment(exercise.date);
          simpleExercise.date = exerciseDayWrapper.format('ddd MMM D YYYY');
          
          userExercises.log.push(simpleExercise);
        });
              
        return res.json(userExercises);
      });
    });
  } else {
    return res.send('unknown userId');
  }
});

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
