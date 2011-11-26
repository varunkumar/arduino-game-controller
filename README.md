Arduino based game controller for HTML5 Helicopter game
========================================================
Arduino based game controller for HTML5 Helicopter game. The controller is connected to an Android device which routes the data to the game played on the browser. The communication with the browser happens over web sockets. Powered by Node.js and Socket.io

Current version: 1.0

Hosted at: http://varunkumar.no.de (Multi-player mode might not work properly as no.de does not support web sockets)

For more information: http://blog.varunkumar.me

Modules
--------
The project has three core modules:

###Game module
- HTML5 based Helicopter game. Uses Canvas for rendering the game.
- Powered by Node.js and socket.io.
- Supports multi-player mode using web sockets & related technologies.
- To start the game, go inside node-app/helicopter and run 'node server.js'. This will start a local instance on port 8080. You can configure the port on server.js

###Joystick module
- Accessories used: [Arduino Mega ADK](http://www.arduino.cc/en/Main/ArduinoBoardADK) + [Joystick Shield](http://simplelabs.co.in/content/joystick-shield-fully-assembled)
- Arduino firmware to read analog inputs and to pass the data to Android phone using [Accessory protocol](http://developer.android.com/guide/topics/usb/adk.html).

###Android module
- Android driver app for linking the game and the controller.
- Compatible with devices running 2.3.4+.
- Listens for data from the USB accessory and forwards the joystick events to the game via web sockets.
- Eclipse project 'GameController' can be found inside 'android' folder.

How to play?
------------
- Start the game on your local machine (as per the instructions given in Game Module section).
- Visit http://localhost:8080 on your browser. (Recommended : Latest version of Chrome, Firefox).
- Enter a passcode (secret code) which will be used by the controller / other player to connect to your game.
- Click anywhere on the screen / press enter to start the game in single player mode.

###Multi-player mode
- Press 'H' to host a multi-player game. Share 'Host Token' secretly to the second player. This is displayed at the bottom of the page.
- The second player has to press 'J' to join this game. Key in the host token when prompted. 
- Game starts after keying in the host token. 
- You are always the first player (irrespective of hosting / joining a game).
- The game ends when any of the two players crashes against the wall or the obstacles.

###Playing with the game controller
- Manually key in 'Host Token' and the web socket URL to connect to. 
- Alternately, you can use the option 'Scan QR Code' in the Android app. Scan the QR code which is displayed at the bottom of the page.
- Press 'Connect' to connect to the server and send Joystick events.

ToDo
----
- Have not given much thought about the security aspects.
- Support for Pausing the game while multi-player game is in mode. This does not work well today.

Credits
-------
- Varunkumar Nagarajan
- Dale Harvey (The original [single player version](http://arandomurl.com/2010/08/05/html5-helicopter.html))

Powered By
----------
- Node.js
- HTML5 Canvas / Audio
- Socket.io
- Arduino
- Android Open Accessory Dev Kit

How to Contribute?
------------------
The source code is available [here](https://github.com/varunkumar/arduino-game-controller) under MIT licence. Please send any bugs, feedback, complaints, patches about the extension to me at varunkumar[dot]n[at]gmail[dot]com.

-- [Varun](http://www.varunkumar.me)

Last Modified: Sat Nov 26 19:13:36 IST 2011
