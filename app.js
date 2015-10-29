
var restify = require('restify');
var mongoose = require('mongoose');
var five = require("johnny-five");
var Galileo = require("galileo-io");
var board = new five.Board({
  io: new Galileo()
});

var board_this;
var temp = 0;
var doorbell = 0;
board.on("ready", function() {
  board_this = this;
  this.pinMode(2, this.MODES.OUTPUT);
  this.pinMode(3, this.MODES.OUTPUT);
  this.pinMode(7, this.MODES.INPUT);
  // this.pinMode(13, this.MODES.OUTPUT);
  // this.digitalWrite(13, 1);
});

board.analogRead("A5", function(data) {
  // temp = data / 1024.0 * 5000 / 10;
  var omg = Math.log(10000.0*((1024.0/data-1)));
  temp = parseFloat(1 / (0.001129148 + (0.000234125 + (0.0000000876741 * omg * omg ))* omg ) / 10);
});

board.digitalRead(7, function(data) {
  doorbell = data;
});

var mongoURI = "mongodb://localhost:27017/asparagus";
var MongoDB = mongoose.connect(mongoURI).connection;
MongoDB.on('error', function(err) { console.log(err.message); });
MongoDB.once('open', function() {
  console.log("mongodb connection open");
});

var roomSchema = mongoose.Schema({
	name: String
});

var objectSchema = mongoose.Schema({
	name: String
,	pin: Number
,	room: String
,	value: Number
});

var Rooms = mongoose.model('Rooms', roomSchema);
var Objects = mongoose.model('Objects', objectSchema);



function createRoom(req, res, next) {
  var room = new Rooms({ name: req.params.name });
  room.save(function (err, room) {
	if (err) return console.error(err);
  });
  res.send('createroom' + req.params.name);
  next();
}

function createObject(req, res, next) {
  var object = new Objects({ name: req.params.name, pin: req.params.pin, room: req.params.room, value: 0 });

  object.save(function (err, room) {
        if (err) return console.error(err);
  });

  res.send('createobject' + req.params.name);
  next();
}

function switchState(req, res, next) {
  var response = res;

  function updateObject(err, docs) {
    var object = docs[0]; //first entry
    console.log("Updating : ");
    console.log(object);
    if (object.value == 0) {
      Objects.update({ _id: object._id }, { $set: { value: 1 }}).exec();
      console.log("set true");
      response.send('true');
    } else {
      Objects.update({ _id: object._id }, { $set: { value: 0 }}).exec();
      console.log("set false");
      response.send('false');
    }
  }

  Objects.find({ name: req.params.object, room: req.params.room }, updateObject);
}

function switchState2(req, res, next) {
  var response = res;

  function updateObject(err, docs) {
    var object = docs[0]; //first entry
    console.log("Updating : ");
    console.log(object);
    console.log("pinul din asta este :"+object.pin);

    Objects.update({ _id: object._id }, { $set: { value: req.params.value }}).exec();
    
    console.log("set " + req.params.value);
    
    var pin = parseInt(object.pin);
    var value = parseInt(req.params.value);

    console.log ("Pin is : " + pin);
    console.log ("Value is : " + value);
    
    board_this.pinMode(pin, board_this.MODES.OUTPUT);
    board.digitalWrite(pin, value);

    response.send(req.params.value);
  }

  Objects.find({ name: req.params.object, room: req.params.room }, updateObject);
}

function getObjects(req, res, next) {
  var objects = Objects.find({room: req.params.room}, function(err, docs){
    res.send(docs);
    next();
  });
}


// five.Board().on("ready", function() {
//   var temperature = new five.Temperature({
//     pin: "A5"
//   });

//   temperature.on("data", function() {
//     console.log(this.celsius + "°C", this.fahrenheit + "°F");
//     setTemp(this.celsius);
//   });
// });


function getTemp(req, res, next) {
  console.log("PRINTING " + parseInt(temp).toString())
  res.send(parseFloat(temp).toPrecision(3));
  next();
}

function getRooms(req, res, next) {
Rooms.find({}, function(err, docs) {
    if (!err){ 
        console.log(docs);
        res.send(docs);
	next();
    } else {throw err;}
});
  //var rooms = Rooms.find();
  //res.send('rooms:', rooms);
  //res.send('x');
  //next();
}

//function getRooms(req, res, next) {}

function lockDoor(req, res, next) {
  board_this.servoWrite(3, 80);
  doorStatus = 0;
  res.send(0);  
};

function unlockDoor(req, res, next) {
  board_this.servoWrite(3, 10);
  doorStatus = 1;
  res.send();
};

function checkDoorbell(req, res, next) {
  console.log(doorbell);
  res.send(parseInt(doorbell).toString());
};

var doorStatus = 0;
function getDoorStatus(req, res, next) {
  res.send(parseInt(doorStatus).toString());
};

var server = restify.createServer();
server.get('/createroom/:name', createRoom);
server.head('/createroom/:name', createRoom);

server.get('/addobject/:room/:pin/:name', createObject);
server.head('/addobject/:room/:pin/:name', createObject);

server.get('/switch/:room/:object', switchState);
server.head('/switch/:room/:object', switchState);

server.get('/switch/:room/:object/:value', switchState2);
server.head('/switch/:room/:object/:value', switchState2);

server.get('/getobjects/:room', getObjects);
server.head('/getobjects/:room', getObjects);
server.get('/getobjects/:room/', getObjects);
server.head('/getobjects/:room/', getObjects);

server.get('/getrooms', getRooms);
server.head('/getrooms', getRooms);

server.get('/gettemperature', getTemp);
server.head('/gettemperature', getTemp);

server.get('/lockdoor', lockDoor);
server.head('/lockdoor', lockDoor);

server.get('/unlockdoor', unlockDoor);
server.head('/unlockdoor', unlockDoor);

server.get('/checkdoorbell', checkDoorbell);
server.head('/checkdoorbell', checkDoorbell);

server.get('/getdoorstatus', getDoorStatus);
server.get('/getdoorstatus', getDoorStatus);
server.listen(9001, function() {
  console.log('%s listening at %s', server.name, server.url);
});
