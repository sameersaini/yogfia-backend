const mongoose = require('mongoose');
const { Like } = require('./likes');

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const Comment = new Schema({
    id: ObjectId,
    text: String,
    user: { type: ObjectId, ref: 'User' },
    likes: { type: [Like], default: [] },
}, {
    timestamps: { createdAt: true, updatedAt: false }
});

Comment.index( { postId: 1, postType: -1 });
const CommentModel = mongoose.model('Comment', Comment);
module.exports = {
    Comment,
    CommentModel
};
