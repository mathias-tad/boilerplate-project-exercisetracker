require("dotenv").config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const bodyPsrser = require("body-parser");
const cors = require("cors");
const PORT = 9999;

mongoose.connect(process.env.URI);

const Schema = mongoose.Schema;
const userSchema = new Schema({
  username: { type: String, require: true },
});
const User = mongoose.model("User", userSchema);
const exerciseSchema = new Schema({
  username: { type: String, require: true },
  description: { type: String, require: true },
  duration: { type: Number, require: true },
  date: { type: Date },
  id: { type: String, require: true },
});
const Exercise = mongoose.model("Exercise", exerciseSchema);
const logSchema = new Schema(
  {
    username: { type: String, require: true },
    count: { type: Number },
    _id: { type: String, require: true },
    log: [
      {
        description: { type: String },
        duration: { type: Number },
        date: {
          type: Date,
        },
      },
    ],
  },
  { versionKey: false }
);
const Log = mongoose.model("Log", logSchema);
const err = new mongoose.MongooseError("error Loading");

app.use(express.static(`${process.cwd()}/public`));
app.use(bodyPsrser.urlencoded({ extended: true }));
app.use(bodyPsrser.json());
app.use(cors());

app.get("/", (req, res) => {
  res.sendFile(`${process.cwd()}/views/index.html`);
});

app.post("/api/users", (req, res) => {
  const { username } = req.body;
  //console.log(username);
  async function u() {
    try {
      const newUser = await User.create({ username: username });
      const userLog = await Log.create({
        username: username,
        count: 0,
        _id: newUser._id,
      });
      console.log(userLog);
      console.log(newUser);
      res.json({ username: username, _id: newUser._id });
    } catch (err) {
      console.log(err.message);
    }
  }
  u();
});

app.get("/api/users", (req, res) => {
  async function u() {
    const allUsers = await User.find({});
    //console.log(allUsers);
    res.json(allUsers);
  }
  u();
});

app.post("/api/users/:_id/exercises", (req, res) => {
  const { id, description, duration, date } = req.body;
  async function e() {
    const found = await Log.findById(req.params._id);
    const today = new Date().toString();
    const setToday = today.split(" ").slice(0, 4).join(" ");
    //console.log(today);
    //console.log(found.username);
    if (found) {
      try {
        await Log.findOneAndUpdate(
          { _id: req.params._id },
          {
            $inc: { count: 1 },
            $push: {
              log: {
                description: description,
                duration: parseInt(duration),
                date: date ? new Date(date) : setToday,
              },
            },
          }
        );
        res.json({
          _id: req.params._id,
          username: found.username,
          date: date ? date : setToday,
          duration: parseInt(duration),
          description: description,
        });
        //console.log(await Log.find({}));
      } catch (err) {
        res.send(err);
      }
    }
    //console.log(description);
  }
  e();
});

app.get("/api/users/:_id/logs", (req, res) => {
  const id = req.params._id;
  var from = req.query.from;
  var to = req.query.to;
  var limit = req.query.limit;
  var dateFormatedFound = {};
  //console.log(id);
  async function l() {
    var found = await Log.findById(id);

    if (from || to) {
      if (to && from) {
        from = new Date(from);
        to = new Date(to);
      } else if (from && !to) {
        to = new Date();
        from = new Date(from);
      } else if (to && !from) {
        from = new Date(0);
        to = new Date(to);
      }
      if (limit) {
        limit = parseInt(limit);
        found = await Log.aggregate([
          { $match: { _id: id } },
          {
            $project: {
              username: 1,
              count: 1,
              log: {
                $slice: [
                  {
                    $filter: {
                      input: "$log",
                      as: "item",
                      cond: {
                        $and: [
                          { $gte: ["$$item.date", from] },
                          { $lte: ["$$item.date", to] },
                        ],
                      },
                    },
                  },
                  limit,
                ],
              },
            },
          },
        ]);
      } else {
        found = await Log.aggregate([
          { $match: { _id: id } },
          {
            $project: {
              username: 1,
              count: 1,
              log: {
                $filter: {
                  input: "$log",
                  as: "item",
                  cond: {
                    $and: [
                      { $gte: ["$$item.date", from] },
                      { $lte: ["$$item.date", to] },
                    ],
                  },
                },
              },
            },
          },
        ]);
      }
      dateFormatedFound = found[0];
    } else if (limit) {
      limit = parseInt(limit);
      found = await Log.aggregate([
        {
          $match: { _id: id },
        },
        {
          $project: { username: 1, count: 1, log: { $slice: ["$log", limit] } },
        },
      ]);
      dateFormatedFound = found[0];
    } else dateFormatedFound = found;
    if (!found) return res.status(404).json({});
    //console.log(found);

    dateFormatedFound = {
      _id: dateFormatedFound._id,
      username: dateFormatedFound.username,
      count: dateFormatedFound.log.length,
      log: dateFormatedFound.log.map((data) => ({
        description: data.description,
        duration: data.duration,
        date: new Date(data.date).toString().split(" ").slice(0, 4).join(" "),
      })),
    };

    res.json(dateFormatedFound);
  }
  l();
});

app.listen(PORT, () => {
  console.log(`Listenning to port: ${PORT}`);
});
