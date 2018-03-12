const express = require('express');
const cors = require('cors');
const app = express();

const whitelist = ['<Other cors URLs to allow>', 'http://localhost:4200']; // update corse list

var corsOptionsDelegate = (req, callback) => {
    // console.log("inside corseDelegate");
    var corsOptions;
    // console.log(req.header('Origin'));
    if(whitelist.indexOf(req.header('Origin')) !== -1) {
        corsOptions = { origin: true };
    }
    else {
        corsOptions = { origin: false };
    }
    callback(null, corsOptions);
};

exports.cors = cors();
exports.corsWithOptions = cors(corsOptionsDelegate);