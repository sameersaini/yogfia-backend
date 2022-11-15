const mongoose = require('mongoose');
const { Comment } = require('./comments');
const { Like } = require('./likes');

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const Artifacts = new Schema({
    id: ObjectId,
    artifactId: { type: Number, index: true },
    artifactType: String,
    comments: { type: [Comment], default: []},
    likes: { type: [Like], default: [] },
}, {
    timestamps: { createdAt: true, updatedAt: false }
});

Artifacts.index( { artifactId: 1, artifactType: -1 });
const ArtifactsModel = mongoose.model('Artifact', Artifacts);
module.exports = ArtifactsModel;
