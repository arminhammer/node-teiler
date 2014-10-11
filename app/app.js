'use strict';

// Declare app level module which depends on views, and components
angular.module('ploppen', [
    'ploppen.list',
    'ploppen.peerdiscovery',
    'ploppen.filetransfer'

])
    .service('Peer', ['Config', function(Config) {

        var os = require('os');
        var dns = require('dns');

        var myPeer = {

            name: os.hostname(),
            address: getIPAddress(),
            port: Config.fileTransferPort(),
            downloadingFiles: {},
            availableFiles: {}

        };

        function getLocalAddr() {

            var ifaces = os.networkInterfaces();
            var iList = [];

            for (var dev in ifaces) {
                //console.log("IFACE: " + ifaces[dev]);
                var alias = 0;
                ifaces[dev].forEach(function (details) {

                    if (details.family == 'IPv4') {

                        //console.log("DEETS: " + dev + (alias ? ':' + alias : ''), details.address);
                        iList.push(details.address);
                        ++alias;

                    }

                })

            }

            //console.log("iList: " + iList);
            return iList;

        }

        this.localAddr = function() {
            return getLocalAddr();
        };

        this.ipAddress = function() {
            return getIPAddress();
        }

        this.broadcastAddr = function() {
            var lAddr = getIPAddress();
            return lAddr.substr(0, lAddr.indexOf('.')) + '.255.255.255';
        };

        this.myPeer = function() {

            return myPeer;

        };

        function getIPAddress() {

            var ifaces = getLocalAddr();
            var count = 0;

            while(count < ifaces.length) {

                //console.log("NEXT IF: " + ifaces[count]);

                if(!(ifaces[count] == "127.0.0.1")) {

                    //console.log("INTERFACE: " + ifaces[count]);
                    return ifaces[count];

                } else {

                    count++;

                }
            }

            //console.log("INTERFACE: " + ifaces[0]);

            return ifaces[0];
        }

    }])

    .service('PeerList', ['$rootScope', 'Peer', function($rootScope, Peer) {

        var ioc = require('socket.io-client');
        var socketStream = require('socket.io-stream');
        var fs = require('fs');

        var peers = {};

        /*
         peers['Peer1'] = {
         name : 'Peer1',
         address: '127.0.0.1',
         port: 9996,
         availableFiles : [
         { filename : "File 1" },
         { filename : "File 2" }
         ]
         };
         */

        this.list = function() {

            return peers;

        };

        this.count = function() {

            var count = 0;

            for (var key in peers) {

                if (peers.hasOwnProperty(key)) {

                    count++;

                }
            }

            return count;

        };

        this.keys = function() {

            var keys = [];

            for (var key in peers) {

                if (peers.hasOwnProperty(key)) {

                    keys.push(key);

                }
            }

            return keys;

        };

        this.print = function() {

            //console.log("Printing peer list:");

            for (var key in peers) {

                if (peers.hasOwnProperty(key)) {

                    //console.log(peers[key].name);
                    //console.log(peers[key].socket);
                }
            }

        };

        this.contains = function(peer) {

            return peers.hasOwnProperty(peer.name);

        };

        this.addPeer = function(peer, callback) {

            var added = false;

            if(!this.contains(peer)) {

                console.log("this.peers[peer.name]: " + peers[peer.name]);
                console.log(peer);
                peers[peer.name] = peer;
                console.log("this.peers[peer.name]: " + peers[peer.name]);

                peers[peer.name].socket = ioc.connect('http://' + peer.address + ':' + peer.port);
                console.log("Connecting to http://" + peer.address + ':' + peer.port);

                peers[peer.name].socket

                    .on('filelist.update', function(data) {

                        peers[data.peername].availableFiles = data.filelist;
                        console.log("Client Received filelistupdate: " + data.peername + " " + data.filelist);
                        $rootScope.$broadcast('peerList.update');

                    })

                    .on('disconnect', function() {

                        console.log(peer.name + " disconnected.");

                    });


                socketStream(peers[peer.name].socket).on('file.download.data', function(stream, data) {

                    console.log("Server Received download data message: " + data.filename);

                    fs.createWriteStream(Peer.myPeer().downloadingFiles[data.filename].downloadLocation).pipe(stream);

                });

                peers[peer.name].files = [];

                added = true;

            }
            else{

                //console.log(peer.name + " is already in the list!");

            }

            this.print();

            callback(added);

        }

    }])
    .service('Config', [function() {

        var multicastAddress = '224.3.3.100';
        var multicastPort = 8886;

        var fileTransferPort = 9996;

        this.multicastAddress = function () {
            return multicastAddress;
        };

        this.multicastPort = function () {
            return multicastPort;
        };

        this.fileTransferPort = function() {
            return fileTransferPort;
        }

    }]);

