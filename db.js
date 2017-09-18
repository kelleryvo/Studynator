var mysql = require('mysql');

var con = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: ''
});

function executeRead(sql, callback){
  var result = con.query(sql, function (err, res) {
      if (err) throw err;
      //console.log(res[0]);
      //console.log('Desc:'  + res[0].description);

      callback(res); //Call Given function with result
  });
}

con.connect(function(err) {
  if (err) throw err;
  console.log('Connected!');
});

con.query('USE stream_dream;', function (err, result) {
    if (err) throw err;
    console.log('Using database');
});

module.exports = {
  con: con,
  executeRead: executeRead
};
