const R_GALAXY = 4000;
const R_START_DROP = 2500;
//const C_BACKGROUND = 0x181818;//( 0x020E1F );2A2C2B
const C_BACKGROUND = 0x282828;//( 0x020E1F );2A2C2B
const FOG_FAR = 10000;//set 0 to off
const FOG_NEAR = 800;

const CAMERA_V = 2;//camera speed
const CAMERA_V_LIMIT = 1000;//camera speed limit
const CAMERA_DIST_MIN = 900;//closest camera pos
const CAMERA_DIST_MAX = 1600;//farthest camera pos
const CAMERA_Y = 1;//farthest camera pos Y
const CAMERA_Z = 1.6;
const CAMERA_START_Y = R_GALAXY * 3;//start camera pos Y
const CAMERA_LOOK_AT_FWD = 300;//смотреть перед кораблем

const K_GRAVITY = 0.05;
const K_SPACE_RESIST = 3;
const VELOCITY_LIMIT_PER_SEC = 1000;
const K_CENTER_FORCE = 20;//force pulling to ecliptic plane

const Q_TRAIL_LEN = 100;//mesh line trail segments

const MULTIPLAYER_OPEN_SEC = 120;//multiplayer game open period for join players
const MULTIPLAYER_PLAYERS_MAX = 10;//max players in multiplayer
const SEC_EXCH_PERIOD = 0.1;//peer-to-peer message send period
const MSEC_RESPAWN_DELAY = 2000;//respawn delay

const SEC_TO_PEER_PT = 3;//seconds to reach peer point. More to smooth, less to precision

const SCAN_DIST_MIN = R_GALAXY * 0.5;
const SCAN_DIST_MAX = R_GALAXY * 2;
const SCAN_SEC_MIN = 0.5;
const SCAN_SEC_MAX = 1.5;

const BOT_FIND_TARGET_PERIOD_MSEC = 1000;

const CANON_VULCAN_LIVES = 1200;
const CANON_LASER_LIVES = 40;
const CANON_VULCAN_HEAT_MSEC = 0;//add duration reload per shot

const CANON_VULCAN_DELAY_MSEC = 120;//default duration reload
const CANON_LASER_DELAY_MSEC = 20;//default duration reload
const CANON_VULCAN_RELOAD_MSEC = 600;
const CANON_LASER_RELOAD_MSEC = 1200;
const CANON_VULCAN_AMMO = 20;
const CANON_LASER_AMMO = 10;

//const SHOT_COOL_MSEC_PER_SEC = 60;//cooling canon heat msec per sec
const SHOT_COLOR = "rgb( 241, 255, 133 )";

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
            var duration = MULTIPLAYER_OPEN_SEC;

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
    var conn = [];
    //var conn;

    var myPeerId;

    var callbackOpen;
    var callbackReceive;
    var callbackConnect;
    var callbackError;

    function initConn( dataConn ) {

        //conn = dataConn;
        conn.push( dataConn );

        //console.log('got connect from: '+dataConn.peer);
        conn[ conn.length - 1 ].on('open', function() {

            console.log('conn opened');
            conn[ conn.length - 1 ].send('hi!');
            callbackConnect && callbackConnect();
        });

        // Receive messages
        conn[ conn.length - 1 ].on('data', function( data ) {

            callbackReceive && callbackReceive( conn[ conn.length - 1 ].peer, data );
            !callbackReceive && console.log('Received from ' + conn[ conn.length - 1 ].peer, data);
        });
    }

    function peerOpen() {

        peer = new Peer({key: myKey});
        peer.on('open', function(id) {

            myPeerId = id;
            console.log('My peer ID is: ' + id);
            callbackOpen && callbackOpen(id);
        });

        peer.on( 'error', function( err ) {

            callbackError && callbackError( err );
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
        for ( var i = 0; i < conn.length; i++ )
            conn[ i ] && conn[ i ].send( data );
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
        },

        setCallbackError( func ) {

            callbackError = func;
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
        ).multiplyScalar( length );
    },

    //random between min and max
    rand: function (min, max) {

        return Math.random() * (max - min) + min;
    },

    spectre: function ( x, min, max ) {

        return this.clamp( ( x - min ) / ( max - min ), 0, 1 );
    },

    memcopy: function (src, srcOffset, dst, dstOffset, length) {
        var i;

        src = src.subarray || src.slice ? src : src.buffer;
        dst = dst.subarray || dst.slice ? dst : dst.buffer;

        src = srcOffset ? src.subarray ?
            src.subarray(srcOffset, length && srcOffset + length) :
            src.slice(srcOffset, length && srcOffset + length) : src;

        if (dst.set) {
            dst.set(src, dstOffset)
        } else {
            for (i=0; i<src.length; i++) {
                dst[i + dstOffset] = src[i]
            }
        }

        return dst;
    },

    getUrlVars: function() {

        var vars = {};
        var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi,
            function( m, key, value ) {

                vars[key] = value;
            });
        return vars;
    },

    arrayLast: function( arr ) {

        return arr[ arr.length - 1 ];
    }

};

var Textures = {

    loader: new THREE.TextureLoader(),
    collection: {},
    get: function( file ) {

        return this.collection[ file ];
    },
    add: function( files ) {

        var qty = files.length;


        for ( var i = 0; i < qty; i++ ) {

            this.collection[ files[ i ] ] = new THREE.TextureLoader().load( files[ i ] );
            /*this.loader.load(

                files[ i ],
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
            */

        }

    }
};