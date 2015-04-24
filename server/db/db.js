var pg = require('pg');

pg.connect(process.env.DATABASE_URL, function(err, client) {
  if (err) {
    console.log(err);
  } else {
    console.log('connected to db');
  }
});