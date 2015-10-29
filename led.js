var five = require("johnny-five");
var Galileo = require("galileo-io");
var board = new five.Board({
  io: new Galileo()
});

    board.on("ready", function() {
      this.pinMode(2, this.MODES.OUTPUT);
      board.digitalWrite(2, 1);
    });
