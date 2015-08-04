var debug = require('debug')('gitevents');
var config = require('./common/config');
var handler = require('./lib/handler');
var crypto = require('crypto');
var http = require('http');

var server = http.createServer(function(req, res) {
  console.log(req.method + ' ' + req.url);

  process.on('uncaughtException', function(error) {
    //debug('uncaughtException', error);
    //console.log(error);
    res.writeHeader(500, {
      'Content-Type': 'text/plain'
    });
    res.write(error.toString());
    res.end();
  });

  if (req.url === '/github/delivery' && req.method === 'POST') {
    var body = '';

    req.on('data', function(chunk) {
      body += chunk.toString();
    });

    req.on('end', function() {
      var hmac;
      var calculatedSignature;

      hmac = crypto.createHmac('sha1', config.github.secret);
      hmac.update(body);
      calculatedSignature = 'sha1=' + hmac.digest('hex');

      // check if payload is coming from GitHub
      if (req.headers['x-hub-signature'] !== calculatedSignature) {
        res.writeHeader(403, {
          'Content-Type': 'text/plain'
        });
        res.end();
      } else {
        req.body = body;
        var data;

        try {
          data = JSON.parse(body);
        } catch (error) {
          debug('JSON parse error: ', error);
          res.writeHeader(500, {
            'Content-Type': 'text/plain'
          });
          res.write(error);
          res.end();
        }

        // webhook setup procedure
        if (data.hook && data.hook.active === true) {
          res.writeHeader(200, {
            'Content-Type': 'text/plain'
          });
          res.write('Hello GitHub.');
          res.end();
        } else {
          res.writeHeader(204, {
            'Content-Type': 'application/json'
          });
          res.end();

          debug('Processing.');
          handler(data, function(error, result) {
            console.log(error, result);
          });
        }
      }
    });
  } else {
    res.writeHeader(204, {
      'Content-Type': 'text/plain'
    });
    res.end();
  }
});

server.listen(3000);

console.log('GitEvents listening on 3000');
