//
// tls-server.js
//
// Example of a Transport Layer Security (or TSL) server
//
// References:
//    http://nodejs.org/api/tls.html
//    http://docs.nodejitsu.com/articles/cryptography/how-to-use-the-tls-module
//

// Always use JavaScript strict mode. 
"use strict";

// Modules used here
var tls = require('tls'),
    fs = require('fs'),
    mongoose = require ('mongoose');
//var sensor = require('./sensor.js');
const MongoClient = require('mongodb').MongoClient;
//var medicion=new sensor; 
var TERM = '\uFFFD';

var puerto =8000;
var mongoUrl='mongodb://localhost:27017/BDTesis';

var options = {
    // Chain of certificate autorities
    // Client and server have these to authenticate keys 
    ca: [
          fs.readFileSync('ssl/root-cert.pem'),
          fs.readFileSync('ssl/ca1-cert.pem'),
          fs.readFileSync('ssl/ca2-cert.pem'),
          fs.readFileSync('ssl/ca3-cert.pem'),
          fs.readFileSync('ssl/ca4-cert.pem')
        ],
    // Private key of the server
    key: fs.readFileSync('ssl/agent1-key.pem'),
    // Public key of the server (certificate key)
    cert: fs.readFileSync('ssl/agent1-cert.pem'),

    // Request a certificate from a connecting client
    requestCert: true, 

    // Automatically reject clients with invalide certificates.
    rejectUnauthorized: false             // Set false to see what happens.
};


// The data structure to be sent to connected clients
var message = {
    tag : 'Conexiòn ok' /* + String.fromCharCode(65533) */,
    date : new Date(), 
    seqNo : 0
};
console.log("Entré a tls-server.js");
//console.log(medicion);
// Servidor socket seguro (TLS)
tls.createServer(options, function (s) {
    var intervalId;
    console.log("Cliente TLS autorizado: ", s.authorized);
    if (!s.authorized) {
        console.log("Error en la autorización TLS:", s.authorizationError);
    }

    console.log("Cipher: ",  s.getCipher());
    console.log("Address: ", s.address());
    console.log("Remote address: ", s.remoteAddress);
    console.log("Remote port: ", s.remotePort);
    message.seqNo = 0;
    var fragment = '';
 

    //console.log(s.getPeerCertificate());
    /*    message.date = new Date();
        var ms = JSON.stringify(message) + TERM;
        message.seqNo += 1;
        message.date = new Date();
        ms += JSON.stringify(message) + TERM;
        message.seqNo += 1;
        s.write(ms);
        if ((message.seqNo % 100) === 0)
        {
            //console.log(process.memoryUsage());
        }
    }, 100);*/

    s.on('data', function(data) {
        // Split a los datos entrantes en mensajes en funciòn de TERM
        var info = data.toString().split(TERM);
        // Add any previous trailing chars to the start of the first message
        info[0] = fragment + info[0];
        fragment = '';

        // Parse all the messages into objects

        for ( var index = 0; index < info.length; index++) {
            if (info[index]) {
                try {
                    var message = JSON.parse(info[index]);
                    console.log(message.sensor);
                    console.log(message.fecha);
                    console.log(message.medida);
                    console.log(message.alerta);
                    var medicion= {
                        "sensor" : message.sensor,
                        "dispositivo": message.dispositivo,
                        "fecha" : message.fecha, 
                        "medida ": message.medida,
                        "alerta" : message.alerta,
                        "observaciones" : message.observaciones
                    };
                    MongoClient.connect(mongoUrl,function (err, client) {
                        if (err) console.log("Error al conectarse a la BD:", err);
                        else {
                        var db = client.db('BDTesis');
                        console.log("Conexiòn a la BD exitosa");
                        db.collection('Mediciones').insertOne(medicion); 
                
                
                          client.close();}
                        });                 

                    } catch (error) {
                    // The last message may be cut short so save its chars for later.
                    fragment = info[index];
                    continue;
                }
            }
        }
//        s.socket.end();
    });

    // Handle events on the underlying socket
    s.on("error", function (err) {
        console.log("Error:", err.toString());
    });

    s.on("end", function () {
        console.log("End:");
    });

    s.on("close", function () {

        clearInterval(intervalId);
        console.log("Close:");
    });
}).listen(puerto);





