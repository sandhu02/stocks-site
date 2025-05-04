const mongoose = require('mongoose');

const k100Schema = new mongoose.Schema({
    Date: String,
    Price: String,
    Open: String,
    High: String,
    Low: String,
    "Change %": String
});

module.exports = mongoose.model('k100', k100Schema, 'k100');
