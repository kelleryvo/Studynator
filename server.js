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
var bodyParser = require('body-parser')

var frdmCalendar = require('./frdmCalendar')

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
  var html = '<table> <th> <tr> <th colspan="7"> <span class="btn-group"> <a class="btn"><i class="icon-chevron-left"></i></a> <a class="btn active">'+ givenMonth +' ' + givenYear +'</a> <a class="btn"><i class="icon-chevron-right"></i></a> </span> </th> </tr> <tr> <th>Mo</th> <th>Tu</th> <th>We</th> <th>Th</th> <th>Fr</th> <th>Sa</th> <th>Su</th> </tr> </th>'
  month = new calendar.Calendar(0).monthdayscalendar(givenYear, givenMonth)

  html += '<td>'

  month.forEach(function(week){
    html += '<tr>'
    week.forEach(function(day){
      if(!(day == 0)){
        html += '<td>' + day + '</td> '
      } else {
        html += '<td></td> '
      }
    });
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
      res.redirect('/');
  }
}

//Manage Routes
app.get('/', function(req, res){
  html = generateUICalendar();

  res.render('welcome', {table: html});
});

app.get('/calendar/:year/:month', function(req, res){
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
    email = querystring.escape(req.body.username);
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

app.get('/logout', function(req, res){
  var sess = req.session

  sess.authenticated = false;
  sess.username = null;
  sess.userid = null;

  console.log('After Logout: ' + req.session.authenticated);
  res.redirect('/login');
});

app.get('/remote', isLoggedIn, function(req, res){
  var sess = req.session

  //Check if there Are Clients in Room
  if(io.sockets.adapter.rooms[sess.username] && io.sockets.adapter.rooms[sess.username].sockets){
    var clients = io.sockets.adapter.rooms[sess.username].sockets

    //Loop Trough Room Members
    var numClients = (typeof clients !== 'undefined') ? Object.keys(clients).length : 0;
    var content = '';
    content += 'Clients in Room: ' + numClients;

    for (var clientId in clients ) {
      var clientSocket = io.sockets.connected[clientId];
      content += '<br>- ' + clientSocket.client_name;
    }

    res.render('remote', {conn: content, session: sess});
  } else {
    res.render('remote', {conn: 'No Clients Connected.', session: sess});
  }
});

app.get('/library', isLoggedIn, function(req, res){
  //MAIN PAGE
  var sql_query = 'SELECT * FROM tbl_series;';
  db.executeRead(sql_query, function(val){
      //Get Series
      if (val !== 'undefined' && val !== null){
        var content = '<table class="">';
        content += '<tr><th></th></tr>';

        console.log(val.length);

        for(var i = 0; i < val.length; i++) {
          content += '<tr><td>';

          content += '<h2>' + val[i].name + '</h2>';
          content += '<h4>' + val[i].description + '</h4>';

          content += '<a href="/library/' + val[i].id + '">'
          content += '<img src="data/thumbnails/' + val[i].thumbnail + '" width="auto" class="img-responsive">';
          content += '</a>'

          content += '</td></tr>';
        }

        content += '</table>';
        var series = content;

        //Get RECENT
        var sess = req.session;
        sql_query = "SELECT w.last_watched, e.name, e.id, se.number, s.name name_series FROM tbl_watchlist w inner join tbl_episode e on e.id =  w.fk_episode inner join tbl_season_episode se on se.fk_episode = e.id inner join tbl_series s on s.id = se.fk_season where w.fk_user = " + sess.userid + " order by w.last_watched";
        db.executeRead(sql_query, function(val_watchlist){
          if (val_watchlist !== 'undefined' && val_watchlist !== null){
            content = "";
            content = '<table class="table table-striped table-responsive">';
            content += '<tr><th>Series</th><th>Episode</th></tr>';

            console.log(val_watchlist.length);

            for(var i = 0; i < val_watchlist.length; i++) {
              content += '<tr>';

              content += '<td>';
              content += '<p>' + val_watchlist[i].name_series + '</p>';
              content += '</td>';

              content += '<td>';
              content += '<a href="/stream?id=' + val_watchlist[i].id + '">';
              content += '<p>' + val_watchlist[i].number + '. ' + val_watchlist[i].name + '</p>';
              content += '</a>'
              content += '</td>';

              content += '</tr>';

            }

            content += '</table>';
            var recent = content;
          }

          //Render Page
          res.render('library', {
            series: series,
            recent: recent
          });

        });
      } else {
        res.status(404);
        res.render('404');
      }
  });
});

app.get('/library/:id', isLoggedIn, function(req, res){
  var series = querystring.escape(req.params.id);

  if(series !== 'undefined' && series !== null){
    var sql_query = 'SELECT sea.id, sea.fk_series, sea.name, sea.thumbnail, sea.description, sea.production_year FROM tbl_season sea WHERE sea.fk_series = ' + series + ' ORDER BY sea.order_number;';

    db.executeRead(sql_query, function(val){
      if(val !== 'undefined' && val !== null){
        var content = '<div class="table-responsive"><table>';
        content += '<tr><th></th></tr>';

        console.log(val.length);

        for(var i = 0; i < val.length; i++) {
          content += '<tr>';

          content += '<td>';
          content += '<h2>' + val[i].name + '</h2>';
          content += '<h4>' + val[i].description + '</h4>';
          content += '<h6>' + val[i].production_year + '</h6>';
          content += '<a href="/library/' + val[i].fk_series + '/' + val[i].id + '">';
          content += '<img src="../data/thumbnails/' + val[i].thumbnail + '" width="auto" class="img-responsive">';
          content += '</a>';
          content += '</td>';

          content += '</tr>';
        }

        content += '</table></div>';
        var series = content;
        res.render('library', {
          series: series,
          recent: undefined
        });
      } else {
        res.status(404);
        res.render('404');
      }
    });
  } else {
    res.status(404);
    res.render('404');
  }
});

app.get('/library/:id/:season', isLoggedIn, function(req, res){
  var series = querystring.escape(req.params.id);
  var season = querystring.escape(req.params.season);

  if(season !== 'undefined' && season !== null && series !== 'undefined' && series !== null){
    var sql_query = 'SELECT e.id, e.name, e.description, e.thumbnail, e.src, seaepi.number FROM tbl_episode e INNER JOIN tbl_season_episode seaepi ON e.id = seaepi.fk_episode INNER JOIN tbl_season sea ON seaepi.fk_season = sea.id INNER JOIN tbl_series ser ON sea.fk_series = ser.id WHERE ser.id = ' + series + ' AND sea.id = ' + season + ' ORDER BY seaepi.number';

    db.executeRead(sql_query, function(val){
      if(val !== 'undefined' && val !== null){
        var content = '<div class="table-responsive"><table>';
        content += '<tr><th></th></tr>';

        console.log(val.length);

        for(var i = 0; i < val.length; i++) {
          content += '<tr>';

          content += '<td>';
          content += '<h2>' + val[i].number + '. ' + val[i].name + '</h2>';
          content += '<a href="/stream?id=' + val[i].id + '">';
          content += '<img src="../../data/thumbnails/' + val[i].thumbnail + '" width="auto" class="img-responsive">';
          content += '</a>';
          content += '</td>';

          content += '</tr>';
        }

        content += '</table></div>';

        var series = content;
        res.render('library', {
          series: series,
          recent: undefined
        });
      } else {
        res.status(404);
        res.render('404');
      }
    });
  } else {
    res.status(404);
    res.render('404');
  }
});

app.get('/stream', isLoggedIn, function(req, res){
  var sess = req.session;
  var episode = querystring.escape(req.query.id);
  if(episode !== 'undefined' && episode !== null){
    var sql_query = 'SELECT e.id, e.name, e.description, e.thumbnail, e.src, seaepi.number, sea.name name_season, sea.production_year, ser.name series, ser.description desc_series FROM tbl_episode e INNER JOIN tbl_season_episode seaepi ON e.id = seaepi.fk_episode INNER JOIN tbl_season sea ON seaepi.fk_season = sea.id INNER JOIN tbl_series ser ON sea.fk_series = ser.id WHERE e.id = ' + episode;

    db.executeRead(sql_query, function(val){
      if (val !== 'undefined' && val !== null){
        var src_info = {
          src: 'play?id=' + val[0].id,
          poster: 'data/thumbnails/' + val[0].thumbnail
        };
        console.log(src_info);

        /*
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
        }*/

        res.render('stream', {rq: val, src_info: src_info, session: sess});
      } else {
        res.status(404);
        res.render('404');
      }

    });
  } else {
    res.status(404);
    res.render('404');
  }
});

app.get('/play', isLoggedIn, function(req, res){
  var episode = querystring.escape(req.query.id);
  var sql_query = 'SELECT e.src FROM tbl_episode e WHERE id = ' + episode;

  db.executeRead(sql_query, function(val){
    if(val !== 'undefined' && val !== null){
      //FOUND SOMETHING --> Stream
      var file = path.resolve(__dirname + "/data/movies/" + val[0].src);
      console.log('Requesting: ' + file);

      fs.stat(file, function(err, stats) {
        //Error handling
        if (err) {
            if (err.code === 'ENOENT') {
              // 404 Error if file not found
              return res.sendStatus(404);
              console.log('its an error 404');
          }
          res.end(err);
        }

        var range = req.headers.range;
        if (!range) {
           // 416 Wrong range
           console.log('wrong range');
           return res.sendStatus(416);
        }

        var positions = range.replace(/bytes=/, "").split("-");
        var start = parseInt(positions[0], 10);
        var total = stats.size;
        var end = positions[1] ? parseInt(positions[1], 10) : total - 1;
        var chunksize = (end - start) + 1;

        res.writeHead(206, {
          "Content-Range": "bytes " + start + "-" + end + "/" + total,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize,
          "Content-Type": "video/mp4"
        });

        var stream = fs.createReadStream(file, { start: start, end: end })
          .on("open", function() {
            //console.log('open pipe');
            stream.pipe(res);
          }).on("error", function(err) {
            res.end(err);
          });
        });
    } else {
      res.status(404);
      res.render('404');
    }
  });
});

//The 404 Route
app.get('*', function(req, res){
  res.status(404);
  res.render('404');
});

//WEBSOCKET
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
//var sio = require('socket.io')(server);
var users;
users = [];
var connections
connections = [];

//Test IO Access Session
/*
var sio = require("socket.io")(server);

var sessionMiddleware = session({
  secret: "keyboard cat"
});

sio.use(function(socket, next) {
    sessionMiddleware(socket.request, socket.request.res, next);
});
app.use(sessionMiddleware);
*/

/*
//Session Middleware IO
var sessionMiddleware = session({
  secret: 'keyboard cat',
  cookie: { maxAge: 60000 }
});

sio.use(function(socket, next) {
    sessionMiddleware(socket.request, socket.request.res, next)
});

app.use(sessionMiddleware)

sio.sockets.on("connection", function(socket) {
  console.log('here it is: ' + socket.request.session) // Now it's available from Socket.IO sockets too! Win!
  console.log(JSON.stringify(socket.request.session, null, 4));
});
//########
*/


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

  //Stop Video Command
  socket.on('pause videos', function(data){
    var room_name = data.room_name;

    //Loop trough Clients connected with room
    var clients = io.sockets.adapter.rooms[room_name].sockets;
    for(var clientId in clients) {
       var clientSocket = io.sockets.connected[clientId];

       io.to(room_name).emit('pause', {time: data});
    }
    console.log('Videos paused!');
  });

  //Play Video Command
  socket.on('play videos', function(data){
    //Play All Browsers
    io.sockets.emit('play', {time: data});
    console.log('Videos played!');
  });

  //Forward 10
  socket.on('forward 10', function(data){
    //Play All Browsers
    io.sockets.emit('skip forward 10', {time: data});
    console.log('Sent 10 Forward!');
  });

  //Backward 10
  socket.on('backward 10', function(data){
    //Play All Browsers
    io.sockets.emit('skip backward 10', {time: data});
    console.log('Sent 10 Backward!');
  });

  //Sync
  socket.on('get watchtime', function(data){
    console.log('Wants watchtime. Recieved ' + data)

    //Read Watchtime from DB
    var sql_query = 'SELECT watch_time FROM tbl_watchlist WHERE fk_user = ' + data.user + ' and fk_episode = '+ data.episode + ';';
    db.executeRead(sql_query, function(val){
      if(val.length === 0){
        //No Entry in DB --> WatchTime 0
        socket.emit('set watchtime', {
          watch_time: 0
        });
      } else {
        //Send watchtime back to Stream Client
        console.log('Sent watchtime: ' + val[0].watch_time);
        socket.emit('set watchtime', {
          watch_time: val[0].watch_time
        });
      }
    });
  });

  //Get Play Time
  socket.on('send watchtime', function(data){
      if(data == ''){
        //Empty Message
        console.log('Empty');
      } else {
        //Insert DB
        var sql_query = 'SELECT COUNT(id) entry_count FROM tbl_watchlist WHERE fk_user = ' + data.user + ' and fk_episode = '+ data.episode + ';';
        db.executeRead(sql_query, function(val){
          if(val[0].entry_count > 0){
            //UPDATE
            console.log('Updating, already exists.');
            sql_query = 'UPDATE tbl_watchlist SET watch_time = ' + data.curr_time + ' WHERE fk_user = ' + data.user + ' and fk_episode = ' + data.episode + ';';
            db.executeRead(sql_query, function(val){
              //val = db info
            });
          } else {
            //INSERT
            console.log('Inserting, doesnt exist.');
            sql_query = 'INSERT INTO tbl_watchlist(fk_episode, fk_user, plays_count, watch_time) VALUES(' + data.episode + ',' + data.user + ', 0,' + data.curr_time + ');';
            db.executeRead(sql_query, function(val){
              //val = db info
            });
          }
        });
      }
  });
});
