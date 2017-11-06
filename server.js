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

var urlencodedParser = bodyParser.urlencoded({
  extended: false
});

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

function generateUICalendar(givenYear, givenMonth) {
  var previousMonth = parseInt(givenMonth) - 1
  var link_previous = '/calendar/' + givenYear + '/' + previousMonth

  var nextMonth = parseInt(givenMonth) + 1
  var link_next = '/calendar/' + givenYear + '/' + nextMonth

  var html = '<table> <th> <tr> <th colspan="7"> <span> <a href="' + link_previous + '" class="btn">Previous</a> <a class="btn active">' + givenYear + ' / ' + givenMonth + '</a> <a href="' + link_next + '" class="btn">Next</a> </span> </th> </tr> <tr> <th>Mo</th> <th>Tu</th> <th>We</th> <th>Th</th> <th>Fr</th> <th>Sa</th> <th>Su</th> </tr> </th>'
  month = new calendar.Calendar(0).monthdayscalendar(givenYear, givenMonth)

  html += '<td>'

  var countDays = 0
  month.forEach(function(week) {
    html += '<tr>'
    week.forEach(function(day) {
      countDays++;
      if (!(day == 0)) {
        if (countDays == 6 || countDays == 7) {
          //Weekends

          //Format Day
          var formatted_day = day.toString()
          if(formatted_day.length == 1){
            formatted_day = '0' + formatted_day
          }

          html += '<td class="clickable muted" onclick="openDay(' + givenYear + ', ' + givenMonth + ', ' + formatted_day + ');">' + day + '</td>'
        } else {
          //Work Day

          //Format Day
          var formatted_day = day.toString()
          if(formatted_day.length == 1){
            formatted_day = '0' + formatted_day
          }

          html += '<td class="clickable" onclick="openDay(' + givenYear + ', ' + givenMonth + ', ' + formatted_day + ');">' + day + '</td>'
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
  cookie: {
    maxAge: 3600000
  }
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
app.get('/', isLoggedIn, function(req, res) {

  var html = generateUICalendar(2017, 10)
  var sess = req.session

  var sql_query = 'select sc.name school_name, cl.name class_name, su.name subject_name, ho.name homework_name, ho.description homework_description, DATE_FORMAT(ho.due_date, "%a %D %b %Y") homework_due_date from tbl_user us inner join tbl_user_class us_cl on us_cl.fk_user = us.id inner join tbl_class cl on cl.id = us_cl.fk_class inner join tbl_class_subject cl_su on cl.id = cl_su.fk_class inner join tbl_subject su on su.id = cl_su.fk_subject inner join tbl_school sc on sc.id = cl.fk_school inner join tbl_homework ho on ho.fk_subject = su.id where us.id = ' + sess.userid + ' and (ho.due_date >= CURDATE()) order by ho.due_date ';

  db.executeRead(sql_query, function(val) {

    if (val !== 'undefined' && val !== null) {
      var content_homework = '<table class="table-striped table-bordered table-responsive">';
      content_homework += '<tr><th>Class</th><th>Subject</th><th>Task</th><th>Date</th><th>Delete</th><th>Edit</th></tr>';

      console.log(val.length);

      for (var i = 0; i < val.length; i++) {
        content_homework += '<tr>';

        content_homework += '<td><b>' + val[i].class_name + '</b><br>' + val[i].school_name + '</td>'
        content_homework += '<td>' + val[i].subject_name + '</td>'
        content_homework += '<td><b>' + val[i].homework_name + '</b><br>' + val[i].homework_description + '</td>'
        content_homework += '<td>' + val[i].homework_due_date + '</td>';

        content_homework += '<td><img src="assets/img/x-button.png" style="width: 25px;"></img></td>'
        content_homework += '<td><img src="assets/img/edit.png" style="width: 25px;"></img></td>'

        content_homework += '</tr>';
      }
      content_homework += '</table>';

      content_homework = content_homework.replace('undefined', '')

      //part 2
      var sql_query2 = 'select sc.name school_name, cl.name class_name, su.name subject_name, ex.id exam_id, ex.name exam_name, ex.description exam_description, DATE_FORMAT(ex.due_date, "%a %D %b %Y") exam_due_date, pr.priority exam_priority from tbl_user us inner join tbl_user_class us_cl on us_cl.fk_user = us.id inner join tbl_class cl on cl.id = us_cl.fk_class inner join tbl_class_subject cl_su on cl.id = cl_su.fk_class inner join tbl_subject su on su.id = cl_su.fk_subject inner join tbl_school sc on sc.id = cl.fk_school inner join tbl_exams ex on ex.fk_subject = su.id left join tbl_priority pr on pr.fk_exam = ex.id where us.id = ' + sess.userid + ' and (ex.due_date >= CURDATE()) order by ex.due_date';

      db.executeRead(sql_query2, function(val) {

        if (val !== 'undefined' && val !== null) {
          var content_exam = '<table class="table-striped table-bordered table-responsive">';
          content_exam += '<tr><th>Class</th><th>Subject</th><th>Task</th><th>Date</th><th>Priority</th><th>Delete</th><th>Edit</th></tr>';

          console.log(val.length);

          for (var i = 0; i < val.length; i++) {
            content_exam += '<tr>';

            content_exam += '<td><b>' + val[i].class_name + '</b><br>' + val[i].school_name + '</td>'
            content_exam += '<td>' + val[i].subject_name + '</td>'
            content_exam += '<td><b>' + val[i].exam_name + '</b><br>' + val[i].exam_description + '</td>'
            content_exam += '<td>' + val[i].exam_due_date + '</td>';

            switch (val[i].exam_priority) {
              case 1:
                content_exam += '<td class="clickable prior1" onclick="setPriority(' + val[i].exam_id + ');"></td>'
                break;
              case 2:
                content_exam += '<td class="clickable prior2" onclick="setPriority(' + val[i].exam_id + ');"></td>'
                break;
              case 3:
                content_exam += '<td class="clickable prior3" onclick="setPriority(' + val[i].exam_id + ');"></td>'
                break;
              case 4:
                content_exam += '<td class="clickable prior4" onclick="setPriority(' + val[i].exam_id + ');"></td>'
                break;
              case 5:
                content_exam += '<td class="clickable prior5" onclick="setPriority(' + val[i].exam_id + ');"></td>'
                break;
              default:
              content_exam += '<td class="clickable" onclick="setPriority(' + val[i].exam_id + ');"></td>'
            }

            content_exam += '<td><img src="assets/img/x-button.png" style="width: 25px;"></img></td>'
            content_exam += '<td><img src="assets/img/edit.png" style="width: 25px;"></img></td>'


            content_exam += '</tr>';
          }
          content_exam += '</table>';

          content_exam = content_exam.replace('undefined', '')

          res.render('portal', {
            calendar_tbl: html,
            session: sess,
            content_homework: content_homework,
            content_exam: content_exam
          });
        }
      });
    }
  });
});

function buildProfile(req, res, callback) {
  var sess = req.session
  var classes = ''
  var errors = ''

  //Get Subjects and return Page
  var sql_query = 'select sc.name school_name, cl.id id, cl.name class_name from tbl_user us inner join tbl_user_class us_cl on us_cl.fk_user = us.id inner join tbl_class cl on cl.id = us_cl.fk_class inner join tbl_school sc on sc.id = cl.fk_school where us.id = ' + sess.userid
  console.log('executing: ' + sql_query)
  db.executeRead(sql_query, function(val) {
    if (val !== 'undefined' && val !== null) {
      if (val.length < 0) {
        errors += '<p class="label label-danger error">You are in no class!</p>'
      } else {
        var classes = ''

        for (var i = 0; i < val.length; i++) {
          classes += '<h4>' + val[i].school_name + '</h4><br>'
          classes += '<div class="well">' + val[i].class_name + '</div>'

          var sql_query2 = 'select su.name, us.username, us.email from tbl_class cl inner join tbl_class_subject cl_su on cl_su.fk_class = cl.id inner join tbl_subject su on su.id = cl_su.fk_subject inner join tbl_user us on us.id = su.fk_user where cl.id = ' + val[i].id
          db.executeRead(sql_query2, function(val2) {
            if (val2 !== 'undefined' && val2 !== null) {
              console.log('not undefined! ' + val2.length)
              for (var j = 0; j < val2.length; j++) {
                console.log('came in!')
                classes += '<b>' + val2[j].name + '</b>   TEXT' + val2[j].username + '   ' + val2[j].email + '<br>'
              }
            }
            //callback(req, res, errors, sess, classes)
          });
          classes += '<br>'
        }

        //classes built
        console.log('rendered')
      }
    } else {
      errors += '<p class="label label-danger error">Database error occured!</p>'
    }
    callback(req, res, errors, sess, classes)
  });
  //callback(req, res, errors, sess, classes)
}

app.get('/profile', isLoggedIn, function(req, res) {
  buildProfile(req, res, function(req, res, errors, sess, profile) {
    res.render('profile', {
      errors: errors,
      session: sess,
      content_classes: profile
    });
  });
});

app.get('/addhomework', isLoggedIn, function(req, res) {
  var sess = req.session

  //Get Subjects and return Page
  var sql_query = 'select su.name, su.id from tbl_subject su inner join tbl_class_subject cl_su on cl_su.fk_subject = su.id inner join tbl_class cl on cl.id = cl_su.fk_class inner join tbl_user_class us_cl on us_cl.fk_class = cl.id inner join tbl_user us on us.id = us_cl.fk_user where us.id = ' + sess.userid
  db.executeRead(sql_query, function(val) {
    if (val !== 'undefined' && val !== null) {
      console.log('subjects for user result: ' + val)

      var subjects = '<option value="">- Select -</option>'

      for (var i = 0; i < val.length; i++) {
        subjects += '<option value="' + val[i].id + '">' + val[i].name + '</option>'
      }

      res.render('addhomework', {
        errors: '',
        subjects: subjects
      });
    } else {
      res.render('addhomework', {
        errors: '<p class="label label-danger error">You are in no class!</p>',
        subjects: subjects
      });
    }
  });
});

app.post('/addhomework', isLoggedIn, urlencodedParser, function(req, res) {
  var sess = req.session
  console.log(querystring.escape(req.body.name))

  if (req.body.subject && req.body.name && req.body.description && req.body.date) {
    //VARS
    var subject = querystring.escape(req.body.subject);
    var name = req.body.name;
    var description = req.body.description;
    var date = req.body.date;

    var day = date.substring(1, 2);
    var month = date.substring(4, 5);
    var year = date.substring(7, 10);

    var sql_query = 'insert into tbl_homework(fk_subject, name, description, due_date) values(' + subject + ', "' + name + '", "' + description + '", "' + date + '")'

    db.executeRead(sql_query, function(val) {
      console.log('insert result: ' + val)

      res.render('addhomework', {
        errors: '<p class="label label-success error">Homework added to subject!</p>',
        subjects: ''
      });
    });
  } else {
    //Not all Parameters Given / False
    res.render('addhomework', {
      errors: '<p class="label label-danger error">Parameters missing!</p>',
      subjects: ''
    });
  }
});

app.get('/addexam', isLoggedIn, function(req, res) {
  var sess = req.session

  //Get Subjects and return Page
  var sql_query = 'select su.name, su.id from tbl_subject su inner join tbl_class_subject cl_su on cl_su.fk_subject = su.id inner join tbl_class cl on cl.id = cl_su.fk_class inner join tbl_user_class us_cl on us_cl.fk_class = cl.id inner join tbl_user us on us.id = us_cl.fk_user where us.id = ' + sess.userid
  db.executeRead(sql_query, function(val) {
    if (val !== 'undefined' && val !== null) {
      console.log('subjects for user result: ' + val)

      var subjects = '<option value="">- Select- </option>'

      for (var i = 0; i < val.length; i++) {
        subjects += '<option value="' + val[i].id + '">' + val[i].name + '</option>'
      }

      res.render('addexam', {
        errors: '',
        subjects: subjects
      });
    } else {
      res.render('addexam', {
        errors: '<p class="label label-danger error">You are in no class!</p>',
        subjects: subjects
      });
    }
  });
});

app.post('/addexam', isLoggedIn, urlencodedParser, function(req, res) {
  var sess = req.session
  console.log(querystring.escape(req.body.name))

  if (req.body.subject && req.body.name && req.body.description && req.body.date) {
    //VARS
    var subject = querystring.escape(req.body.subject);
    var name = req.body.name;
    var description = req.body.description;
    var date = req.body.date;

    var day = date.substring(1, 2);
    var month = date.substring(4, 5);
    var year = date.substring(7, 10);

    console.log('given date: ' + date + ' | new date: ' + day + '-' + month + '-' + year)

    var sql_query = 'insert into tbl_exams(fk_subject, name, description, due_date) values(' + subject + ', "' + name + '", "' + description + '", "' + date + '")'

    db.executeRead(sql_query, function(val) {
      res.render('addexam', {
        errors: '<p class="label label-success error">Exam added to subject!</p>',
        subjects: ''
      });
    });
  } else {
    //Not all Parameters Given / False
    res.render('addexam', {
      errors: '<p class="label label-danger error">Parameters missing!</p>',
      subjects: ''
    });
  }
});

app.get('/addpriority/:exam', isLoggedIn, function(req, res) {
  var sess = req.session;
  var priority;
  var exam_id = querystring.escape(req.params.exam);

  //Get Subjects and return Page
  var sql_query = 'select priority, planned_effort from tbl_priority where fk_exam = ' + exam_id + ' and fk_user = ' + sess.userid
  console.log('query get: ' + sql_query)
  db.executeRead(sql_query, function(val) {
    if (val !== undefined && val !== null && val.length > 0) {
      priority = val[0].priority

      res.render('addpriority', {
        errors: '<p class="label label-success">Priority loaded!</p>',
        priority_value: priority
      });
    } else {
      res.render('addpriority', {
        errors: '<p class="label label-danger error">No priority defined yet!</p>',
        priority_value: 0
      });
    }
  });
});

app.post('/addpriority/:exam', isLoggedIn, urlencodedParser, function(req, res) {
  var sess = req.session;
  var priority = querystring.escape(req.body.priority);
  var exam_id = querystring.escape(req.params.exam);

  //Get Subjects and return Page
  var sql_query = 'select priority, planned_effort from tbl_priority where fk_exam = ' + exam_id + ' and fk_user = ' + sess.userid
  console.log('query 1: ' + sql_query)

  db.executeRead(sql_query, function(val) {
    if (val !== undefined && val !== null && val.length > 0) {
      //Update
      var sql_query2 = 'update tbl_priority set priority = ' + priority + ' where fk_exam = ' + exam_id + ' and fk_user = ' + sess.userid
      console.log('query 2: ' + sql_query2)
      db.executeRead(sql_query2, function(val2) {
        //Redirect to Main site after updating value
        res.redirect('/')
      });
    } else {
      //Insert
      var sql_query3 = 'INSERT INTO tbl_priority (fk_user, fk_exam, planned_effort, priority) VALUES (' + sess.userid + ', ' + exam_id + ', 0, ' + priority + ');'
      console.log('query 3: ' + sql_query3)
      db.executeRead(sql_query3, function(val3) {
        //Redirect to Main site after updating value
        res.redirect('/')
      });
    }
  });
});

app.get('/calendar', isLoggedIn, function(req, res) {
  var today = new Date();
  var dd = today.getDate();
  var mm = today.getMonth() + 1; //January is 0!
  var yyyy = today.getFullYear();

  if (dd < 10) {
    dd = '0' + dd
  }

  if (mm < 10) {
    mm = '0' + mm
  }

  today = mm + '/' + dd + '/' + yyyy;
  console.log(today);

  var html = generateUICalendar(yyyy, mm);

  res.render('calendar', {
    calendar_tbl: html
  });
});


app.get('/calendar/:year/:month', isLoggedIn, function(req, res) {
  var year = querystring.escape(req.params.year);
  var month = querystring.escape(req.params.month);

  var sess = req.session;

  html = ''

  if (year !== 'undefined' && year !== null && month !== 'undefined' && month !== null) {
    //Check Length
    if (year.length == 4 && (month.length == 2 ||  month.length == 1)) {
      //Check for Number
      if (isNaN(year) == false && isNaN(month) == false) {
        //Check Range
        if (month >= 1 && month <= 12) {
          console.log('date input ok (' + year + ' / ' + month + ')')

          html = generateUICalendar(year, month);
        }
      }
    }
  }

  //If dates were invalid
  var today = new Date()
  if (html == '') {
    html = generateUICalendar(d.getFullYear(), d.getMonth());
  }

  res.render('calendar', {
    calendar_tbl: html
  });
});


app.get('/calendar/:year/:month/:day', isLoggedIn, function(req, res) {
  var year = querystring.escape(req.params.year);
  var month = querystring.escape(req.params.month);
  var day = querystring.escape(req.params.day);

  var sess = req.session;

  html = ''

  if (year !== 'undefined' && year !== null && month !== 'undefined' && month !== null && day !== 'undefined' && day !== null) {
    //Check Length
    if (year.length == 4 && (month.length == 2 ||  month.length == 1) && day.length == 2) {
      //Check for Number
      if (isNaN(year) == false && isNaN(month) == false && isNaN(day) == false) {
        //Check Range
        if (month >= 1 && month <= 12) {
          console.log('date input ok (' + year + ' / ' + month + ' / ' + day + ')')

          var formatted_date = year + '-' + month + '-' + day
          var formatted_date_export = day + '.' + month + '.' + year

          sql_query = 'select sc.name school_name, cl.name class_name, su.name subject_name, ho.name homework_name, ho.description homework_description, ho.due_date homework_due_date from tbl_user us inner join tbl_user_class us_cl on us_cl.fk_user = us.id inner join tbl_class cl on cl.id = us_cl.fk_class inner join tbl_class_subject cl_su on cl.id = cl_su.fk_class inner join tbl_subject su on su.id = cl_su.fk_subject inner join tbl_school sc on sc.id = cl.fk_school inner join tbl_homework ho on ho.fk_subject = su.id where us.id = ' + sess.userid + ' and ho.due_date = "' + formatted_date + '" order by ho.due_date'

          db.executeRead(sql_query, function(val) {

            if (val !== 'undefined' && val !== null) {
              var content_homework = '<table class="table-striped table-bordered table-responsive">';
              content_homework += '<tr><th>Class</th><th>Subject</th><th>Task</th></tr>';

              console.log(val.length);

              for (var i = 0; i < val.length; i++) {
                content_homework += '<tr>';

                content_homework += '<td><b>' + val[i].class_name + '</b><br>' + val[i].school_name + '</td>'
                content_homework += '<td>' + val[i].subject_name + '</td>'
                content_homework += '<td><b>' + val[i].homework_name + '</b><br>' + val[i].homework_description + '</td>'

                content_homework += '</tr>';
              }

              content_homework += '</table>';

              if(val.length == 0){
                content_homework = 'No Homework for this day.'
              }

              //part 2
              var sql_query2 = 'select sc.name school_name, cl.name class_name, su.name subject_name, ex.id exam_id, ex.name exam_name, ex.description exam_description, ex.due_date exam_due_date, pr.priority exam_priority from tbl_user us inner join tbl_user_class us_cl on us_cl.fk_user = us.id inner join tbl_class cl on cl.id = us_cl.fk_class inner join tbl_class_subject cl_su on cl.id = cl_su.fk_class inner join tbl_subject su on su.id = cl_su.fk_subject inner join tbl_school sc on sc.id = cl.fk_school inner join tbl_exams ex on ex.fk_subject = su.id left join tbl_priority pr on pr.fk_exam = ex.id where us.id = ' + sess.userid + ' and ex.due_date = "' + formatted_date + '" order by ex.due_date';

              db.executeRead(sql_query2, function(val) {

                if (val !== 'undefined' && val !== null) {
                  var content_exam = '<table class="table-striped table-bordered table-responsive">';
                  content_exam += '<tr><th>Class</th><th>Subject</th><th>Task</th><th>Priority</th></tr>';

                  console.log(sql_query2);

                  for (var i = 0; i < val.length; i++) {
                    content_exam += '<tr>';

                    content_exam += '<td><b>' + val[i].class_name + '</b><br>' + val[i].school_name + '</td>'
                    content_exam += '<td>' + val[i].subject_name + '</td>'
                    content_exam += '<td><b>' + val[i].exam_name + '</b><br>' + val[i].exam_description + '</td>'

                    switch (val[i].exam_priority) {
                      case 1:
                        content_exam += '<td class="clickable prior1" onclick="setPriority(' + val[i].exam_id + ');"></td>'
                        break;
                      case 2:
                        content_exam += '<td class="clickable prior2" onclick="setPriority(' + val[i].exam_id + ');"></td>'
                        break;
                      case 3:
                        content_exam += '<td class="clickable prior3" onclick="setPriority(' + val[i].exam_id + ');"></td>'
                        break;
                      case 4:
                        content_exam += '<td class="clickable prior4" onclick="setPriority(' + val[i].exam_id + ');"></td>'
                        break;
                      case 5:
                        content_exam += '<td class="clickable prior5" onclick="setPriority(' + val[i].exam_id + ');"></td>'
                        break;
                      default:
                      content_exam += '<td class="clickable" onclick="setPriority(' + val[i].exam_id + ');"></td>'
                    }


                    content_exam += '</tr>';
                  }
                  content_exam += '</table>';

                  if(val.length == 0){
                    content_exam = 'No Exams on this day.'
                  }

                  res.render('calendar_day', {
                    content_homework: content_homework,
                    content_exam: content_exam,
                    date: formatted_date_export,
                    session: sess
                  });

                }
              });
            }
          });

        }
      }
    }
  }
});

app.get('/signin', function(req, res) {
  res.render('signin', {
    errors: ''
  });
});

app.post('/signin', urlencodedParser, function(req, res) {
  var sess = req.session
  sess.authenticated = false;

  if (req.body.email && req.body.password) {
    //VARS
    var email = req.body.email;
    var password = querystring.escape(req.body.password);

    console.log('User logged in: ' + email);

    var sql_query = 'SELECT * FROM tbl_user WHERE email = "' + email + '"';
    db.executeRead(sql_query, function(val) {

      if (val.length === 0) {
        //No Result
        console.log('Account doenst exist.');
        res.render('signin', {
          errors: '<p class="label label-danger error">This account doesnt exist!</p>'
        });
      } else {
        //Account found
        if (val[0].password === password) {
          sess.authenticated = true;

          sess.username = val[0].email;
          sess.userid = val[0].id;

          //Create Cookie for later Access
          res.cookie('user', sess.username, {
            maxAge: 900000,
            httpOnly: true
          }); //create cookie

          console.log('User signed in.' + sess.authenticated);
          res.redirect('/');
        } else {
          res.render('signin', {
            errors: '<p class="label label-danger error">Wrong password!</p>'
          });
        }
      }
    });
  } else {
    //Not all Parameters Given / False
    res.render('signin', {
      errors: '<p class="label label-danger error">Invalid login credentials!</p>'
    });
  }
});

app.get('/signup', function(req, res) {
  res.render('signup', {
    errors: ''
  });
});

app.post('/signup', urlencodedParser, function(req, res) {
  var msg = '';
  var state = true;
  var password, username;

  if (req.body.username && req.body.password) {
    //VARS
    username = req.body.username;
    email = req.body.email;
    password = querystring.escape(req.body.password);
    var password_repeat = querystring.escape(req.body.password_repeat);

    //Username Check
    if (username.length >= 5) {} else {
      msg += "- The username needs to be at least 5 characters long!"
      state = false;
    }

    //E-Mail Check
    /*
    if(validateEmail(email)){
      //msg += "- The e-mail address has an invalid format!"
      state = false
    }*/

    //Password Check
    if (password_repeat == password) {} else {
      msg += "- The passwords don't match!"
      state = false;
    }
  } else {
    msg += "- Some fields are empty!"
    state = false;
  }

  if (state == true) {
    //Try to Register User
    var sql_query = 'INSERT INTO tbl_user(username, email, password) VALUES("' + username + '","' + email + '","' + password + '")';
    db.executeRead(sql_query, function(val) {
      console.log(val);
      msg += 'Successfully registered! You can now log in.';
      var feedback = '<p class="label label-success error">' + msg + '<p>';

      if (msg = '') {
        feedback = '';
      }

      res.render('signup', {
        errors: feedback
      });
    });
  } else {
    var feedback = '<p class="label label-danger error">' + msg + '<p>';

    if (msg = '') {
      feedback = '';
    }

    res.render('signup', {
      errors: feedback
    });
  }



});

app.get('/logout', function(req, res) {
  var sess = req.session

  sess.authenticated = false;
  sess.username = null;
  sess.userid = null;

  console.log('After Logout: ' + req.session.authenticated);
  res.redirect('/');
});

//The 404 Route
app.get('*', function(req, res) {
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

server.listen(process.env.PORT ||  8889);
console.log('Server started. Listening on Port 8888')

//Web Sockets
io.sockets.on('connection', function(socket) {
  //Add to Connections
  connections.push(socket);
  console.log('Connected: %s sockets.', connections.length);

  //Emit Welcome Message
  socket.emit('new message', {
    username: 'StreamDream',
    msg: 'Welcome to the chat room!'
  });

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
  socket.on('join room', function(data) {
    var username = data.username;
    socket.join(username);
    console.log(username + ' Joined the Room ' + username);

    var clients = io.sockets.adapter.rooms[username].sockets
    var numClients = (typeof clients !== 'undefined') ? Object.keys(clients).length : 0;

    socket.client_name = username + "'s client " + numClients;

    socket.emit('joined room', {
      members: numClients
    })
  });

  //Disconnect
  socket.on('disconnect', function(data) {
    connections.splice(connections.indexOf(socket), 1);
    console.log('Disconnected: %s sockets connected', connections.length);
  });

  //SendMessage
  socket.on('send message', function(data) {
    if (data == '') {
      //Empty Message
    } else {
      io.sockets.emit('new message', {
        username: data.username,
        msg: data.msg
      });
    }
  });
});
