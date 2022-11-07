const mongoose = require('mongoose');
const autoIncrement = require('mongoose-auto-increment');
const getEnvData = require("../env");
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const envData = getEnvData(process.env.ENV);
const connection = mongoose.createConnection(envData.mongo.url)
autoIncrement.initialize(connection);

const OrderSchema = new Schema({
    id: ObjectId,
    userId: { type: Number, required: true },
    razorPayPaymentId: { type: String, required: true },
    razorPaySubscriptionId: { type: String, required: true },
    razorPaySignature: { type: String, required: true },
}, {
    timestamps: { createdAt: true, updatedAt: false }
});

OrderSchema.plugin(autoIncrement.plugin, {
    model: 'Order',
    field: 'orderId',
    startAt: 100000000,
    incrementBy: 1
});

const OrderModel = mongoose.model('Order', OrderSchema);
module.exports = OrderModel;
