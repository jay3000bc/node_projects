/*
Author: jay@enterhelix.com
Date: 15/04/2016
*/
var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var exphbs = require('express-handlebars');

var session = require('express-session');
var errorHandler = require('errorhandler');
var methodOverride = require('method-override');

var app = express();
app.locals.appTitle = "Support Chat";

// view engine setup
app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'jade');
app.engine('.hbs', exphbs({defaultLayout: 'single', extname: '.hbs'}));
app.set('view engine', '.hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser('3CCC4ACD-6ED1-4844-9217-82131BDCB239'));

session_var = session({secret:'2C44774A-D649-4D44-9535-46E296EF984F', resave: true, saveUninitialized: true});
app.use(methodOverride());
app.use(express.static(path.join(__dirname, 'public')));


// error handlers
if('development' === app.get('env')){
    app.use(errorHandler());
}

var server = http.createServer(app);
var io = require('socket.io').listen(server);

app.use(session_var);

var rooms = [];
var users = [];

function isAgentInRoom(user){
  for(var i = 0; i < users.length; i++)
  {
    if(users[i].user == user)
    {
      var room = users[i].room;
      var agent = users[i].agent;
      break;
    }
  }
  if(agent != '')
    return(true);
  else
    return(false);
}

//Check if any client is idle or in queue
function lookingForAgent(){
for(var k = 0; k < users.length; k++)
{
  if(users[k].agent == '')
    return(true);
}
  return(false);
}

io.use(function(socket, next) {
      session_var(socket.request, socket.request.res, next);
});

io.sockets.on('connection', function(socket)
{
    //Chat  interaction between client and agent
    //The event "clientMessage" goes to both client and agent interface
    socket.on('clientMessage', function(content){
        //First find the agent in the room
        user = socket.username;
        room = socket.room;
        var is_agent_in_room = isAgentInRoom(user);
        
        //This will actually broadcast the message to all participants i.e., both client and agent in this room
        if(is_agent_in_room) //  Without this condition, message will go to client, because client is already in room
          io.sockets.in(room).emit('clientMessage', {user:socket.username, msg:content});
    })

    //Chat  interaction between client and agent
    //The event "agentMessage" goes to both client and agent interface
    socket.on('agentMessage', function(content){
        //First find the room
        room = socket.room;

        io.sockets.in(room).emit('agentMessage', {agent:socket.request.session.username, msg:content});
    })

    //Agent just got connected. Only emits to Agent.
    socket.on('agentConnected', function(content){
      socket.emit('agentConnected', {agent: socket.request.session.username, users:users});
    })

    socket.on('join', function(content){
      //Important, as to ho you assign a client's user name
      //Depends if you want unique names based on some random numbers or emails or client's actual name...whatever
      //Here, I am assigning the user name, based on a simple number increment
      if(users.length > 0)
      {
        //find the last index of user
        var last_user = users[users.length - 1];
        var user_index = last_user.user.split('_');
        var user = 'User_' + ((user_index[1])*1 + 1); //Forcing to do a math addition
        var room = 'Room_' + ((user_index[1])*1 + 1);
      }
      else
      {
        var user = 'User_'+(users.length+1);  //We create a user like User_1 and so on
        var room = 'Room_'+(rooms.length+1);  //We create a room like Room_1 and so on
      }

      socket.username = user; //We store the user (say) User_1 in a socket session, called username
      socket.room = room; //We also store the users room in a socket session, called room

      //Now we update both the users and rooms array
      //Add the username and his/ her room
      //Initially agent is blank, because still now, no Agent has taken up any client
      users.push({user:socket.username, room:socket.room, agent:'', acid:''});  //agent: Stores the Agents Username from session. acid: Stores the Agent's unique socket connection id
      rooms.push(socket.room);

      console.log('Total users '+users.length+'\\\\\Total Rooms: '+rooms.length);
      //Finally user joins this newly created room
      socket.join(room);
      socket.emit('serverMessage', 'Please wait for an agent to come online');
      //We broadcast, the Agents interface, that a new client has just joined
      //socket.broadcast.emit('joined',users);
      socket.broadcast.emit('updateClientList', users);
      socket.broadcast.emit('startRing', 'ringData');
    })

    socket.on('disconnect', function(){
      var looking_for_agent = false; //The client has initiated the ringing, but was never taken up by any Agent
      var user = socket.username;
      var agent = socket.request.session.username;
      if(user)
      {
        for(var i = 0; i < users.length; i++)
        {
          if(users[i].user == user)
          {
            var leaving_room = users[i].room
            break;
          }
        }
        //Remove the user from users array
        users.splice(i, 1);
        //Also remove the room from rooms
        var r = rooms.indexOf(leaving_room);
        rooms.splice(r + 1, 1);

        //Update the client list in Agents interface
        socket.broadcast.emit('updateClientList', users);
        
        looking_for_agent = lookingForAgent();  //This function will return whether any clientis idle or in queue
        
        if(looking_for_agent == false) //Stop ringing, only if this condition is satisfied
          io.sockets.emit('stopRing', 'ringData');  //since never taken up by any agent, hence stop ringing
        else
          io.sockets.emit('startRing', 'ringData');

        //We broadcast, the Agents interface, that the client has just left
        socket.broadcast.to(leaving_room).emit('clientDisconnected', {user: user, room: leaving_room});
        socket.leave(leaving_room);
      }

      //ToDo
      //Agent can be in multiple rooms
      else if(agent)
      {
        for(var i = 0; i < users.length; i++)
        {
          if(users[i].agent == agent)
          {
            var leaving_room = users[i].room
            socket.broadcast.to(leaving_room).emit('agentDisconnected', agent + ' got disconnected');
            socket.leave(leaving_room);
          }
        }
        
        console.log(users);
      }
      //ToDo
    })

    //Normally activated from controlpanel, when client has left the room
    //We evacuate agent from that room
    socket.on('disconnectAgent', function(room){
      socket.leave(room);
      //We also need to delete the room
      var r = rooms.indexOf(room);
      rooms.splice(r + 1, 1);
      console.log("Agent "+ socket.request.session.username + " has left the chat");
    })

    socket.on('takeClient', function(room){
      {
        looking_for_agent = false; //Initially we assume, no client are looking for Agents i.e., no client is in queue
        var agent_active = false; //Intially we assume the agent is not active i.e., not chatting with any client

        //Important condition check. Whether room really exists
        if(rooms.indexOf(room) != -1)
        {
            //First check whether this agent is already with some client in some room
            for(var i = 0; i < users.length; i++)
            {
              if(users[i].acid == socket.id)
              {
                var this_room =users[i].room; //This gives us the room the Agent is, in this socket
                var this_user = users[i].user;

                agent_active = true;
                break;
              }
            }

            //If Agent is already chatting with a client in this window, open a new window
            if(agent_active)
            {
              for(var j=0; j<users.length; j++)
              {
                if(users[j].room == room)
                {
                  if(users[j].agent == socket.request.session.username)
                    socket.emit('alreadyActive', 'You are already chatting with '+ users[j].user);  //If Agent is already chatting with the client, then no need to open a new window
                  else
                    socket.emit('newWindow', room);
                }
              }
            }
            //Agent is free in this wondow
            else
            {
              //Update the users array i.e., user, room & agent
              for(var i = 0; i < users.length; i++)
              {
                if(users[i].room == room)
                {
                  users[i].agent = socket.request.session.username;
                  users[i].acid = socket.id;
                  socket.room = room;
                  break;
                }
              }

              socket.join(room);

              console.log('Agent '+socket.request.session.username+' takes client in room '+room);
              console.log(users);
            
              //We update the Agents interface
              //Since, takeClient is executed only once and that too only in that particular socket connection
              //Hence we use io.sockets.emit to emit it globally
              io.sockets.emit('updateClientList', users);

              looking_for_agent = lookingForAgent();  //This function will return whether any clientis idle or in queue
              console.log(looking_for_agent);

              if(looking_for_agent == false) //Stop ringing, only if this condition is satisfied
                io.sockets.emit('stopRing', 'ringData');
              else
                io.sockets.emit('startRing', 'ringData');

              socket.broadcast.to(room).emit('agentConnected', 'You are now chatting with '+ socket.request.session.username);
              socket.emit('withClientNow', 'You are now chatting with '+ users[i].user);
            }
        }
      }
    })

    //When Agent is typing, client sees a temporary text..."Agent is typing"
    socket.on('agentTyping', function(content){
      room = socket.room;
      if(room)
        socket.broadcast.to(room).emit('agentTyping', 'Agent is typing...');
    })
    
    //When Client is typing, agent sees a temporary text..."Client is typing"
    socket.on('clientTyping', function(content){
      //First find the agent in the room
        user = socket.username;
        var is_agent_in_room = isAgentInRoom(user);
        room = socket.room;
        
        //There is no point of message broadcast from client, if no agent is in the room
      if(is_agent_in_room)
        socket.broadcast.to(room).emit('clientTyping', 'Client is typing...');
    })
})

//Authentication
app.use(function(req,res,next){
if(req.session.username)
  res.locals.username = true;
  next();
})
//Authorization
var authorize = function(req,res,next){
  if(req.session.username)
    return next();
  else
    res.redirect('login');
}

app.get('/', routes.index);
app.get('/controlPanel', authorize, routes.controlPanel);
//app.get('/controlPanelA', authorize, routes.controlPanelA);
app.get('/login', routes.login)
app.post('/login', routes.validate)

// production error handler
// no stacktraces leaked to user
app.all('*', function(req,res){
    res.sendStatus(404);
});

app.set('port', process.env.PORT || 6666);
server.listen(app.get('port'), function(){
  console.log('Express server litening on port' + app.get('port')
    );
});
