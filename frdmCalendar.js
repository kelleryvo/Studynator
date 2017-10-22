var calendar = require('node-calendar');

/*
function generateUICalendar(){
  var html = '<table> <th> <tr> <th colspan="7"> <span class="btn-group"> <a class="btn"><i class="icon-chevron-left"></i></a> <a class="btn active">February 2012</a> <a class="btn"><i class="icon-chevron-right"></i></a> </span> </th> </tr> <tr> <th>Su</th> <th>Mo</th> <th>Tu</th> <th>We</th> <th>Th</th> <th>Fr</th> <th>Sa</th> </tr> </th>'
  month = new calendar.Calendar(1).monthdayscalendar(2017, 10)

  html += '<td>'

  month.forEach(function(week){
    html += '<tr>'
    week.forEach(function(day){
      html += '<td>' + day + '</td> '
      console.log(day)
    });
    html += '</tr>'
  });

  html += '</td> </table>'

  return html
}
*/

var year;
var month;

function frdmCalendar(year, month){
  this.year = year;
  this.month = month;
}

frdmCalendar.getHtml = function(){
  var html = '<table> <th> <tr> <th colspan="7"> <span class="btn-group"> <a class="btn"><i class="icon-chevron-left"></i></a> <a class="btn active">February 2012</a> <a class="btn"><i class="icon-chevron-right"></i></a> </span> </th> </tr> <tr> <th>Su</th> <th>Mo</th> <th>Tu</th> <th>We</th> <th>Th</th> <th>Fr</th> <th>Sa</th> </tr> </th>'
  month = new calendar.Calendar(1).monthdayscalendar(year, month)

  html += '<td>'

  month.forEach(function(week){
    html += '<tr>'
    week.forEach(function(day){
      html += '<td>' + day + '</td> '
      console.log(day)
    });
    html += '</tr>'
  });

  html += '</td> </table>'

  return html
}

module.exports = frdmCalendar
