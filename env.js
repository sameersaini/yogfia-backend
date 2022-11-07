const getEnvData = (env) => ({
    local: {
        mongo: {
            url: 'mongodb://localhost:27017/yogfia',
        },
        sendgrid: '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',
        razorPayTest: {
            key: 'rzp_test_1fGKl1VGuHubbP',
            secret: 'Ks1F9uOp4BhQXIhllC2TSL9T'
        }
    },
    prod: {
        mongo: {
            url: 'mongodb+srv://tripfia:tripfia@cluster0.fygrf.mongodb.net/tripfia?retryWrites=true&w=majority'
        },
        sendgrid: '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',
        razorPayTest: {
            key: 'rzp_test_1fGKl1VGuHubbP',
            secret: 'Ks1F9uOp4BhQXIhllC2TSL9T'
        }
    }
}[env]);

module.exports = getEnvData;