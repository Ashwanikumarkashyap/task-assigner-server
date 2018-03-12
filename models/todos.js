const mongoose = require('mongoose');
const Schema = mongoose.Schema;

var commentSchema = new Schema({
    comment:  {
        type: String,
        required: true
    },
    author: {
        type: String,
        ref: 'User'
    }
}, {
    timestamps: true
});

var todoSchema = new Schema({
    author: {
        type: String,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
    },
    image: {
        type: String,
    },
    category: {
        type: String,
    },
    priority:  {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    assignTo: [String],
    finishedBy: String,
    comments: [commentSchema]
}, {
    timestamps: true
});

var Todos = mongoose.model('Todo', todoSchema);
exports.Todos = Todos;