var pg = require('pg');
var connectionStr = process.env.DATABASE_URL; //connect to the heroku PSQL database

if (!connectionStr) {
  //if there is no database
  console.log('No database defined');
  module.exports = null;
} else {
  //template function for making queries to the server
  var connect = function(cb) {
    pg.connect(connectionStr, function(err, client, done) {
      if (err) {
        console.log(err);
        return;
      }
      cb(client, done);
    });
  };

  connect(function(client, done) {
    client.query('CREATE TABLE IF NOT EXISTS locations ( \
                  id serial primary key, \
                  lat FLOAT(15), \
                  lng FLOAT(15), \
                  created TIMESTAMP DEFAULT NOW() \
                  );', function(err, result) {
      done();
      if (err) {
        console.error(err);
      } else {
        console.log('success ', result);
      }
    });
  });

  module.exports.insert = function(data, cb) {
    connect(function(client, done) {
      client.query('INSERT INTO locations (lat, lng) values ($1, $2)', [data.lat, data.lng], cb);
    });
  };

  module.exports.get = function(data, cb) {
    connect(function(client, done) {
      client.query('SELECT * FROM locations', cb);
    });
  };
}