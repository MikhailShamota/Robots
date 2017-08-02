const R_WORLD = 1000;
const R_GALAXY = 100000;
const C_BACKGROUND = 0x181818;
const V_CAMERA = 10;//camera speed to zoom
const R_CAMERA_MIN = 2000;//base camera pos Y
const R_CAMERA_FADE_DIST = 500;//slowing going dist

const K_GRAVITY = 2;
const K_SPACE_RESIST = 10;
const VELOCITY_LIMIT_PER_SEC = 100;
const K_CENTER_FORCE = 20;//force pulling to ecliptic plane

const SEC_EXCH_PERIOD = 0.1;//peer-to-peer message send period

const SEC_TO_PEER_PT = 3;//seconds to reach peer point. More to smooth, less to precision

//constants
const MSEC_IN_SEC = 1000;

const V3_ZERO = new THREE.Vector3(0, 0, 0);
const V3_UNIT_X = new THREE.Vector3(1, 0, 0);
const V3_UNIT_Y = new THREE.Vector3(0, 1, 0);
const V3_UNIT_Z = new THREE.Vector3(0, 0, 1);

var V2_RESOLUTION;

var clock = new THREE.Clock();
var nowTime = Date.now();

var CouchDB = ( function() {

    const dbUrl = 'https://couchdb.cloudno.de/aspacegame';
    const dbUrlActiveGames = function ( datenow ) { return 'https://couchdb.cloudno.de/aspacegame/_design/games/_view/active?group=true&startkey=[' + datenow + ']' };

    //couchdb view
    /*
     {
     "_id": "_design/games",
     "_rev": "27-f94dec91321ef930fb14ce33baee5af0",
     "views": {
     "active": {
     "map": "function(doc) {\n\tif ( doc.GameId ) \n\t\temit( [doc.Finish,doc.GameId], 1) \n}",
     "reduce": "_count"
     }
     },
     "language": "javascript"
     }
     */

    function send( data, url ) {

        $.ajax({

            type: "POST",
            url: url,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            data: JSON.stringify( data ),
            success: function () {

                console.log('saved in couchdb')
            },
            error: function () {

                console.log('failed to save in couchdb');
            },
            dataType: 'json'
        });
    }

    function get( url, funcOk, funcFail ) {

        $.ajax({

            type: "GET",
            url: url,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            success: function ( data ) {

                funcOk && funcOk( data );
                console.log( 'get from couchdb ' + url );
            },
            error: function () {

                funcFail && funcFail();
                console.log( 'failed to get from couchdb ' + url );
            },
            dataType: 'json'
        });
    }

    return {

        enterGame: function( myPeerId, game ) {

            var t = new Date().getTime();
            var duration = 60;

            send({

                MyPeerId: myPeerId,
                GameId: game ? game.id : myPeerId,
                Start: t,
                Duration: game ? 0 : duration,
                Finish: game ? game.time : t + duration * MSEC_IN_SEC
            }, dbUrl );
        },

        /*joinGame: function( myPeerId, game ) {

            send({

                MyPeerId: myPeerId,
                GameId: game.id,
                Finish: game.time
            }, dbUrl );
        },*/

        getActiveGames: function( funcOk, funcFail ) {

            return get( dbUrlActiveGames( Date.now() ), funcOk, funcFail );
        }
    }
} () );

var PeerServer = ( function() {

    const myKey = 'qxh7qp1coby8ehfr';
    var peer;
    var conn;

    var myPeerId;

    var callbackOpen;
    var callbackReceive;
    var callbackConnect;

    function initConn( dataConn ) {

        conn = dataConn;

        //console.log('got connect from: '+dataConn.peer);
        conn.on('open', function() {

            console.log('conn opened');
            conn.send('hi!');
            callbackConnect && callbackConnect();
        });

        // Receive messages
        conn.on('data', function(data) {

            callbackReceive && callbackReceive( conn.peer, data );
            !callbackReceive && console.log('Received from ' + conn.peer, data);
        });
    }

    function peerOpen() {

        peer = new Peer({key: myKey});
        peer.on('open', function(id) {

            myPeerId = id;
            console.log('My peer ID is: ' + id);
            callbackOpen && callbackOpen(id);
        });

        //Receive connection
        peer.on('connection', function(dataConn) {

            initConn(dataConn);
        });
    }

    function peerConnect( peerid ) {

        initConn( peer.connect( peerid ) );
    }

    function peerSend( data ) {

        //add some tech data if needed
        conn && conn.send( data );
    }

    return {

        //open connection to PeerJs server
        open : function() {

            peerOpen();
        },

        //connect to peerid
        connect : function( peerid ) {

            peerConnect( peerid );
        },

        //send data to everyone connected
        send : function( data ) {

            peerSend( data );
        },

        //getPeerId
        getMyPeerId : function() {

            return myPeerId;
        },

        setCallbackOpen( func ) {

            callbackOpen = func;
        },

        setCallbackConnect( func ) {

            callbackConnect = func;
        },

        setCallbackReceive( func ) {

            callbackReceive = func;
        }
    }
} () );

var MathHelper = {

    // Get a value between two values
    clamp: function (value, min, max) {

        if (value < min) {
            return min;
        }
        else if (value > max) {
            return max;
        }

        return value;
    },
    //Get the linear interpolation between two value
    lerp: function (value1, value2, amount) {
        amount = amount < 0 ? 0 : amount;
        amount = amount > 1 ? 1 : amount;
        return value1 + (value2 - value1) * amount;
    },

    //smooth step function between min and max by value
    smoothstep: function (min, max, value) {

        var x = Math.max(0, Math.min(1, (value-min)/(max-min)));
        return x*x*(3 - 2*x);
    },

    grid: function( x, size ) {

        return Math.round( x / size ) * size;
    },

    //makes new random vector with length
    v3Random: function (length) {

        return new THREE.Vector3( 1, 0, 0 ).clone().applyEuler(
            new THREE.Euler(
                Math.random() * 2 * Math.PI,
                Math.random() * 2 * Math.PI,
                Math.random() * 2 * Math.PI,
                'XYZ')
        ).multiplyScalar(length);
    },

    //random between min and max
    rand: function (min, max) {

        return Math.random() * (max - min) + min;
    },

    getUrlVars: function() {

        var vars = {};
        var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi,
            function( m, key, value ) {

                vars[key] = value;
            });
        return vars;
    }
};

var Textures = {

    loader: new THREE.TextureLoader(),
    collection: {},
    add: function(file, func) {

        var tex = this.collection[ file ];

        if ( tex )
            return func && func( tex ) || !func && tex;

        var self = this;

        this.loader.load(
            file,
            function (texture) {

                self.collection[ file ] = texture;
                return func && func( texture ) || !func && tex;
            },
            function (xhr) {

                //console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
                console.log( 'load "' + file + '" OK' );
            },
            function (xhr) {

                console.log( 'load "' + file + '" failed' );
            }
        );
    }
};