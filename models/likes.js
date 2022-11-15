const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const Like = new Schema({
    id: ObjectId,
    user: { type: ObjectId, ref: 'User' },
});

const LikeModel = mongoose.model('Like', Like);
module.exports = {
    Like,
    LikeModel
};
