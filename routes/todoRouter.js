const express = require('express');
const todoRouter = express.Router();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
var Promise = require('bluebird');

const Users = require("../models/users");
const Todos = require("../models/todos").Todos;

var authenticate = require('../authenticate');
var config = require('../config');
const cors = require('./cors');

todoRouter.use(bodyParser.json());

todoRouter.options('*', cors.corsWithOptions, (req, res) => { res.sendStatus(200); })

todoRouter.route('/')
.get(cors.cors, authenticate.verifyUser, (req,res,next) => {
    console.log("all todos are requested")
    Todos.find({}).sort({'updatedAt': 'desc'})
    .then((todos) => {
        Users.findOne({"username": req.user.username})
        .then((user) => {
            let notificationCount = {};
            notificationCount.assignedTodosCount = user.notificationCount.assignedTodosCount;
            notificationCount.totalTodosCount = user.notificationCount.totalTodosCount;
            user.notificationCount.assignedTodosCount = 0;
            user.notificationCount.totalTodosCount = 0;
            user.save()
            .then((resp) => {
                res.json({"todos": todos, notificationCount});
                console.log("all todos are sent with", notificationCount);
            })
        })
    })
    .catch((err) => next(err));
})
.post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    if (req.body.imageFile) {
        req.body.image = `${config.imagePath}/${req.user.username}/${req.body.imageFile}`;
    }
    req.body.author = req.user.username;
    req.body.finishedBy = "";

    Todos.create(req.body)
    .then((todo) => {
        if (todo.assignTo!=null) {
            Promise.map(todo.assignTo,(userItem) => { 
                return Users.findOneAndUpdate({'username' : userItem},
                { $inc : {'notificationCount.assignedTodosCount' : 1},
                $push: {'assigned': todo._id}}, {new: true })
                .then((user)=> {
                    if (user == null) {
                        console.log("user does'nt exist");
                    } else {
                        console.log("todo is assigned to the user: ", user.username);
                    }
                })
            },{concurrency: 10})
            .then(()=> {
                Users.update({}, {$inc: {'notificationCount.totalTodosCount': 1}},
                { multi: true})
                .then(()=> {                    
                    res.json({success : true, "todo": todo});
                    console.log("todo is successfully posted");
                })
            })
            .catch((err) => next(err));
        } else {
            Users.update({}, {$inc: {'notificationCount.totalTodosCount': 1}},
            { multi: true})
            .then(()=> {                    
                res.json({success : true, "todo": todo});
                console.log("todo is successfully posted");
            })
        }
    })
    .catch((err) => { 
        if (err.code == "11000") {
            res.json({success : false, err: "Todo with this title already exists!"});
        } else {
            next(err);
        }
    });
})
.delete(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    Todos.remove({})
    .then((resp) => {
        Users.update({},
            {$set: {'notificationCount.totalTodosCount': 0,
                "notificationCount.assignedTodosCount": 0, 
                'assigned': []
            },
        },{ multi: true})
        .then((user)=> {
            console.log("all todos are deleted");
            res.json(resp);
        })
    })
    .catch((err) => next(err));    
});

todoRouter.route('/:todoId')
.get(cors.cors, (req,res,next) => {
    console.log("specefic todo is requested")
    Todos.findById(req.params.todoId)
    .then((todos) => {
        res.json(todos);
        console.log("specefic todo is sent")
    })
    .catch((err) => next(err));
})
.put(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    Todos.findById(req.params.todoId)
    .then((todo) => {
        if (todo == null) {
            res.json({success: false, err: "Todo does'nt exist."});
        } else if ( req.user.username!=todo.author) {
            res.json({success: false, err: "You are not the author you can't edit this todo"});
        } else if (todo.assignTo!=null) {
            // de-assign previous todo
            Promise.map(todo.assignTo,(userItem,i) => { 
                return Users.findOne({'username': userItem })
                .then((user) => {
                    if (user==null) {
                        console.log("user does'nt exist");
                    } else {
                        var index = user.assigned.indexOf(todo._id);
                        if (index>-1) {
                            console.log("todo is found and spliced for : " + user.username);
                            if (user.notificationCount.assignedTodosCount!=0) {
                                user.notificationCount.assignedTodosCount--;
                            }
                            user.assigned.splice(index, 1);
                            user.save()
                            .then((user) => {
                                console.log("todo is de-assigned to the user: " + user.username);
                            })
                        } else {
                            console.log("todo does'nt exist for user: " + user.username);
                        }
                    }
                })
            },{concurrency: 10})
            .then(()=> {
                todo.update({$set: req.body}, {new : true})
                .then((resp) => {
                    console.log("todo is updated with id: " + req.body._id);
                    if (req.body.assignTo!=null) {

                        // assign updated todo
                        Promise.map(req.body.assignTo,(user,i) => { 
                            return Users.findOneAndUpdate({'username' : user},
                            {$inc : {'notificationCount.assignedTodosCount' : 1},
                            $push: {'assigned': req.body._id}},{new: true })
                            .then((user)=> {
                                if (user==null) {
                                    console.log("user does'nt exist");
                                } else {
                                    console.log("todo is assigned to the user: ", user.username);    
                                }
                            })
                        },{concurrency: 10})
                        .then(()=> {
                            res.json({success : true, "todo": resp});
                        })
                        .catch((err) => next(err));
                    } else {
                        res.json({success : true, "todo": resp});
                    }
                })
            })
            .catch((err) => next(err));
        } else {
            todo.update({$set: req.body}, {new : true})
            .then((resp) => {
                console.log("todo is updated with id: " + req.body._id);
                if (req.body.assignTo!=null) {

                    // assign updated todo
                    Promise.map(req.body.assignTo,(user,i) => { 
                        return Users.findOneAndUpdate({'username' : user},
                        {$inc : {'notificationCount.assignedTodosCount' : 1},
                        $push: {'assigned': req.body._id}},{new: true })
                        .then((user)=> {
                            if (user==null) {
                                console.log("user does'nt exist");
                            } else {
                                console.log("todo is assigned to the user: ", user.username);    
                            }
                        })
                    },{concurrency: 10})
                    .then(()=> {
                        res.json({success : true, "todo": resp});
                    })
                    .catch((err) => next(err));
                } else {
                    res.json({success : true, "todo": resp});
                }
            })
        }
    })
    .catch((err) => next(err));
})
.delete(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    Todos.findById(req.params.todoId)
    .then((todo) => {
        if (todo==null) {
            res.json({success: false, err: "Todo does'nt exist"});
        } else {
            if (todo.author == req.user.username) {

                if (todo.assignTo!=null) {

                    // de-assign todo
                    Promise.map(todo.assignTo,(user,i) => { 
                        return Users.findOne({'username': user })
                        .then((user) => {
                            if (user==null) {
                                console.log("user does'nt exist");
                            } else {
                                var index = user.assigned.indexOf(todo._id);
                                if (index>-1) {
                                    console.log("todo is found and spliced for : " + user.username);
                                    if (user.notificationCount.assignedTodosCount!=0) {
                                        user.notificationCount.assignedTodosCount--;
                                    }
                                    user.assigned.splice(index, 1);
                                    user.save()
                                    .then((user) => {
                                        console.log("todo is de-assigned to the user: " + user.username);
                                    })
                                } else {
                                    console.log("todo does'nt exist for user: " + user.username);
                                }
                            }
                        })
                    },{concurrency: 10})
                    .then(()=> {
                        Users.find({})
                        .then((users)=> {
                            Promise.map(users, (user) => {
                                if (user.notificationCount.totalTodosCount!=0) {
                                    user.notificationCount.totalTodosCount--;    
                                } 
                                return user.save()
                                .then((user)=> {
                                    console.log("notification for todos have been saved for the user: "+ user.username);
                                })
                            },{concurrency: 10})
                            .then(()=> {
                                todo.remove()
                                .then((resp)=> {
                                    res.json({success : true, "todo": resp});
                                    console.log("specefic todo is removed with id: "+ req.params.todoId);
                                })
                            })
                            .catch((err) => next(err));
                        })
                    })
                    .catch((err) => next(err));
                } else {
                    Users.find({})
                    .then((users)=> {
                        Promise.map(users, (user) => {
                            if (user.notificationCount.totalTodosCount!=0) {
                                user.notificationCount.totalTodosCount--;    
                            } 
                            return user.save()
                            .then((user)=> {
                                console.log("notification for todos have been saved for the user: "+ user.username);
                            })
                        },{concurrency: 10})
                        .then(()=> {
                            todo.remove()
                            .then((resp)=> {
                                res.json({success : true, "todo": resp});
                                console.log("specefic todo is removed with id: "+ req.params.todoId);
                            })
                        })
                        .catch((err) => next(err));
                    })
                }

            } else {
                res.json({success: false, err: "You are the not the author, you can't delete it."});
            }
        }
    })
    .catch((err) => next(err));
});

todoRouter.route('/author/:todoAuthor')
// .options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req,res,next) => {
    console.log(" todos are requested for author: "+ req.params.todoAuthor);
    Todos.find({ 'author': req.params.todoAuthor })
    .then((todos) => {
        res.json(todos);
        console.log(" todos are sent for author: "+ req.params.todoAuthor);
    })
    .catch((err) => next(err));
})
.post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    if (req.body.findBy == "finished") {
        console.log("finished todos are requested for author: "+ req.params.todoAuthor);
        Todos.find({"finishedBy" : {"$exists" : true, "$ne" : ""}, 'author' : req.param.todoAuthor})
        .then((todos) => {
            res.json(todos);
            console.log("finished todos are sent for author: "+ req.params.todoAuthor);
        }, (err) => next(err))
        .catch((err) => next(err));
    } else if (req.body.findBy == "unfinished") {
        console.log("unfinished todos are requested for author: "+ req.params.todoAuthor);
        Todos.find({"finishedBy" : "", 'author' : req.param.todoAuthor})
        .then((todos) => {
            res.json(todos);
            console.log("unfinished todos are sent for author: "+ req.params.todoAuthor);
        })
        .catch((err) => next(err));
    } 
})

todoRouter.route('/finish/:todoId')
// .options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req,res,next) => {
    console.log("finished todos are requested");
    Todos.find({"finishedBy" : {"$exists" : true, "$ne" : ""}})
    .then((todos) => {
        res.json(todos);
        console.log("finished todos are sent");
    })
    .catch((err) => next(err));
})
.post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    Todos.findById(req.params.todoId)
    .then((todo) => {
        if (todo == null ) {
            res.json({success: false, err: "Todo does'nt exist."});
        } else if (todo.assignTo!=null && todo.assignTo.indexOf(req.user.username)==-1) {
            if (todo.author == req.user.username) {
                todo.finishedBy = req.user.username;
                todo.save()
                .then((todo) => {
                    res.json({success : true, "todo": todo});
                    console.log("todo with id: " + req.params.todoId+  " is marked finish by: "+ req.user.username);
                });
            } else {
                res.json({success: false, err: "Neither you are the author, nore this todo is assigned to you, you can't finish it."});
            }
        } else if (todo.finishedBy!='') {
            res.json({success: false, err: "todo has already been finished by :" + todo.finishedBy});
        } else {
            todo.finishedBy = req.user.username;
            todo.save()
            .then((todo) => {
                res.json({success : true, "todo": todo});
                console.log("todo with id: " + req.params.todoId+  " is marked finish by: "+ req.user.username);
            });
        }
    })
    .catch((err) => next(err));
})

todoRouter.route('/unfinish/:todoId')
// .options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req,res,next) => {
    console.log("unfinished todos are requested");
    Todos.find({"finishedBy" : ""})
    .then((todos) => {
        res.json(todos);
        console.log("unfinished todos are sent");
    }, (err) => next(err))
    .catch((err) => next(err));
})
.post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    Todos.findById(req.params.todoId)
    .then((todo) => {
        if(todo == null) {
            res.json({success: false, err: "Todo does'nt exist."});
        } else if (todo.assignTo!=null && todo.assignTo.indexOf(req.user.username)==-1) {
            if (todo.author == req.user.username) {
                todo.finishedBy = "";
                todo.save()
                .then((todo) => {
                    res.json({success : true, "todo": todo});
                    console.log("todo is marked unfinished with id: " + req.params.todoId);
                });    
            } else {
                res.json({success: false, err: "Neither you are the author, nore this todo is assigned to you, you can't unfinish it."});
            }
        } else if (todo.finishedBy == "") {
            res.json({success: false, err: "Todo is already assigned to someone."});
        } else {
            todo.finishedBy = "";
            todo.save()
            .then((todo) => {
                res.json({success : true, "todo": todo});
                console.log("todo is marked unfinished with id: " + req.params.todoId);
            });
        }
    })
    .catch((err) => next(err));
})

todoRouter.route('/assigned/:username')
// .options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, authenticate.verifyUser, (req,res,next) => {
    console.log("assigned todos are requested for the user: "+ req.params.username);
    Users.findOne({ "username": req.params.username  })
    .then((user) => {
        if (user.assigned!=null) {
            var todos = [];
            Promise.map(user.assigned, (todoItem, i) => {
                return Todos.findOne({"_id": todoItem})
                .then((resp)=> {
                    if (resp==null) {
                        console.log("todo is already deleted with title: ", todoItem.title);
                    } else {
                        todos.push(resp);
                    }
                });
            },{concurrency: 10})
            .then(()=> {
                res.json(todos);
                console.log("assigned todos are sent for the user: "+ req.params.username);
            })
            .catch((err) => next(err));
        }
    })
    .catch((err) => next(err));
})
.post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    if (req.body.findBy == "finished") {
        console.log("assigned finished todos are requested for the user: "+ req.params.username);
        Users.findOne({ "username": req.params.username  })
        .then((user) => {

            if (user.assigned!=null) {
                var todos = [];
                Promise.map(user.assigned, (todoItem, i) => {
                    return Todos.findOne({"finishedBy" : {"$exists" : true, "$ne" : ""}, "_id": todoItem})
                    .then((resp)=> {
                        if (resp==null){
                            console.log("todo is already deleted with title: ", todoItem.title);
                        } else {
                            todos.push(resp);
                        }
                    });
                },{concurrency: 10})
                .then(()=> {
                    res.json(todos);
                    console.log("assigned todos are sent for the user: "+ req.params.username);
                })
                .catch((err) => next(err));
            }
        }, (err) => next(err))
        .catch((err) => next(err));
    } else if (req.body.findBy == "unfinished") {
        console.log("assigned unfinished todos are requested for the user: "+ req.params.username);
        Users.findOne({ "username": req.params.username  })
        .then((user) => {
            if (user.assigned!=null) {
                var todos = [];
                Promise.map(user.assigned, (todoItem, i) => {
                    return Todos.findOne({"finishedBy" : "", "_id": todoItem})
                    if (resp==null){
                        console.log("todo is already deleted with title: ", todoItem.title);
                    } else {
                        todos.push(resp);
                    }
                },{concurrency: 10})
                .then(()=> {
                    res.json(todos);
                    console.log("assigned todos are sent for the user: "+ req.params.username);
                })
                .catch((err) => next(err));
            }
        }, (err) => next(err))
        .catch((err) => next(err));
    } 
})

module.exports = todoRouter;