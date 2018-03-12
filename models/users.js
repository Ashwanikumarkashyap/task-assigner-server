var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var passportLocalMongoose = require('passport-local-mongoose');

var notificationSchema = new Schema({
    assignedTodosCount:  {
        type: Number,
        default: 0
    },
    totalTodosCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

var User = new Schema({
    firstname: {
        type: String,
        default: ''
    },
    lastname: {
        type: String,
        default: ''
    },
    facebookId: String,
    assigned: [String],
    notificationCount: notificationSchema,
    admin:   {
        type: Boolean,
        default: false
    },
    
});

User.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', User);