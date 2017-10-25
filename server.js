var express = require('express');
var app = express();

app.set('view engine', 'ejs')

//Cookie Parser
var cookieParser = require('cookie-parser')
app.use(cookieParser());

//Initialize
var fs = require('fs');
var path = require('path');
var querystring = require('querystring');
var session = require('express-session');
var bodyParser = require('body-parser');

var urlencodedParser = bodyParser.urlencoded({ extended: false });

/*app.use(session({
  cookie: {
    path    : '/',
    httpOnly: false,
    saveUninitialized: false,
    resave: false,
    maxAge  : 24*60*60*1000
  },
  secret: '1234567890QWERT'
}));*/

var calendar = require('node-calendar');

function generateUICalendar(givenYear, givenMonth){
  var link_previous = '/calendar/' + givenYear + '/' + parseInt(givenMonth) - 1
  var link_next = '/calendar/' + givenYear + '/' + parseInt(givenMonth) + 1

  console.log(link_previous)
  console.log(link_next)

  var html = '<table> <th> <tr> <th colspan="7"> <span> <a href="' + link_previous + '" class="btn">Previous</a> <a class="btn active">'+ givenYear +' / ' + givenMonth +'</a> <a href="' + link_next + '" class="btn">Next</a> </span> </th> </tr> <tr> <th>Mo</th> <th>Tu</th> <th>We</th> <th>Th</th> <th>Fr</th> <th>Sa</th> <th>Su</th> </tr> </th>'
  month = new calendar.Calendar(0).monthdayscalendar(givenYear, givenMonth)

  html += '<td>'

  var countDays = 0
  month.forEach(function(week){
    html += '<tr>'
    week.forEach(function(day){
      countDays++;
      if(!(day == 0)){
        if(countDays == 6 || countDays == 7){
          //Weekend
          html += '<td class="clickable muted">' + day + '</td> '
        } else {
          //Work Day
          html += '<td class="clickable">' + day + '</td> '
        }
      } else {
        html += '<td></td> '
      }
    });
    countDays = 0
    html += '</tr>'
  });

  html += '</td> </table>'

  return html
}

//Validate Functions
function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return re.test(email)
}

//Session Function
app.use(session({
  secret: 'keyboard cat',
  cookie: { maxAge: 60000 }
}));

//DB Connection
var db = require('./db');
var con = db.con;

//Manage Requested Static Files
app.use('/assets', express.static('assets'));
app.use('/data', express.static('data'));

//Function to Check if User is logged in
function isLoggedIn(req, res, next) {
  if (req.session.authenticated === true) {
      next();
  } else {
      res.redirect('/signin');
  }
}

//Manage Routes
app.get('/', function(req, res){
  res.redirect('portal');
});

app.get('/portal', function(req, res){
  var d = new Date();

  var html = generateUICalendar(2017, 10);

  res.render('portal', {calendar_tbl: html});
});

app.get('/addhomework', function(req, res){
  res.render('addhomework');
});

app.get('/addexam', function(req, res){
  res.render('addexam');
});

app.get('/calendar', function(req, res){
  var d = new Date()
  //Date.prototype.setDate()
  //console.log(d.getYear() + ' ' + Date.prototype.getMonth())

  if(html == ''){
    html = generateUICalendar(d.getYear(), d.getMonth());
  }

  res.render('calendar', {table: html});
});

app.get('/calendar/:year/:month', isLoggedIn, function(req, res){
  var year = querystring.escape(req.params.year);
  var month = querystring.escape(req.params.month);

  html = ''

  if(year !== 'undefined' && year !== null && month !== 'undefined' && month !== null){
    //Check Length
    if(year.length == 4 && (month.length == 2 || month.length == 1)){
      //Check for Number
      if(isNaN(year) == false && isNaN(month) == false){
        //Check Range
        if(month >= 1 && month <= 12){
          console.log('date input ok (' + year + ' / ' + month + ')')

          html = generateUICalendar(year, month);
        }
      }
    }
  }

  //If dates were invalid
  var d = new Date()
  //Date.prototype.setDate()
  //console.log(d.getYear() + ' ' + Date.prototype.getMonth())

  if(html == ''){
    html = generateUICalendar(d.getYear(), d.getMonth());
  }

  res.render('calendar', {table: html});
});

app.get('/signin', function(req, res){
  res.render('signin', {errors: ''});
});

app.post('/signin', urlencodedParser, function(req, res){
  var sess = req.session
  sess.authenticated = false;

  if(req.body.username && req.body.password){
    //VARS
    var username = querystring.escape(req.body.username);
    var password = querystring.escape(req.body.password);

    console.log('SQL INJ: ' + username);

    var sql_query = 'SELECT * FROM tbl_user WHERE username = "' + username + '"';
    db.executeRead(sql_query, function(val){

      if(val.length === 0){
        //No Result
        console.log('Account doenst exist.');
        res.render('signin', {errors: '<p class="label label-danger error">This account doesnt exist!</p>'});
      } else {
        //Account found
        if(val[0].password === password){
          sess.authenticated = true;

          sess.username = val[0].username;
          sess.userid = val[0].id;

          //Create Cookie for later Access
          res.cookie('user', sess.username, { maxAge: 900000, httpOnly: true }); //create cookie

          console.log('User signed in.' + sess.authenticated);
          res.redirect('/');
        } else {
          res.render('signin', {errors: '<p class="label label-danger error">Wrong password!</p>'});
        }
      }
    });
  } else {
    //Not all Parameters Given / False
    res.render('signin', {errors: '<p class="label label-danger error">Invalid login credentials!</p>'});
  }
});

app.get('/signup', function(req, res){
  res.render('signup', {errors: ''});
});

app.post('/signup', urlencodedParser, function(req, res){
  var msg = '';
  var state = true;
  var password, username;

  if(req.body.username && req.body.password){
    //VARS
    username = querystring.escape(req.body.username);
    email = querystring.escape(req.body.email);
    password = querystring.escape(req.body.password);
    var password_repeat = querystring.escape(req.body.password_repeat);

    //Username Check
    if(username.length >= 5){
    } else {
      msg += "- The username needs to be at least 5 characters long!"
      state = false;
    }

    //E-Mail Check
    if(validateEmail(email)){
      msg += "- The e-mail address has an invalid format!"
      sate = false
    }

    //Password Check
    if(password_repeat == password){
    } else {
      msg += "- The passwords don't match!"
      state = false;
    }
  } else {
    msg += "- Some fields are empty!"
    state = false;
  }

  if(state == true){
    //Try to Register User
    var sql_query = 'INSERT INTO tbl_user(username, email, password) VALUES("' + username + '","' + email + '","' + password + '")';
    db.executeRead(sql_query, function(val){
      console.log(val);
      msg += 'Successfully registered! You can now log in.';
      var feedback = '<p class="label label-success error">' + msg + '<p>';
    });
  } else {
    var feedback = '<p class="label label-danger error">' + msg + '<p>';
  }

  if(msg = ''){
    feedback = '';
  }

  res.render('signup', {errors: feedback});
});

app.get('/logout', function(req, res){
  var sess = req.session

  sess.authenticated = false;
  sess.username = null;
  sess.userid = null;

  console.log('After Logout: ' + req.session.authenticated);
  res.redirect('/login');
});

//The 404 Route
app.get('*', function(req, res){
  res.status(404);
  res.render('404');
});

//WEBSOCKET
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

var users;
users = [];
var connections
connections = [];

server.listen(process.env.PORT || 8888);
console.log('Server started. Listening on Port 8888')

//Web Sockets
io.sockets.on('connection', function(socket){
  //Add to Connections
  connections.push(socket);
  console.log('Connected: %s sockets.', connections.length);

  //Emit Welcome Message
  socket.emit('new message', {username: 'StreamDream', msg: 'Welcome to the chat room!'});

  //console.log(socket.request.session.username);
  /*
  //###############
  //JOIN ROOM
  if(req.cookies.user){
    var username = req.cookies.user;

    //Manage Room
    socket.join(username);

    //Access Room
    var clients = io.sockets.adapter.rooms[username].sockets
    var numClients = (typeof clients !== 'undefined') ? Object.keys(clients).length : 0;

    socket.client_name = username + 's Client ' + numClients + 1;

    //Loop Trough Room Members
    for(var clientId in clients) {
         var clientSocket = io.sockets.connected[clientId];
    }
  }
  //###############
  */

  //Join Room
  socket.on('join room', function(data){
    var username = data.username;
    socket.join(username);
    console.log(username + ' Joined the Room ' + username);

    var clients = io.sockets.adapter.rooms[username].sockets
    var numClients = (typeof clients !== 'undefined') ? Object.keys(clients).length : 0;

    socket.client_name = username + "'s client " + numClients;

    socket.emit('joined room', {members: numClients})
  });

  //Disconnect
  socket.on('disconnect', function(data){
    connections.splice(connections.indexOf(socket),  1);
    console.log('Disconnected: %s sockets connected', connections.length);
  });

  //SendMessage
  socket.on('send message', function(data){
      if(data == ''){
        //Empty Message
      } else {
        io.sockets.emit('new message', {username: data.username, msg: data.msg});
      }
  });
});
