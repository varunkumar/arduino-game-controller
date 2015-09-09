var express = require("express"),
  app = express.createServer(),
  io = require("socket.io").listen(app);

// Configuration
app.configure(function() {
  app.use(express.bodyParser());
});

app.listen(3600);
process.send('online');

process.on('message', function() {
  if (message === 'shutdown') {
    process.exit(0);
  }
})

// Router 
app.get("/", function(req, res) {
  res.sendfile('/index.html', {
      root: __dirname
    })
    //res.sendfile(__dirname + "/index.html");
});

app.get("/leaptest", function(req, res) {
  res.sendfile('/leap-test.html', {
      root: __dirname
    })
    //res.sendfile(__dirname + "/index.html");
});

app.use("/static", express.static(__dirname + "/static"));

app.post("/controlgame", function(req, res) {
  console.log(req.body.data);
  //io.sockets.in("gamecontroller").emit("command", {type: "keydown", keyCode: 39, magnitude : 1});
  io.sockets.in("gamecontroller").emit("command", req.body.data);
  res.end("Ok!");
});

// Sockets

// TODO: Use Redis store store instead of inmemory object. This might not scale well.
var sockets = {};

io.sockets.on("connection", function(socket) {
  console.log("A socket with id " + socket.id + " connected!");
  socket.on("message", function(data) {
    // Process the message
    console.log(data);
  });

  socket.on("host", function(passcode) {
    var token = socket.id + "_" + passcode;
    sockets[token] = {
      user1: socket,
      user2: null,
      controller: null
    };
    socket.join(token);
    socket.emit("hostReady", token);
  });

  socket.on("join", function(token, isController) {
    var hostSocket = sockets[token];
    if (hostSocket == null) {
      socket.emit("declined", "Could not find host with the token: " + token);
    } else {
      socket.join(token);
      if (isController) {
        hostSocket.controller = socket;
        io.sockets.in(token).emit("controllerReady");
      } else {
        hostSocket.user2 = socket;
        var terrainPatterns = [];

        for (var i = 0; i < 100000; i++)
          terrainPatterns[i] = Math.random();

        io.sockets.in(token).emit("ready", terrainPatterns);
      }
    }
  });

  socket.on("getTerrainPatterns", function(token) {
    var terrainPatterns = [];

    for (var i = 0; i < 10000; i++)
      terrainPatterns[i] = Math.random();

    var hostSocket = sockets[token];
    if (hostSocket != null)
      io.sockets.in(token).emit("terrainPatterns", terrainPatterns);
  });

  socket.on("gameControl", function(token, data) {
    console.log(token);
    console.log(data);
    data.sender = "CONTROLLER";
    var hostSocket = sockets[token];
    if (hostSocket != null)
      hostSocket.user1.emit("gameControl", data);
  });

  socket.on("gameEvent", function(token, data) {
    console.log("GameEvent: " + data.type);
    var hostSocket = sockets[token];
    if (hostSocket != null) {
      // Identifying the sender
      if (socket.id === hostSocket.user1.id) {
        data.sender = "HOST";
      } else if (hostSocket.user2 != null && socket.id === hostSocket.user2.id) {
        data.sender = "CLIENT";
      } else if (hostSocket.controller != null && socket.id === hostSocket.controller.id) {
        data.sender = "CONTROLLER";
      }
      io.sockets.in(token).emit("gameEvent", data);
    }
  });

  socket.on("gameOver", function(token) {
    io.sockets.in(token).emit("gameOver");
    sockets[token] = null;
  });

  socket.on("disconnect", function() {
    console.log("A socket with id " + socket.id + " disconnected!");
    for (var token in sockets) {
      if (token.indexOf(socket.id + "_") == 0) {
        io.sockets.in(token).emit("gameOver");
        sockets[token] = null;
      }
    }
  });
});