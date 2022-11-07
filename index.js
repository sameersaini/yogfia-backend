const express = require('express')
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const UserModel = require('./models/User');
const OrderModel = require('./models/Order');
const passport = require('passport');
const bcrypt = require('bcrypt');
const LocalStrategy = require('passport-local');
const jwt = require('jsonwebtoken');
const app = express()
const cors = require('cors')
const getEnvData = require("./env");
const {sendSignUpEmail, sendResetPasswordEmail} = require("./email");
const port = 3001

const envData = getEnvData(process.env.ENV);

// Connection URI
const uri = envData.mongo.url;
mongoose.connect(uri).then(() => {
    console.log('mongo connected -> ' + uri);
    app.listen(port, function () {
        console.log('express server started');
    })
});
app.use(express.json())
app.use(cors({
    exposedHeaders: ["set-cookie"],
    credentials: true,
    origin: ["http://localhost:3000"],
}))
app.use(require('cookie-parser')());
app.use(require('express-session')({ secret: 'keyboard cat', resave: true, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy( function(username, password, cb) {
    UserModel.findOne({username}, function(err, user) {
        if (err) { return cb(err); }
        if (!user) { return cb(null, false, { message: 'Incorrect email or password.' }); }

        bcrypt.compare(password, user.password, function(err, result) {
            if (err) { return cb(err); }
            if (!result) {
                return cb(null, false, { message: 'Incorrect username or password.' });
            }
            return cb(null, user);
        });
    });
}));

passport.serializeUser(function(user, done) {
    done(null, {
        username: user.username,
        name: user.name,
    });
});

passport.deserializeUser(function(userObj, done) {
    UserModel.findOne({ username: userObj.username }, function (err, user) {
        done(null, user)
    });
});

app.get('/', async (req, res) => {
    res.json("success");
});


app.post('/user/signup', async (req, res) => {
    const { username, password, name, phoneNo } = req.body;
    const user = new UserModel({ username, password, name, phoneNo })

    try {
        const savedUser = await user.save();
        sendSignUpEmail(savedUser.username, savedUser.name);
        res.json({
            username: savedUser.username,
            name: savedUser.name,
            phoneNo: savedUser.phoneNo,
        });
    } catch (e) {
        res.status(400).json({
            code: 'DUPLICATE_EMAIL',
            raw_message: e.message,
            message: 'Email already exists'
        })
    }
});

app.post('/user/signin', function(req, res,next) {
    passport.authenticate('local', function(err, user, info) {
        if (err) { return next(err); }
        if (!user) { return res.status(401).send(info); }
        // NEED TO CALL req.login()!!!
        req.login(user, next);
        const token = jwt.sign(
            {
                username: user.username,
                name: user.name,
                phoneNo: user.phoneNo
            },
            'yogfiatripfia',
            {
                expiresIn: '7 days'
            }
        );
        res.cookie('token', token)
        res.send({
            login: true,
            name: user.name,
            email: user.username,
            phoneNo: user.phoneNo,
            gender: user.gender,
            country: user.country,
            age: user.age,
            token,
        })
    })(req, res, next);
});

app.get('/user/info', function(req, res,next) {
    if(!req.cookies.token) {
        return res.status(401).send({ message: 'access token is missing in the request' })
    }
    try {
        const token = jwt.verify(req.cookies.token, 'yogfiatripfia');

        UserModel.findOne({username: token.username }, function(err, user) {
            if (err || !user) { return res.status(401).send({ message: 'user does not exist' }) }
            const newToken = jwt.sign(
                {
                    username: user.username,
                    name: user.name,
                    phoneNo: user.phoneNo,
                },
                'yogfiatripfia',
                {
                    expiresIn: '7 days'
                }
            );
            res.cookie('token', newToken)
            res.send({
                login: true,
                name: user.name,
                email: user.username,
                phoneNo: user.phoneNo,
                gender: user.gender,
                country: user.country,
                age: user.age,
                newToken,
            })
        });
    } catch (e) {
        res.status(401).send({ message: 'access token has expired' })
    }
});

app.post('/user/reset-password', async function(req, res,next) {
    try {
        const secretCode = Math.floor(100000 + Math.random() * 900000).toString()
        const date = new Date()
        const user = await UserModel
            .findOneAndUpdate({username: req.body.username}, {
                resetPassword: {
                    emailSent: true,
                    secretCode,
                    codeValidTill: date.setHours(date.getHours() + 24)
                }}, {safe: true, new: true});
        if(user) {
            sendResetPasswordEmail(user.get('username'), user.get('name'), secretCode)
            res.send({ message: 'Reset password email sent successfully.'})
        } else {
            res.status(400).send({ message: 'Reset password failed.'})
        }
    } catch (e) {
        res.status(401).send({ message: 'reset password failed' })
    }
});

app.post('/user/reset-user-password', async function(req, res,next) {
    try {
        const user = await UserModel
            .findOne({username: req.body.username});
        if(!user) {
            return res.status(400).send({ message: 'User does not exist.'})
        }
        const resetPassword = user.get('resetPassword');
        if(req.body.code !== resetPassword.secretCode) {
            return res.status(400).send({ message: 'Secret code is not correct'})
        }
        const currentDateTime = new Date()
        if(currentDateTime > resetPassword.codeValidTill) {
            return res.status(400).send({ message: 'Secret code has expired. Please request a new code'})
        }
        user.password = req.body.password;
        user.resetPassword = {
            emailSent: false,
            secretCode: null,
            codeValidTill: new Date()
        }
        const updatedUser = await user.save();
        res.send({message: 'New Password has been saved.'});
    } catch (e) {
        res.status(401).send({ message: 'reset password failed' })
    }
});

app.put('/user/update-profile', async function(req, res,next) {
    try {
        if(!req.cookies.token) {
            return res.status(401).send({ message: 'access token is missing in the request' })
        }
        const token = jwt.verify(req.cookies.token, 'yogfiatripfia');
        if (token.username !== req.body.email) {
            return res.status(400).send({ message: 'Bad request' })
        }
        const user = await UserModel.findOneAndUpdate({username: req.body.email }, {
            phoneNo: req.body.phoneNo,
            gender: req.body.gender,
            name: req.body.name,
            age: req.body.age,
            country: req.body.country,
        }, { new: true });
        res.json(user);
    } catch (e) {
        res.status(400).send({ message: 'User profile cannot be updated.', raw_message: e.message })
    }
})

app.put('/user/update-password', async function(req, res,next) {
    passport.authenticate('local',  function(err, user, info) {
        if (err) { return next(err); }
        if (!user) { return res.status(401).send(info); }

        user.password = req.body.newPassword;
        user.save().then((user) => {
            res.status(200).send()
        }).catch((e) => {
            res.status(400).send({ message: 'User Password cannot be updated.', raw_message: e.message })
        });
    })(req, res, next);
})

// razor pay

app.post('/payment/create-subscription', async function(req, res,next) {
    try {
        if(!req.cookies.token) {
            return res.status(401).send({ message: 'access token is missing in the request' })
        }
        const token = jwt.verify(req.cookies.token, 'yogfiatripfia');

        const instance = new Razorpay({ key_id: envData.razorPayTest.key, key_secret: envData.razorPayTest.secret })
        const subscriptionRes = await instance.subscriptions.create({
            plan_id: req.body.planId,
            total_count: 52,
            quantity: 1,
            customer_notify: 0,
            notify_info: {
                notify_phone: token.phoneNo,
                notify_email: token.email,
            }
        })

        res.json(subscriptionRes)
    } catch (e) {
        res.status(400).send({ message: 'create subscription failed' })
    }
})

app.post('/payment/save-subscription-start', async function(req, res,next) {
    try {
        if(!req.cookies.token) {
            return res.status(401).send({ message: 'access token is missing in the request' })
        }
        const token = jwt.verify(req.cookies.token, 'yogfiatripfia');
        const user = await UserModel.findOne({username: token.username });
        if (!user) { return res.status(401).send({ message: 'user does not exist' }) }
        const { razorPayPaymentId, razorPaySubscriptionId, razorPaySignature } = req.body;
        const order = new OrderModel({ userId: user.userId, razorPayPaymentId, razorPaySubscriptionId, razorPaySignature })
        const savedOrder = await order.save();
        res.json(savedOrder);
    } catch (e) {
        res.status(400).send({ message: 'Subscription cannot be saved', raw_message: e.message })
    }
})

app.get('/payment/all-user-subscriptions', async function(req, res,next) {
    try {
        if(!req.cookies.token) {
            return res.status(401).send({ message: 'access token is missing in the request' })
        }
        const token = jwt.verify(req.cookies.token, 'yogfiatripfia');
        const user = await UserModel.findOne({username: token.username });
        if (!user) { return res.status(401).send({ message: 'user does not exist' }) }

        const orders = await OrderModel.find({ userId: user.userId });
        const instance = new Razorpay({ key_id: envData.razorPayTest.key, key_secret: envData.razorPayTest.secret })
        const subscriptionDetails = await Promise.all(orders.map(async (order) => {
            return instance.subscriptions.fetch(order.razorPaySubscriptionId)
        }))
        res.json(subscriptionDetails);
    } catch (e) {
        res.status(400).send({ message: 'Subscription cannot be fetched', raw_message: e.message })
    }
})

app.get('/payment/plan-details/:planId', async function(req, res,next) {
    try {
        if(!req.cookies.token) {
            return res.status(401).send({ message: 'access token is missing in the request' })
        }
        const token = jwt.verify(req.cookies.token, 'yogfiatripfia');
        const user = await UserModel.findOne({username: token.username });
        if (!user) { return res.status(401).send({ message: 'user does not exist' }) }

        const instance = new Razorpay({ key_id: envData.razorPayTest.key, key_secret: envData.razorPayTest.secret })
        const planDetails = await instance.plans.fetch(req.params.planId)
        res.json(planDetails);
    } catch (e) {
        res.status(400).send({ message: 'Plan cannot be fetched', raw_message: e.message })
    }
})

app.get('/payment/invoices/:subscriptionId', async function(req, res,next) {
    try {
        if(!req.cookies.token) {
            return res.status(401).send({ message: 'access token is missing in the request' })
        }
        const token = jwt.verify(req.cookies.token, 'yogfiatripfia');
        const user = await UserModel.findOne({username: token.username });
        if (!user) { return res.status(401).send({ message: 'user does not exist' }) }

        const instance = new Razorpay({ key_id: envData.razorPayTest.key, key_secret: envData.razorPayTest.secret })
        const invoices = await instance.invoices.all({
            subscription_id: req.params.subscriptionId,
        })
        res.json(invoices);
    } catch (e) {
        res.status(400).send({ message: 'Invoices cannot be fetched', raw_message: e.message })
    }
})

app.post('/payment/subscription/cancel/:subscriptionId', async function(req, res,next) {
    try {
        if(!req.cookies.token) {
            return res.status(401).send({ message: 'access token is missing in the request' })
        }
        const token = jwt.verify(req.cookies.token, 'yogfiatripfia');
        const user = await UserModel.findOne({username: token.username });
        if (!user) { return res.status(401).send({ message: 'user does not exist' }) }

        const instance = new Razorpay({ key_id: envData.razorPayTest.key, key_secret: envData.razorPayTest.secret })
        const subscription = await instance.subscriptions.cancel(req.params.subscriptionId, false)
        res.json(subscription);
    } catch (e) {
        res.status(400).send({ message: 'Subscription cannot be cancelled', raw_message: e.message })
    }
})
