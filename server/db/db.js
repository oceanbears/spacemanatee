var pg = require('pg');

pg.connect(process.env.DATABASE_URL, function(err, client, done) {
  if (err) {
    console.log(err);
  }
  client.query('CREATE TABLE IF NOT EXISTS locations ( \
                id serial primary key, \
                lat FLOAT(15), \
                long FLOAT(15), \
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