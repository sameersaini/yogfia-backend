const mongoose = require('mongoose');
const autoIncrement = require('mongoose-auto-increment');
const bcrypt = require('bcrypt');
const getEnvData = require("../env");
const SALT_WORK_FACTOR = 10;
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const envData = getEnvData(process.env.ENV);
const connection = mongoose.createConnection(envData.mongo.url)
autoIncrement.initialize(connection);

const ResetPasswordSchema = new Schema({
    emailSent: { type: Boolean, default: false },
    secretCode: { type: String },
    codeValidTill: { type: Date }
})

const UserSchema = new Schema({
    id: ObjectId,
    username: { type: String, required: true, index: { unique: true } },
    phoneNo: { type: String, required: true },
    gender: { type: String},
    age: { type: Number},
    country: { type: String},
    password: { type: String, required: true },
    name: { type: String, required: true },
    emailVerified: { type: Boolean, default: false },
    resetPassword: { type: ResetPasswordSchema },

}, {
    timestamps: { createdAt: true, updatedAt: false }
});

UserSchema.plugin(autoIncrement.plugin, {
    model: 'User',
    field: 'userId',
    startAt: 100000000,
    incrementBy: 1
});

UserSchema.pre('save', function(next) {
    const user = this;
    // only hash the password if it has been modified (or is new)
    if (!user.isModified('password')) return next();

    // generate a salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
        if (err) return next(err);

        // hash the password along with our new salt
        bcrypt.hash(user.password, salt, function (err, hash) {
            if (err) return next(err);

            // override the cleartext password with the hashed one
            user.password = hash;
            next();
        });
    })
});

UserSchema.methods.comparePassword = function(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};

const UserModel = mongoose.model('User', UserSchema);
module.exports = UserModel;
